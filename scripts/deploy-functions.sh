#!/usr/bin/env bash
# Redeploy edge functions from source, with the correct JWT mode for each.
#
# Why this exists
# ---------------
# The source of every function lives in this repo and nowhere else. If the
# deployed copies are lost, or the gateway flag needs resetting, this is the one
# command that puts all of them back consistently instead of 23 hand-typed deploys
# where one wrong flag is invisible.
#
# Usage:
#   ./scripts/deploy-functions.sh                 # every function in the manifest
#   ./scripts/deploy-functions.sh grammar-segment # one function
#   ./scripts/deploy-functions.sh --dry-run       # print the commands only
#   ./scripts/deploy-functions.sh --check         # verify only, deploy nothing
#
# After deploying it runs scripts/check-functions.sh, so a wrong flag is caught
# immediately rather than by a user.
#
# ⚠️ This deploys whatever is IN THIS REPO. If a function was edited in the
# dashboard and not here, that change is overwritten. Commit first.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

MANIFEST=scripts/functions-manifest.txt
DRY=0
ONLY=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --check)   exec ./scripts/check-functions.sh ;;
    -*) echo "unknown flag: $arg"; exit 2 ;;
    *) ONLY="$arg" ;;
  esac
done

[ -f "$MANIFEST" ] || { echo "FAIL: $MANIFEST missing"; exit 2; }

deploy_one() {
  local name="$1" jwt="$2" dir="supabase/functions/$1"

  if [ ! -f "$dir/index.ts" ]; then
    echo "  SKIP  $name — no $dir/index.ts in this repo"
    echo "        (the deployed copy cannot be rebuilt from here)"
    return 1
  fi

  local cmd=(supabase functions deploy "$name" --use-api)
  [ "$jwt" = "off" ] && cmd+=(--no-verify-jwt)

  if [ "$DRY" -eq 1 ]; then
    echo "  would: ${cmd[*]}"
    return 0
  fi

  local out
  out=$("${cmd[@]}" 2>&1)
  if printf '%s' "$out" | grep -qi "Deployed Functions"; then
    echo "  ok    $name (jwt=$jwt)"
    return 0
  fi
  echo "  FAIL  $name (jwt=$jwt)"
  printf '%s\n' "$out" | tail -6 | sed 's/^/          /'
  return 1
}

failed=0
done_count=0
while read -r name jwt _rest; do
  case "$name" in ''|'#'*) continue ;; esac
  [ -n "$ONLY" ] && [ "$ONLY" != "$name" ] && continue
  if deploy_one "$name" "$jwt"; then done_count=$((done_count + 1)); else failed=$((failed + 1)); fi
done < "$MANIFEST"

echo
echo "deployed $done_count, failed/skipped $failed"

if [ "$DRY" -eq 0 ] && [ -z "$ONLY" ]; then
  echo
  echo "── verifying every endpoint ──"
  ./scripts/check-functions.sh || exit 1
fi
exit $([ "$failed" -eq 0 ] && echo 0 || echo 1)
