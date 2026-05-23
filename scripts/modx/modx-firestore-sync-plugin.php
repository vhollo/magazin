<?php
/**
 * MODX Evolution 1.2 plugin — dispatch GitHub Actions "Sync MODX to Firestore" on save.
 *
 * diabetes.hu runs Evolution 1.2 (not Revolution). OnDocFormSave receives $id and $mode only.
 *
 * Install:
 * 1. Elements → Plugins → New → paste this code.
 * 2. System Events: check **OnDocFormSave** only.
 * 3. Configuration (Manager → Configuration → add custom variables), or Plugin Configuration:
 *    - magazin_github_token   — GitHub PAT with actions:write on vhollo/magazin
 *    - magazin_github_repo    — default: vhollo/magazin
 *    - magazin_github_workflow — default: sync-modx-to-firestore.yml
 *    - magazin_github_ref     — default: main
 *    - magazin_github_debounce — seconds between dispatches (default 120, min 30)
 *
 * Do NOT call $e->stopPropagation() — other plugins must still run.
 */
if (!defined('MODX_BASE_PATH')) {
    die('What are you doing? Get out of here!');
}

/**
 * @param DocumentParser $modx
 * @param string $key
 * @param string $default
 * @return string
 */
function magazin_evoConfig($modx, $key, $default = '')
{
    if (isset($modx->config[$key]) && $modx->config[$key] !== '') {
        return trim((string) $modx->config[$key]);
    }
    $fromGet = $modx->getConfig($key);
    if ($fromGet !== null && $fromGet !== '') {
        return trim((string) $fromGet);
    }
    return $default;
}

/**
 * Load document row after save (Evolution does not pass a resource object here).
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

    // getDocument($id, $active=0) — include unpublished rows we just saved
    if (method_exists($modx, 'getDocument')) {
        $doc = $modx->getDocument($id, 0, 'id,parent,template,published,deleted,hidemenu,type');
        if (is_array($doc) && !empty($doc['id'])) {
            return $doc;
        }
    }

    $table = $modx->getFullTableName('site_content');
    $rs = $modx->db->query(
        'SELECT id, parent, template, published, deleted, hidemenu, type'
        . ' FROM ' . $table
        . ' WHERE id = ' . $id
        . ' LIMIT 1'
    );
    if (!$rs) {
        return null;
    }
    $row = $modx->db->getRow($rs);
    return is_array($row) ? $row : null;
}

/**
 * Same inclusion rules as scripts/sync-modx-to-firestore.mjs (approximate).
 *
 * @param array $doc
 * @return bool
 */
function magazin_evoShouldTriggerFirestoreSync(array $doc)
{
    if (!empty($doc['deleted'])) {
        return false;
    }
    if (isset($doc['type']) && $doc['type'] !== 'document') {
        return false;
    }
    if (empty($doc['published'])) {
        return false;
    }

    $id = (int) $doc['id'];
    $parent = (int) $doc['parent'];
    $template = (int) $doc['template'];

    if ($id === 2797) {
        return true;
    }

    if ($parent === 1 && empty($doc['hidemenu'])) {
        return true;
    }

    if ($parent !== 1 && in_array($template, array(9, 13), true)) {
        return true;
    }

    return false;
}

/**
 * @param DocumentParser $modx
 * @return bool true if still inside debounce window
 */
function magazin_evoIsDebounced($modx, $debounceSeconds)
{
    $file = MODX_BASE_PATH . 'assets/cache/magazin_firestore_sync_dispatch.txt';
    if (!is_readable($file)) {
        return false;
    }
    $ts = (int) trim((string) file_get_contents($file));
    return $ts > 0 && (time() - $ts) < $debounceSeconds;
}

/**
 * @param DocumentParser $modx
 */
function magazin_evoMarkDispatched($modx)
{
    $dir = MODX_BASE_PATH . 'assets/cache';
    if (!is_dir($dir)) {
        return;
    }
    $file = $dir . '/magazin_firestore_sync_dispatch.txt';
    @file_put_contents($file, (string) time());
}

/**
 * @param DocumentParser $modx
 * @param string $message
 * @param int $priority 1=info, 2=warning, 3=error
 */
function magazin_evoLog($modx, $message, $priority = 1)
{
    if (method_exists($modx, 'logEvent')) {
        $modx->logEvent(0, $priority, $message, 'FirestoreSync');
    }
}

/**
 * @param DocumentParser $modx
 * @return bool
 */
function magazin_evoDispatchFirestoreSyncWorkflow($modx)
{
    $token = magazin_evoConfig($modx, 'magazin_github_token');
    if ($token === '') {
        magazin_evoLog($modx, '[FirestoreSync] magazin_github_token is empty — skip dispatch', 2);
        return false;
    }

    $repo = magazin_evoConfig($modx, 'magazin_github_repo', 'vhollo/magazin');
    $workflow = magazin_evoConfig($modx, 'magazin_github_workflow', 'sync-modx-to-firestore.yml');
    $ref = magazin_evoConfig($modx, 'magazin_github_ref', 'main');
    $debounce = (int) magazin_evoConfig($modx, 'magazin_github_debounce', '120');
    if ($debounce < 30) {
        $debounce = 30;
    }

    if (magazin_evoIsDebounced($modx, $debounce)) {
        magazin_evoLog($modx, '[FirestoreSync] debounced — workflow already dispatched recently', 1);
        return true;
    }

    $url = 'https://api.github.com/repos/' . $repo . '/actions/workflows/' . $workflow . '/dispatches';
    $payload = json_encode(array(
        'ref' => $ref,
        'inputs' => array(
            'full_backfill' => 'false',
        ),
    ));

    if (!function_exists('curl_init')) {
        magazin_evoLog($modx, '[FirestoreSync] curl extension not available', 3);
        return false;
    }

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

    if ($httpCode === 204) {
        magazin_evoMarkDispatched($modx);
        magazin_evoLog($modx, '[FirestoreSync] GitHub workflow dispatched (HTTP 204)', 1);
        return true;
    }

    magazin_evoLog(
        $modx,
        '[FirestoreSync] dispatch failed HTTP ' . $httpCode
        . ($curlError ? ' curl: ' . $curlError : '')
        . ' body: ' . substr((string) $body, 0, 500),
        3
    );
    return false;
}

// ── Plugin entry ─────────────────────────────────────────────────────────────
// OnDocFormSave: $id and $mode are injected by Evolution from invokeEvent().

$e = &$modx->event;

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

        magazin_evoDispatchFirestoreSyncWorkflow($modx);
        break;

    default:
        return;
}
