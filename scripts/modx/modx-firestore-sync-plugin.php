<?php
/**
 * MODX Evolution 1.4 plugin — dispatch GitHub Actions "Sync MODX to Firestore"
 * on article save, via repository_dispatch (MySQL-free payload path).
 *
 * Install:
 * 1. Elements → Plugins → New → paste this code.
 * 2. System Events: check **OnDocFormSave**, **OnDocFormDelete**,
 *    **OnDocFormUndelete**, **OnDocPublished**, **OnDocUnPublished**,
 *    **OnBeforeEmptyTrash** and **OnEmptyTrash**.
 *    (Save alone would leave an unpublished-from-the-tree, trashed or purged
 *    article live on the site until the next manual sync.)
 *    Do **not** check `OnBeforeDocFormDelete`: it fires before the row is marked
 *    deleted, so the payload would re-add the article that is being deleted.
 * 3. Manager → Configuration — add:
 *    - magazin_github_token   (required) PAT with Contents: write + Actions: read/write.
 *      Fine-grained: Repository access (Contents: write, Actions: read/write).
 *      Classic: repo scope.
 *    - magazin_github_repo    (optional — omit or leave unset for vhollo/magazin; do NOT save empty)
 *
 * How it works:
 *   On each magazine document save the plugin dispatches a single repository_dispatch
 *   event (modx-doc-save) carrying only the saved doc (+ ancestors + filtered TVs)
 *   as a gzip+base64 payload.
 *
 *   Removals travel the same road. Unpublish / trash / restore ship the row itself,
 *   so the Node side decides add-or-delete with `shouldSyncRow` — the single source
 *   of truth. Where the row can no longer speak for itself (emptied trash) or would
 *   be wasteful to ship (the trashed subtree under a deleted folder), the payload
 *   carries bare `removedIds` and Firestore docs are deleted by their MODX id.
 *   Deleting an article therefore also drops it from `collections/*`, the search
 *   index and the projection snapshot, exactly like an unpublish does.
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

// Guarded one by one: an older copy of this plugin still installed would define
// only the first two, and a block guard would then leave the third undefined.
if (!defined('MAGAZIN_GITHUB_REPO_DEFAULT')) {
    define('MAGAZIN_GITHUB_REPO_DEFAULT', 'vhollo/magazin');
}
if (!defined('MAGAZIN_TV_IDS')) {
    define('MAGAZIN_TV_IDS', '3,4,18,23,25,28,29,30,31');
}
if (!defined('MAGAZIN_MAX_UNDELETE_DISPATCH')) {
    // Restoring a folder dispatches one run per restored child — beyond this many,
    // ask for a full backfill instead of flooding the Actions queue.
    define('MAGAZIN_MAX_UNDELETE_DISPATCH', 20);
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
        $type = isset($doc['type']) ? (string) $doc['type'] : 'document';
        $parent = (int) $doc['parent'];
        if (in_array($type, array('reference', 'weblink'), true) && $parent === 0) {
            return true;
        }
        if ($type !== 'document') {
            return false;
        }
        $id = (int) $doc['id'];
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

if (!function_exists('magazin_evoScopeFields')) {
    /** Column list that is enough for magazin_evoIsMagazineCandidate(). */
    function magazin_evoScopeFields()
    {
        return 'id, parent, template, published, deleted, hidemenu, type';
    }
}

if (!function_exists('magazin_evoResolveEventDocId')) {
    /**
     * Evolution hands event parameters to the plugin as *extracted local
     * variables* ($id for OnDocFormSave, $docid for OnDocPublished/…), so the
     * caller passes what it can see; $e->params is only a fallback for setups
     * where the Event object carries them.
     *
     * @param object   $e        The Event object
     * @param mixed    $injected The id variable Evolution injected, when set
     * @return int
     */
    function magazin_evoResolveEventDocId($e, $injected = null)
    {
        $candidates = array($injected);
        if (isset($e->params) && is_array($e->params)) {
            foreach (array('id', 'docid', 'doc_id', 'documentid') as $key) {
                if (isset($e->params[$key])) {
                    $candidates[] = $e->params[$key];
                }
            }
        }
        foreach ($candidates as $candidate) {
            $docId = (int) $candidate;
            if ($docId > 0) {
                return $docId;
            }
        }
        return 0;
    }
}

if (!function_exists('magazin_evoResolveEventIds')) {
    /**
     * Ids carried by a bulk event (empty trash). Accepts an array or a
     * comma-separated list; an empty result means "ask the database".
     *
     * @param object $e
     * @param mixed  $injected The ids variable Evolution injected, when set
     * @return int[]
     */
    function magazin_evoResolveEventIds($e, $injected = null)
    {
        $raw = array();
        if (is_array($injected)) {
            $raw = array_merge($raw, $injected);
        } elseif (is_string($injected) || is_int($injected)) {
            $raw = array_merge($raw, explode(',', (string) $injected));
        }
        if (isset($e->params) && is_array($e->params)) {
            foreach (array('ids', 'id', 'documents') as $key) {
                if (!isset($e->params[$key])) {
                    continue;
                }
                $value = $e->params[$key];
                if (is_array($value)) {
                    $raw = array_merge($raw, $value);
                } elseif (is_string($value) || is_int($value)) {
                    $raw = array_merge($raw, explode(',', (string) $value));
                }
            }
        }
        $ids = array();
        foreach ($raw as $value) {
            $id = (int) trim((string) $value);
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }
        return array_values($ids);
    }
}

if (!function_exists('magazin_evoFilterCandidateIds')) {
    /**
     * Keep only the ids that are magazine documents. With an empty id list the
     * whole trash is inspected — that is the reliable source when the event
     * carries no ids of its own.
     *
     * @param DocumentParser $modx
     * @param int[]          $ids
     * @param bool           $fallbackToTrash  Scan `deleted = 1` when $ids is empty
     * @return int[]
     */
    function magazin_evoFilterCandidateIds($modx, array $ids, $fallbackToTrash = false)
    {
        if (empty($ids) && !$fallbackToTrash) {
            return array();
        }
        $table = $modx->getFullTableName('site_content');
        $where = empty($ids)
            ? 'deleted = 1'
            : 'id IN (' . implode(',', array_map('intval', $ids)) . ')';
        $rs = $modx->db->select(magazin_evoScopeFields(), $table, $where);
        if (!$rs) {
            return array();
        }
        $out = array();
        while ($row = $modx->db->getRow($rs)) {
            if (magazin_evoIsMagazineCandidate($row)) {
                $out[] = (int) $row['id'];
            }
        }
        return $out;
    }
}

if (!function_exists('magazin_evoGetCandidateDescendantIds')) {
    /**
     * Magazine documents below $rootId. Deleting/restoring a folder in the
     * manager cascades to the whole subtree, but the event only names the
     * folder — the children have to be collected here.
     *
     * @param DocumentParser $modx
     * @param int            $rootId
     * @param int            $limit  Safety cap on the collected subtree
     * @return int[]
     */
    function magazin_evoGetCandidateDescendantIds($modx, $rootId, $limit = 500)
    {
        $table   = $modx->getFullTableName('site_content');
        $out     = array();
        $seen    = array((int) $rootId => true);
        $parents = array((int) $rootId);

        while (!empty($parents) && count($out) < $limit) {
            $list = implode(',', array_map('intval', $parents));
            $rs = $modx->db->select(magazin_evoScopeFields(), $table, 'parent IN (' . $list . ')');
            $parents = array();
            if (!$rs) {
                break;
            }
            while ($row = $modx->db->getRow($rs)) {
                $childId = (int) $row['id'];
                if ($childId <= 0 || isset($seen[$childId])) {
                    continue;
                }
                $seen[$childId] = true;
                $parents[] = $childId;
                if (magazin_evoIsMagazineCandidate($row)) {
                    $out[] = $childId;
                }
            }
        }

        return $out;
    }
}

if (!function_exists('magazin_evoAlreadyDispatched')) {
    /**
     * One dispatch per doc per request. Saving with "published" unchecked can
     * fire OnDocFormSave *and* OnDocUnPublished; both would send the same row.
     *
     * @param string $key
     * @return bool  true when this key was dispatched earlier in this request
     */
    function magazin_evoAlreadyDispatched($key)
    {
        if (!isset($GLOBALS['magazin_dispatched_keys'])) {
            $GLOBALS['magazin_dispatched_keys'] = array();
        }
        if (isset($GLOBALS['magazin_dispatched_keys'][$key])) {
            return true;
        }
        $GLOBALS['magazin_dispatched_keys'][$key] = true;
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
     * @param int            $docId       The saved doc id
     * @param int[]          $removedIds  MODX ids to delete from Firestore by id
     *                                    (trashed descendants — no row shipped)
     * @return bool
     */
    function magazin_evoDispatchSavePayload($modx, $docId, array $removedIds = array())
    {
        if (magazin_evoAlreadyDispatched('save:' . (int) $docId)) {
            return true;
        }
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

        // ── 3. Build gzip+base64 payload ──────────────────────────────────────
        // No author chunks: bylines are resolved from Firestore `authors/{slug}`
        // via the `szerzo` TV value, which travels in `tvs` (id 18).
        $payload = array(
            'rows' => $rows,
            'tvs'  => $tvs,
        );
        if (!empty($removedIds)) {
            $payload['removedIds'] = array_values(array_map('intval', $removedIds));
        }
        $json = json_encode($payload);
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

        // ── 4. Dispatch repository_dispatch ───────────────────────────────────
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
                . ' repo=' . $repo . ' id=' . $docId
                . (empty($removedIds) ? '' : ' removedIds=' . implode(',', $removedIds)),
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

if (!function_exists('magazin_evoDispatchRemovalIds')) {
    /**
     * Dispatch a removal-only payload: no rows, just the MODX ids whose Firestore
     * docs must go. Used when the `site_content` rows are already gone (emptied
     * trash), so nothing can be classified from a row any more.
     *
     * @param DocumentParser $modx
     * @param int[]          $ids
     * @return bool
     */
    function magazin_evoDispatchRemovalIds($modx, array $ids)
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if (empty($ids)) {
            return false;
        }
        if (magazin_evoAlreadyDispatched('remove:' . implode(',', $ids))) {
            return true;
        }

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

        $json = json_encode(array(
            'rows'       => array(),
            'tvs'        => array(),
            'removedIds' => $ids,
        ));
        if ($json === false) {
            magazin_evoLog($modx, '[FirestoreSync] json_encode failed for removal payload', 3);
            return false;
        }
        $gz = gzencode($json, 6);
        if ($gz === false) {
            magazin_evoLog($modx, '[FirestoreSync] gzencode failed for removal payload', 3);
            return false;
        }

        $result = magazin_evoGithubRepositoryDispatch(
            $repo,
            $token,
            'modx-doc-save',
            array('data' => base64_encode($gz))
        );

        if ($result['http'] === 204) {
            magazin_evoLog(
                $modx,
                '[FirestoreSync] repository_dispatch modx-doc-save (removal) dispatched (HTTP 204)'
                . ' repo=' . $repo . ' ids=' . implode(',', $ids),
                1
            );
            return true;
        }

        magazin_evoLog(
            $modx,
            '[FirestoreSync] removal dispatch failed HTTP ' . $result['http']
            . ' repo=' . $repo . ' ids=' . implode(',', $ids)
            . ($result['curl_error'] ? ' curl: ' . $result['curl_error'] : '')
            . ' body: ' . substr($result['body'], 0, 500),
            3
        );
        return false;
    }
}

// ── Event handler ────────────────────────────────────────────────────────────
// Evolution injects the event parameters as local variables into the plugin
// scope ($id + $mode for OnDocFormSave, $docid for the publish events, $ids for
// empty trash), so the entry below reads them there and passes them in.

if (!function_exists('magazin_evoHandleEvent')) {
    /**
     * @param DocumentParser $modx
     * @param object         $e         The Event object
     * @param mixed          $docIdHint Injected $id / $docid, when set
     * @param mixed          $idsHint   Injected $ids, when set
     * @return void
     */
    function magazin_evoHandleEvent($modx, $e, $docIdHint = null, $idsHint = null)
    {
    switch ($e->name) {
        // Row-shipping events: the site_content row still exists, so the payload
        // carries it and the Node side (shouldSyncRow) decides upsert vs. delete.
        case 'OnDocFormSave':
        case 'OnDocFormDelete':
        case 'OnDocFormUndelete':
        case 'OnDocPublished':
        case 'OnDocUnPublished':
            $docId = magazin_evoResolveEventDocId($e, $docIdHint);
            if ($docId <= 0) {
                magazin_evoLog(
                    $modx,
                    '[FirestoreSync] ' . $e->name . ': no document id in the event —'
                    . ' nothing dispatched',
                    2
                );
                return;
            }

            // Quick scope check with a lightweight row (avoids loading full content twice)
            $scopeRow = magazin_evoGetDocumentRow($modx, $docId, magazin_evoScopeFields());
            if (!$scopeRow) {
                return;
            }
            $isCandidate = magazin_evoIsMagazineCandidate($scopeRow);
            $isSubtreeEvent = ($e->name === 'OnDocFormDelete' || $e->name === 'OnDocFormUndelete');
            if (!$isCandidate && !$isSubtreeEvent) {
                return;
            }

            // Delete/undelete cascade to the whole subtree, and the children never get
            // an event of their own — so they are handled here even when the folder
            // itself is outside the magazine scope (a plain container with articles).
            $removedIds = array();
            if ($e->name === 'OnDocFormDelete') {
                // Trashed children: their content is not worth shipping, the id is enough.
                $removedIds = magazin_evoGetCandidateDescendantIds($modx, $docId);
            } elseif ($e->name === 'OnDocFormUndelete') {
                // Restoring is the mirror image: each child needs its full payload
                // (content + TVs) to be rebuilt, so it gets its own dispatch.
                $restored = magazin_evoGetCandidateDescendantIds($modx, $docId, MAGAZIN_MAX_UNDELETE_DISPATCH + 1);
                if (count($restored) > MAGAZIN_MAX_UNDELETE_DISPATCH) {
                    magazin_evoLog(
                        $modx,
                        '[FirestoreSync] undelete of id=' . $docId . ' restored more than '
                        . MAGAZIN_MAX_UNDELETE_DISPATCH . ' magazine children — run the'
                        . ' "Sync MODX to Firestore" workflow with full_backfill=true',
                        2
                    );
                } else {
                    foreach ($restored as $childId) {
                        magazin_evoDispatchSavePayload($modx, $childId);
                    }
                }
            }

            if ($isCandidate) {
                magazin_evoDispatchSavePayload($modx, $docId, $removedIds);
            } elseif (!empty($removedIds)) {
                magazin_evoDispatchRemovalIds($modx, $removedIds);
            }
            break;

        // Emptying the trash hard-deletes the rows, so collect the ids while they
        // still exist and dispatch a removal-only payload once they are gone.
        case 'OnBeforeEmptyTrash':
            $GLOBALS['magazin_trash_ids'] = magazin_evoFilterCandidateIds(
                $modx,
                magazin_evoResolveEventIds($e, $idsHint),
                true
            );
            break;

        case 'OnEmptyTrash':
            $ids = isset($GLOBALS['magazin_trash_ids']) ? $GLOBALS['magazin_trash_ids'] : array();
            unset($GLOBALS['magazin_trash_ids']);
            if (empty($ids)) {
                // OnBeforeEmptyTrash was not registered (or carried nothing) — fall
                // back to whatever ids this event names; their rows are gone now, so
                // there is nothing left to scan.
                $ids = magazin_evoResolveEventIds($e, $idsHint);
            }
            if (empty($ids)) {
                magazin_evoLog(
                    $modx,
                    '[FirestoreSync] empty trash: no ids to remove — enable the'
                    . ' OnBeforeEmptyTrash event on this plugin',
                    2
                );
                return;
            }
            magazin_evoDispatchRemovalIds($modx, $ids);
            break;

        default:
            return;
    }
    }
}

// ── Plugin entry ─────────────────────────────────────────────────────────────
// Everything runs inside a try/catch: a failing content sync must never break
// the editor's save. Errors land in Reports → System Events (source FirestoreSync).

$magazinEvent = isset($modx->Event) ? $modx->Event : (isset($modx->event) ? $modx->event : null);
if (!$magazinEvent || !isset($magazinEvent->name)) {
    return;
}

$magazinDocIdHint = null;
if (isset($id)) {
    $magazinDocIdHint = $id;
} elseif (isset($docid)) {
    $magazinDocIdHint = $docid;
} elseif (isset($doc_id)) {
    $magazinDocIdHint = $doc_id;
}
$magazinIdsHint = isset($ids) ? $ids : null;

try {
    magazin_evoHandleEvent($modx, $magazinEvent, $magazinDocIdHint, $magazinIdsHint);
} catch (Throwable $magazinErr) {
    magazin_evoLog(
        $modx,
        '[FirestoreSync] ' . $magazinEvent->name . ' failed: ' . $magazinErr->getMessage()
        . ' @ ' . $magazinErr->getFile() . ':' . $magazinErr->getLine(),
        3
    );
} catch (Exception $magazinErr) {
    // PHP 5 fallback — Throwable does not exist there, so this catch takes over.
    magazin_evoLog(
        $modx,
        '[FirestoreSync] ' . $magazinEvent->name . ' failed: ' . $magazinErr->getMessage()
        . ' @ ' . $magazinErr->getFile() . ':' . $magazinErr->getLine(),
        3
    );
}
