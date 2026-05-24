<?php
/**
 * MODX Evolution 1.2 plugin — dispatch GitHub Actions "Sync MODX to Firestore" on save.
 *
 * Install:
 * 1. Elements → Plugins → New → paste this code.
 * 2. System Events: check **OnDocFormSave** only.
 * 3. Manager → Configuration — add:
 *    - magazin_github_token   (required) PAT with repo access to vhollo/magazin
 *      Fine-grained: Repository access + Actions Read and write.
 *      Classic: repo scope (or workflow scope).
 *    - magazin_github_repo    (optional — omit or leave unset for vhollo/magazin; do NOT save empty)
 *    - magazin_github_workflow (optional, default .github/workflows/sync-modx-to-firestore.yml)
 *    - magazin_github_ref     (optional — omit or leave unset for main; do NOT save empty)
 *    - magazin_github_debounce (optional, default 120 seconds, min 30)
 *
 * Triggers on any save of a magazine document (publish, unpublish, delete, hidemenu).
 * Keep magazine-scope rules in sync with scripts/lib/magazine-scope.mjs.
 *
 * Do NOT call $e->stopPropagation() — other plugins must still run.
 */
if (!defined('MODX_BASE_PATH')) {
    die('What are you doing? Get out of here!');
}

if (!defined('MAGAZIN_GITHUB_REPO_DEFAULT')) {
    define('MAGAZIN_GITHUB_REPO_DEFAULT', 'vhollo/magazin');
    define('MAGAZIN_GITHUB_WORKFLOW_DEFAULT', '.github/workflows/sync-modx-to-firestore.yml');
    define('MAGAZIN_GITHUB_REF_DEFAULT', 'main');
}

if (!function_exists('magazin_evoConfig')) {
    /**
     * Read MODX system setting; blank/whitespace values fall through to $default.
     *
     * @param DocumentParser $modx
     * @param string $key
     * @param string $default
     * @return string
     */
    function magazin_evoConfig($modx, $key, $default = '')
    {
        $candidates = array();
        if (isset($modx->config[$key])) {
            $candidates[] = $modx->config[$key];
        }
        if (method_exists($modx, 'getConfig')) {
            $candidates[] = $modx->getConfig($key);
        }
        foreach ($candidates as $raw) {
            if ($raw === null) {
                continue;
            }
            $trimmed = trim((string) $raw);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }
        return $default;
    }
}

if (!function_exists('magazin_evoGetDocumentRow')) {
    /**
     * Load document row after save. Uses db->select only — do NOT call getDocument()
     * with a field list; Evolution 1.2+ changed that API and breaks SQL (empty SELECT).
     *
     * @param DocumentParser $modx
     * @param int $id
     * @return array|null
     */
    function magazin_evoGetDocumentRow($modx, $id)
    {
        $id = (int) $id;
        if ($id <= 0) {
            return null;
        }

        $table = $modx->getFullTableName('site_content');
        $fields = 'id, parent, template, published, deleted, hidemenu, type';
        $where = 'id = ' . $id;
        $rs = $modx->db->select($fields, $table, $where, '', 1);
        if (!$rs) {
            return null;
        }
        $row = $modx->db->getRow($rs);
        return is_array($row) ? $row : null;
    }
}

if (!function_exists('magazin_evoIsMagazineCandidate')) {
    /**
     * MODX rows in the magazine sync universe (articles, hirek, id 2797).
     * Keep in sync with scripts/lib/magazine-scope.mjs.
     *
     * @param array $doc
     * @return bool
     */
    function magazin_evoIsMagazineCandidate(array $doc)
    {
        if (isset($doc['type']) && $doc['type'] !== 'document') {
            return false;
        }
        $id = (int) $doc['id'];
        $parent = (int) $doc['parent'];
        $template = (int) $doc['template'];
        if ($id === 2797) {
            return true;
        }
        if ($parent === 1) {
            return true;
        }
        if ($parent !== 1 && in_array($template, array(9, 13), true)) {
            return true;
        }
        return false;
    }
}

if (!function_exists('magazin_evoShouldTriggerFirestoreSync')) {
    /**
     * Dispatch sync on any magazine-relevant save — publish, unpublish, delete, hidemenu, etc.
     *
     * @param array $doc
     * @return bool
     */
    function magazin_evoShouldTriggerFirestoreSync(array $doc)
    {
        return magazin_evoIsMagazineCandidate($doc);
    }
}

if (!function_exists('magazin_evoIsDebounced')) {
    function magazin_evoIsDebounced($modx, $debounceSeconds)
    {
        $file = MODX_BASE_PATH . 'assets/cache/magazin_firestore_sync_dispatch.txt';
        if (!is_readable($file)) {
            return false;
        }
        $ts = (int) trim((string) file_get_contents($file));
        return $ts > 0 && (time() - $ts) < $debounceSeconds;
    }
}

if (!function_exists('magazin_evoMarkDispatched')) {
    function magazin_evoMarkDispatched($modx)
    {
        $dir = MODX_BASE_PATH . 'assets/cache';
        if (!is_dir($dir)) {
            return;
        }
        @file_put_contents($dir . '/magazin_firestore_sync_dispatch.txt', (string) time());
    }
}

if (!function_exists('magazin_evoLog')) {
    function magazin_evoLog($modx, $message, $priority = 1)
    {
        if (method_exists($modx, 'logEvent')) {
            $modx->logEvent(0, $priority, $message, 'FirestoreSync');
        }
    }
}

if (!function_exists('magazin_evoWorkflowCandidates')) {
    /**
     * GitHub accepts workflow file name or repo path; try both when ambiguous.
     *
     * @param string $workflow
     * @return string[]
     */
    function magazin_evoWorkflowCandidates($workflow)
    {
        $workflow = trim($workflow);
        if ($workflow === '') {
            $workflow = '.github/workflows/sync-modx-to-firestore.yml';
        }
        $candidates = array($workflow);
        $basename = basename($workflow);
        $fullPath = '.github/workflows/' . $basename;
        if ($workflow !== $fullPath) {
            $candidates[] = $fullPath;
        }
        if ($basename !== $workflow) {
            $candidates[] = $basename;
        }
        return array_values(array_unique($candidates));
    }
}

if (!function_exists('magazin_evoGithubWorkflowDispatch')) {
    /**
     * @return array{http:int, body:string, workflow:string, curl_error:string}
     */
    function magazin_evoGithubWorkflowDispatch($repo, $workflow, $ref, $token, $payload)
    {
        $url = 'https://api.github.com/repos/' . $repo
            . '/actions/workflows/' . rawurlencode($workflow) . '/dispatches';

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'Content-Type: application/json',
            'User-Agent: diabetes-hu-modx-firestore-sync',
            'X-GitHub-Api-Version: 2022-11-28',
        ));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);

        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return array(
            'http' => $httpCode,
            'body' => (string) $body,
            'workflow' => $workflow,
            'curl_error' => $curlError,
        );
    }
}

if (!function_exists('magazin_evoDispatchFirestoreSyncWorkflow')) {
    /**
     * @param DocumentParser $modx
     * @param int $modxDocId MODX site_content id from OnDocFormSave (passed to workflow)
     */
    function magazin_evoDispatchFirestoreSyncWorkflow($modx, $modxDocId = 0)
    {
        $token = magazin_evoConfig($modx, 'magazin_github_token');
        if ($token === '') {
            magazin_evoLog($modx, '[FirestoreSync] magazin_github_token is empty — skip dispatch', 2);
            return false;
        }

        $repo = magazin_evoConfig($modx, 'magazin_github_repo', MAGAZIN_GITHUB_REPO_DEFAULT);
        $workflow = magazin_evoConfig(
            $modx,
            'magazin_github_workflow',
            MAGAZIN_GITHUB_WORKFLOW_DEFAULT
        );
        $ref = magazin_evoConfig($modx, 'magazin_github_ref', MAGAZIN_GITHUB_REF_DEFAULT);
        if ($repo === '') {
            $repo = MAGAZIN_GITHUB_REPO_DEFAULT;
        }
        if ($ref === '') {
            $ref = MAGAZIN_GITHUB_REF_DEFAULT;
        }
        if ($workflow === '') {
            $workflow = MAGAZIN_GITHUB_WORKFLOW_DEFAULT;
        }
        $debounce = (int) magazin_evoConfig($modx, 'magazin_github_debounce', '120');
        if ($debounce < 30) {
            $debounce = 30;
        }

        if (magazin_evoIsDebounced($modx, $debounce)) {
            magazin_evoLog($modx, '[FirestoreSync] debounced — workflow already dispatched recently', 1);
            return true;
        }

        if (!function_exists('curl_init')) {
            magazin_evoLog($modx, '[FirestoreSync] curl extension not available', 3);
            return false;
        }

        $payload = json_encode(array(
            'ref' => $ref,
            'inputs' => array(
                'full_backfill' => 'false',
                'modx_doc_id' => $modxDocId > 0 ? (string) $modxDocId : '',
            ),
        ));

        $last = null;
        foreach (magazin_evoWorkflowCandidates($workflow) as $candidate) {
            $last = magazin_evoGithubWorkflowDispatch($repo, $candidate, $ref, $token, $payload);
            if ($last['http'] === 204) {
                magazin_evoMarkDispatched($modx);
                magazin_evoLog(
                    $modx,
                    '[FirestoreSync] GitHub workflow dispatched (HTTP 204) workflow='
                    . $candidate . ' ref=' . $ref
                    . ($modxDocId > 0 ? ' modx_doc_id=' . $modxDocId : ''),
                    1
                );
                return true;
            }
            if ($last['http'] !== 404) {
                break;
            }
        }

        $hint = '';
        if ($last && $last['http'] === 404) {
            $hint = ' HTTP 404 on a private repo usually means the PAT cannot access '
                . $repo . ' (check repository access + Actions Read and write), '
                . 'or magazin_github_repo / magazin_github_workflow / magazin_github_ref is wrong.';
        }

        magazin_evoLog(
            $modx,
            '[FirestoreSync] dispatch failed HTTP ' . ($last ? $last['http'] : 0)
            . ' repo=' . $repo
            . ' ref=' . $ref
            . ' tried=' . implode(', ', magazin_evoWorkflowCandidates($workflow))
            . ($last && $last['curl_error'] ? ' curl: ' . $last['curl_error'] : '')
            . ' body: ' . substr($last ? $last['body'] : '', 0, 500)
            . $hint,
            3
        );
        return false;
    }
}

// ── Plugin entry ─────────────────────────────────────────────────────────────
// OnDocFormSave: $id and $mode are injected by Evolution from invokeEvent().

$e = isset($modx->Event) ? $modx->Event : (isset($modx->event) ? $modx->event : null);
if (!$e || !isset($e->name)) {
    return;
}

switch ($e->name) {
    case 'OnDocFormSave':
        $docId = isset($id) ? (int) $id : 0;
        if ($docId <= 0 && isset($e->params['id'])) {
            $docId = (int) $e->params['id'];
        }
        if ($docId <= 0) {
            return;
        }

        $doc = magazin_evoGetDocumentRow($modx, $docId);
        if (!$doc || !magazin_evoShouldTriggerFirestoreSync($doc)) {
            return;
        }

        magazin_evoDispatchFirestoreSyncWorkflow($modx, $docId);
        break;

    default:
        return;
}
