#!/usr/bin/env bash
# deploy-check.sh -- after a push, answer "is it actually live?" without guessing.
#
# WHY THIS EXISTS (learned 2026-10-05 on buoninglese/sottotitoli, three separate times):
#
#  1. A Pages build can hang at status=building with dur=0 and created==updated FOREVER.
#     Two builds here needed a manual POST /pages/builds to clear. "Not built yet" and
#     "stuck" are indistinguishable from the outside, which is why there is a deadline below.
#
#  2. The CDN in front of Pages serves the HTML with cache-control: max-age=600, and a unique
#     query string does NOT reliably bypass it (x-cache: HIT was seen on a URL never used
#     before), so the HTML keeps pointing at the OLD asset long after the build succeeded.
#     Checking the HTML therefore proves NOTHING about whether your change shipped.
#
#  3. An early poll looks EXACTLY like a failed deploy. Twice in one session a correct deploy
#     read as broken purely because it was checked too soon.
#
# The only trustworthy check is the versioned ASSET url -- a URL that never existed before
# cannot be a stale cache hit -- compared byte-for-byte against the working tree.
#
# Usage:
#   ./deploy-check.sh js/panoramica.js
#   ./deploy-check.sh js/panoramica.js js/learner.js js/data-service.js
set -uo pipefail

REPO="buoninglese/sottotitoli"
SITE="https://www.sottotitoli.pro"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEADLINE=90

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <code/js-file> [more files ...]   (paths relative to the repo root)"
  exit 2
fi

build_status() { gh api "repos/$REPO/pages/builds/latest" --jq '.status' 2>/dev/null || echo unknown; }
build_commit() { gh api "repos/$REPO/pages/builds/latest" --jq '.commit[0:7]' 2>/dev/null || echo '?'; }

echo "== 1. build =="
waited=0
while [ "$waited" -lt "$DEADLINE" ]; do
  st="$(build_status)"
  echo "   status=$st commit=$(build_commit) (${waited}s)"
  case "$st" in
    built) break ;;
    errored) echo "   ^ build ERRORED -- open the Pages build log; re-running will not help until the cause is fixed" ;;
  esac
  sleep 10
  waited=$((waited + 10))
done

if [ "$(build_status)" != "built" ]; then
  echo "   not built after ${DEADLINE}s -> re-triggering (the known 'building dur=0' hang)"
  gh api -X POST "repos/$REPO/pages/builds" --jq '"   queued: " + .status'
  sleep 30
fi

echo
echo "== 2. artifacts (this is the part that proves it) =="
html="$(curl -s "$SITE/panoramica.html")"
rc=0
for f in "$@"; do
  base="$(basename "$f")"
  v="$(printf '%s' "$html" | grep -o "$base?v=[0-9]*" | head -1 | sed 's/.*?v=//')"
  if [ -n "$v" ]; then
    url="$SITE/$f?v=$v"
  else
    # unversioned asset: a cache-buster is the best available, though see note 2 above
    url="$SITE/$f?cb=$(date +%s)"
  fi
  curl -s "$url" -o "/tmp/deploy-check-$base"
  live_sha="$(shasum -a 256 "/tmp/deploy-check-$base" | cut -c1-16)"
  local_sha="$(shasum -a 256 "$ROOT/$f" | cut -c1-16)"
  if [ "$live_sha" = "$local_sha" ]; then
    echo "   OK    $f  ($(wc -c < "/tmp/deploy-check-$base" | tr -d ' ') bytes, sha $live_sha)"
  else
    echo "   STALE $f  live=$live_sha  local=$local_sha  <- not live yet; DO NOT report this as shipped"
    rc=1
  fi
done

echo
echo "== 3. served HTML reference (informational -- it lags behind the artifacts) =="
printf '%s' "$html" | grep -o '[a-z0-9-]*\.js?v=[0-9]*' | sort -u | head -20
printf '%s' "$html" | grep -o '>[vV][0-9]*</span>' | head -1

echo
[ "$rc" -eq 0 ] && echo "RESULT: artifacts are live." || echo "RESULT: at least one artifact is stale."
exit $rc
