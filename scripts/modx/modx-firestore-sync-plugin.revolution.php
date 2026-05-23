<?php
/**
 * MODX Revolution plugin — dispatch GitHub Actions "Sync MODX to Firestore" on save.
 * (NOT for Evolution — use modx-firestore-sync-plugin.php on diabetes.hu)
 */
if (!defined('MODX_BASE_PATH')) {
    die('What are you doing? Get out of here!');
}

function magazin_shouldTriggerFirestoreSync(modResource $resource)
{
    if ($resource->get('deleted')) {
        return false;
    }
    if ($resource->get('type') !== 'document') {
        return false;
    }
    if (!(bool) $resource->get('published')) {
        return false;
    }

    $id = (int) $resource->get('id');
    $parent = (int) $resource->get('parent');
    $template = (int) $resource->get('template');

    if ($id === 2797) {
        return true;
    }
    if ($parent === 1 && !(bool) $resource->get('hidemenu')) {
        return true;
    }
    if ($parent !== 1 && in_array($template, [9, 13], true)) {
        return true;
    }
    return false;
}

function magazin_dispatchFirestoreSyncWorkflow(modX $modx)
{
    $token = trim((string) $modx->getOption('magazin_github_token', null, ''));
    if ($token === '') {
        $modx->log(modX::LOG_LEVEL_WARN, '[FirestoreSync] magazin_github_token is empty — skip dispatch');
        return false;
    }

    $repo = trim((string) $modx->getOption('magazin_github_repo', null, 'vhollo/magazin'));
    $workflow = trim((string) $modx->getOption('magazin_github_workflow', null, 'sync-modx-to-firestore.yml'));
    $ref = trim((string) $modx->getOption('magazin_github_ref', null, 'main'));
    $debounce = (int) $modx->getOption('magazin_github_debounce', null, 120);
    if ($debounce < 30) {
        $debounce = 30;
    }

    $cacheKey = 'magazin/firestore_sync_dispatch';
    if ($modx->cacheManager->get($cacheKey)) {
        $modx->log(modX::LOG_LEVEL_INFO, '[FirestoreSync] debounced — workflow already dispatched recently');
        return true;
    }

    $url = 'https://api.github.com/repos/' . $repo . '/actions/workflows/' . $workflow . '/dispatches';
    $payload = json_encode([
        'ref' => $ref,
        'inputs' => ['full_backfill' => 'false'],
    ]);

    if (!function_exists('curl_init')) {
        $modx->log(modX::LOG_LEVEL_ERROR, '[FirestoreSync] curl extension not available');
        return false;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'Content-Type: application/json',
            'User-Agent: diabetes-hu-modx-firestore-sync',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
    ]);

    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 204) {
        $modx->cacheManager->set($cacheKey, time(), $debounce);
        $modx->log(modX::LOG_LEVEL_INFO, '[FirestoreSync] GitHub workflow dispatched (HTTP 204)');
        return true;
    }

    $modx->log(
        modX::LOG_LEVEL_ERROR,
        '[FirestoreSync] dispatch failed HTTP ' . $httpCode
        . ($curlError ? ' curl: ' . $curlError : '')
        . ' body: ' . substr((string) $body, 0, 500)
    );
    return false;
}

$e = &$modx->event;

switch ($e->name) {
    case 'OnDocFormSave':
        $resource = isset($e->params['resource']) ? $e->params['resource'] : null;
        if (!($resource instanceof modResource)) {
            return;
        }
        if (!magazin_shouldTriggerFirestoreSync($resource)) {
            return;
        }
        magazin_dispatchFirestoreSyncWorkflow($modx);
        break;
    default:
        return;
}
