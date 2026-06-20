<?php
/**
 * MODX Evolution 1.2 plugin — dispatch GitHub Actions "Sync MODX to Firestore"
 * on article save, via repository_dispatch (MySQL-free payload path).
 *
 * Install:
 * 1. Elements → Plugins → New → paste this code.
 * 2. System Events: check **OnDocFormSave** only.
 * 3. Manager → Configuration — add:
 *    - magazin_github_token   (required) PAT with Contents: write + Actions: read/write.
 *      Fine-grained: Repository access (Contents: write, Actions: read/write).
 *      Classic: repo scope.
 *    - magazin_github_repo    (optional — omit or leave unset for vhollo/magazin; do NOT save empty)
 *
 * How it works:
 *   On each magazine document save the plugin dispatches a single repository_dispatch
 *   event (modx-doc-save) carrying only the saved doc (+ ancestors + filtered TVs +
 *   matched author chunks) as a gzip+base64 payload.
 *
 *   Each dispatch triggers its own GitHub Actions run. Runs are serialised by the
 *   concurrency group (cancel-in-progress: false) so rapid saves queue up and each
 *   one is processed in order. No debounce, no queue file, no cumulation.
 *
 * Do NOT call $e->stopPropagation() — other plugins must still run.
 */
if (!defined('MODX_BASE_PATH')) {
    die('What are you doing? Get out of here!');
}

if (!defined('MAGAZIN_GITHUB_REPO_DEFAULT')) {
    define('MAGAZIN_GITHUB_REPO_DEFAULT', 'vhollo/magazin');
    define('MAGAZIN_TV_IDS', '3,4,18,23,25,28,29,30,31');
    define('MAGAZIN_AUTHOR_CHUNK_CATEGORY', 24);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

if (!function_exists('magazin_evoConfig')) {
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

if (!function_exists('magazin_evoLog')) {
    function magazin_evoLog($modx, $message, $priority = 1)
    {
        if (method_exists($modx, 'logEvent')) {
            $modx->logEvent(0, $priority, $message, 'FirestoreSync');
        }
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

if (!function_exists('magazin_evoGetDocumentRow')) {
    /**
     * Load a site_content row. Uses db->select only — do NOT call getDocument()
     * with a field list; Evolution 1.2+ changed that API and breaks SQL.
     *
     * @param DocumentParser $modx
     * @param int            $id
     * @param string         $fields  Comma-separated column list
     * @return array|null
     */
    function magazin_evoGetDocumentRow($modx, $id, $fields = '*')
    {
        $id = (int) $id;
        if ($id <= 0) {
            return null;
        }
        $table = $modx->getFullTableName('site_content');
        $rs = $modx->db->select($fields, $table, 'id = ' . $id, '', 1);
        if (!$rs) {
            return null;
        }
        $row = $modx->db->getRow($rs);
        return is_array($row) ? $row : null;
    }
}

if (!function_exists('magazin_evoGetAncestors')) {
    /**
     * Walk the parent chain and return all ancestor site_content rows.
     * Returns an array keyed by id containing the saved doc + all ancestors.
     *
     * @param DocumentParser $modx
     * @param array          $seedRow  The saved document row (already loaded)
     * @return array  Keyed by id
     */
    function magazin_evoGetAncestors($modx, array $seedRow)
    {
        $byId = array();
        $byId[(int) $seedRow['id']] = $seedRow;
        $queue = array((int) $seedRow['parent']);
        $seen  = array((int) $seedRow['id'] => true);

        while (!empty($queue)) {
            $parentId = array_shift($queue);
            if ($parentId <= 0 || isset($seen[$parentId])) {
                continue;
            }
            $seen[$parentId] = true;
            $row = magazin_evoGetDocumentRow($modx, $parentId);
            if (!is_array($row)) {
                continue;
            }
            $byId[$parentId] = $row;
            $nextParent = (int) $row['parent'];
            if ($nextParent > 0 && !isset($seen[$nextParent])) {
                $queue[] = $nextParent;
            }
        }

        return $byId;
    }
}

if (!function_exists('magazin_evoGetTVs')) {
    /**
     * Load filtered TV rows for the given content ids.
     * Only fetches tmplvarid IN (3,4,18,23,25,28,29,30,31).
     *
     * @param DocumentParser $modx
     * @param int[]          $contentIds
     * @return array[]  Each row: { tmplvarid, contentid, value }
     */
    function magazin_evoGetTVs($modx, array $contentIds)
    {
        if (empty($contentIds)) {
            return array();
        }
        $table  = $modx->getFullTableName('site_tmplvar_contentvalues');
        $idList = implode(',', array_map('intval', $contentIds));
        $where  = 'contentid IN (' . $idList . ') AND tmplvarid IN (' . MAGAZIN_TV_IDS . ')';
        $rs = $modx->db->select('tmplvarid, contentid, value', $table, $where);
        if (!$rs) {
            return array();
        }
        $rows = array();
        while ($row = $modx->db->getRow($rs)) {
            $rows[] = array(
                'tmplvarid' => (int) $row['tmplvarid'],
                'contentid' => (int) $row['contentid'],
                'value'     => (string) $row['value'],
            );
        }
        return $rows;
    }
}

if (!function_exists('magazin_evoGetAuthorChunks')) {
    /**
     * Load author chunks (category 24) whose name appears in the saved doc's
     * TV 18 (szerzo/authors) value.
     *
     * @param DocumentParser $modx
     * @param string         $authorTvValue  Space-separated author token string
     * @return array[]  Each row: { name, snippet }
     */
    function magazin_evoGetAuthorChunks($modx, $authorTvValue)
    {
        $tokens = array_filter(array_map('trim', explode(' ', (string) $authorTvValue)));
        if (empty($tokens)) {
            return array();
        }
        $table   = $modx->getFullTableName('site_htmlsnippets');
        $escaped = array();
        foreach ($tokens as $t) {
            $escaped[] = "'" . $modx->db->escape($t) . "'";
        }
        $where = 'category = ' . MAGAZIN_AUTHOR_CHUNK_CATEGORY
            . ' AND name IN (' . implode(',', $escaped) . ')';
        $rs = $modx->db->select('name, snippet', $table, $where);
        if (!$rs) {
            return array();
        }
        $chunks = array();
        while ($row = $modx->db->getRow($rs)) {
            $chunks[] = array(
                'name'    => (string) $row['name'],
                'snippet' => (string) $row['snippet'],
            );
        }
        return $chunks;
    }
}

if (!function_exists('magazin_evoNormaliseRow')) {
    /**
     * Cast a site_content row to the scalar types the Node transform expects.
     *
     * @param array $row
     * @return array
     */
    function magazin_evoNormaliseRow(array $row)
    {
        static $intFields = array(
            'id', 'parent', 'template', 'published', 'deleted',
            'hidemenu', 'isfolder', 'publishedon', 'editedon',
        );
        static $strFields = array(
            'type', 'alias', 'pagetitle', 'longtitle',
            'description', 'introtext', 'content',
        );
        $out = array();
        foreach ($row as $k => $v) {
            if (in_array($k, $intFields, true)) {
                $out[$k] = (int) $v;
            } elseif (in_array($k, $strFields, true)) {
                $out[$k] = (string) $v;
            } else {
                $out[$k] = $v;
            }
        }
        return $out;
    }
}

if (!function_exists('magazin_evoGithubRepositoryDispatch')) {
    /**
     * POST a repository_dispatch event to GitHub.
     *
     * @param string $repo
     * @param string $token
     * @param string $eventType
     * @param array  $clientPayload
     * @return array{http:int, body:string, curl_error:string}
     */
    function magazin_evoGithubRepositoryDispatch($repo, $token, $eventType, array $clientPayload)
    {
        $url  = 'https://api.github.com/repos/' . $repo . '/dispatches';
        $body = json_encode(array(
            'event_type'     => $eventType,
            'client_payload' => $clientPayload,
        ));

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'Content-Type: application/json',
            'User-Agent: diabetes-hu-modx-firestore-sync',
            'X-GitHub-Api-Version: 2022-11-28',
        ));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);

        $respBody  = curl_exec($ch);
        $httpCode  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return array(
            'http'       => $httpCode,
            'body'       => (string) $respBody,
            'curl_error' => $curlError,
        );
    }
}

if (!function_exists('magazin_evoDispatchSavePayload')) {
    /**
     * Build the gzip+base64 payload for a single saved doc and dispatch via
     * repository_dispatch (modx-doc-save).
     *
     * @param DocumentParser $modx
     * @param int            $docId  The saved doc id
     * @return bool
     */
    function magazin_evoDispatchSavePayload($modx, $docId)
    {
        $token = magazin_evoConfig($modx, 'magazin_github_token');
        if ($token === '') {
            magazin_evoLog($modx, '[FirestoreSync] magazin_github_token is empty — skip dispatch', 2);
            return false;
        }

        if (!function_exists('curl_init') || !function_exists('gzencode')) {
            magazin_evoLog($modx, '[FirestoreSync] curl or zlib extension not available', 3);
            return false;
        }

        $repo = magazin_evoConfig($modx, 'magazin_github_repo', MAGAZIN_GITHUB_REPO_DEFAULT);
        if ($repo === '') {
            $repo = MAGAZIN_GITHUB_REPO_DEFAULT;
        }

        // ── 1. Load the saved doc row + ancestors ─────────────────────────────
        $savedRow = magazin_evoGetDocumentRow($modx, $docId);
        if (!is_array($savedRow)) {
            magazin_evoLog($modx, '[FirestoreSync] could not load row for id=' . $docId, 2);
            return false;
        }
        $savedRow = magazin_evoNormaliseRow($savedRow);

        $allRowsById = magazin_evoGetAncestors($modx, $savedRow);
        $rows = array();
        foreach ($allRowsById as $row) {
            $rows[] = magazin_evoNormaliseRow($row);
        }

        // ── 2. Load filtered TVs ──────────────────────────────────────────────
        $contentIds = array_keys($allRowsById);
        $tvs = magazin_evoGetTVs($modx, $contentIds);

        // ── 3. Load matched author chunks ─────────────────────────────────────
        $authorTvValue = '';
        foreach ($tvs as $tv) {
            if ((int) $tv['contentid'] === $docId && (int) $tv['tmplvarid'] === 18) {
                $authorTvValue = $tv['value'];
                break;
            }
        }
        $szerzok = magazin_evoGetAuthorChunks($modx, $authorTvValue);

        // ── 4. Build gzip+base64 payload ──────────────────────────────────────
        $json = json_encode(array(
            'rows'    => $rows,
            'tvs'     => $tvs,
            'szerzok' => $szerzok,
        ));
        if ($json === false) {
            magazin_evoLog($modx, '[FirestoreSync] json_encode failed for id=' . $docId, 3);
            return false;
        }
        $gz = gzencode($json, 6);
        if ($gz === false) {
            magazin_evoLog($modx, '[FirestoreSync] gzencode failed for id=' . $docId, 3);
            return false;
        }
        $payloadData = base64_encode($gz);

        // ── 5. Dispatch repository_dispatch ───────────────────────────────────
        $result = magazin_evoGithubRepositoryDispatch(
            $repo,
            $token,
            'modx-doc-save',
            array('data' => $payloadData)
        );

        if ($result['http'] === 204) {
            magazin_evoLog(
                $modx,
                '[FirestoreSync] repository_dispatch modx-doc-save dispatched (HTTP 204)'
                . ' repo=' . $repo . ' id=' . $docId,
                1
            );
            return true;
        }

        $hint = '';
        if ($result['http'] === 401) {
            $hint = ' HTTP 401 — magazin_github_token is invalid or expired; re-issue the PAT.';
        } elseif ($result['http'] === 403) {
            $hint = ' HTTP 403 — token authenticated but lacks permission. Fine-grained PAT:'
                . ' grant this repo + Contents:Read and write. Classic PAT: repo scope.'
                . ' Token owner must have push access.';
        } elseif ($result['http'] === 404) {
            $hint = ' HTTP 404 — check repo name + PAT Contents:write permission.';
        } elseif ($result['http'] === 422) {
            $hint = ' HTTP 422 — event_type or client_payload may be invalid.';
        }

        magazin_evoLog(
            $modx,
            '[FirestoreSync] dispatch failed HTTP ' . $result['http']
            . ' repo=' . $repo
            . ($result['curl_error'] ? ' curl: ' . $result['curl_error'] : '')
            . ' body: ' . substr($result['body'], 0, 500)
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

        // Quick scope check with a lightweight row (avoids loading full content twice)
        $scopeRow = magazin_evoGetDocumentRow(
            $modx,
            $docId,
            'id, parent, template, published, deleted, hidemenu, type'
        );
        if (!$scopeRow || !magazin_evoIsMagazineCandidate($scopeRow)) {
            return;
        }

        magazin_evoDispatchSavePayload($modx, $docId);
        break;

    default:
        return;
}
