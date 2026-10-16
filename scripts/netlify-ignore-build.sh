#!/usr/bin/env bash
# Netlify `ignore` command (netlify.toml `[build] ignore`). Exit 0 = skip the
# build, exit 1 = build. Both Netlify projects build `main` from this repo:
#
#   testdiabeteshu (production, team diabetes-hu, credit-based: 15 credits per
#     production deploy) — skips a push whose changes since its last build are
#     ONLY the data files the MODX sync workflow commits (SYNC_DATA_FILES). About
#     half of all pushes are such commits (11 of 21 in Sept–Oct 2026).
#     Consequence: the copies of those files bundled into the production build
#     (recipes.json → getRecipes / "Kapcsolódó receptek", the redirect manifest)
#     are refreshed only by the next build with a code change. The Firestore data
#     the pages render is synced separately and is not affected. To deploy them
#     anyway, trigger a build hook (Netlify does not apply `ignore` to those).
#   diabeteshu (dev, legacy Starter) and any other project — Netlify's default:
#     skip only when nothing changed.
#
# Any missing or unusable git metadata means "build" — never skip by accident.
# The decision is printed into the deploy log.
set -u

PROD_SITE_ID='58ab240c-d36e-40cc-bfb6-02d18c81d2dc'
PROD_SITE_NAME='testdiabeteshu'
# Files committed by .github/workflows/sync-modx-to-firestore.yml ("chore(sync): …").
SYNC_DATA_FILES=(
  'src/lib/data/receptsarok-redirects.json'
  'src/lib/data/recipes.json'
  'scripts/data/magazin-recipe-category-review.json'
)

from="${CACHED_COMMIT_REF:-}"
to="${COMMIT_REF:-}"
if [[ -z "$from" || -z "$to" ]] || ! git cat-file -e "$from^{commit}" 2>/dev/null; then
  echo "ignore: no usable previous build commit ('$from') — build"
  exit 1
fi

if [[ "${SITE_ID:-}" != "$PROD_SITE_ID" && "${SITE_NAME:-}" != "$PROD_SITE_NAME" ]]; then
  # Netlify's default rule.
  if git diff --quiet "$from" "$to"; then
    echo "ignore: ${SITE_NAME:-site} — no changes since $from — skip"
    exit 0
  fi
  echo "ignore: ${SITE_NAME:-site} — changes since $from — build"
  exit 1
fi

if ! changed="$(git diff --name-only "$from" "$to")"; then
  echo "ignore: git diff failed — build"
  exit 1
fi

if [[ -z "$changed" ]]; then
  echo "ignore: production — no changes since $from — skip"
  exit 0
fi

other=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  is_sync=0
  for sync_file in "${SYNC_DATA_FILES[@]}"; do
    [[ "$file" == "$sync_file" ]] && is_sync=1 && break
  done
  [[ $is_sync -eq 0 ]] && other+=("$file")
done <<< "$changed"

if [[ ${#other[@]} -eq 0 ]]; then
  echo "ignore: production — only MODX sync data changed since $from (${changed//$'\n'/, }) — skip"
  exit 0
fi
echo "ignore: production — ${#other[@]} other file(s) changed since $from (e.g. ${other[0]}) — build"
exit 1
