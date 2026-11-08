#!/usr/bin/env bash
# Are all the edge functions deployed, reachable, and on the right JWT mode?
#
# Why this exists
# ---------------
# The gateway's verify_jwt flag is set per function and is easy to get wrong in a
# way nobody notices:
#   * a JWT-OFF function redeployed without --no-verify-jwt becomes JWT-ON, and
#     the cron and Stripe silently start receiving 401s while everything else
#     looks fine;
#   * a JWT-ON function redeployed with --no-verify-jwt is open to the internet.
#
# So this probes the live endpoints and compares them to
# scripts/functions-manifest.txt. It reads nothing from the database and needs no
# secret: the 401 body shape is what distinguishes gateway-on from gateway-off.
#
# Usage:
#   ./scripts/check-functions.sh           # report, exit 1 on drift
#   ./scripts/check-functions.sh --quiet   # only problems
#
# Exit codes: 0 all as expected, 1 drift or missing function, 2 could not read config.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

MANIFEST=scripts/functions-manifest.txt
PROJECT_REF=${PROJECT_REF:-qzqmuegbpmvqrjrlfbgk}
BASE="https://${PROJECT_REF}.supabase.co/functions/v1"
QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

[ -f "$MANIFEST" ] || { echo "FAIL: $MANIFEST missing"; exit 2; }

problems=0
ok=0
while read -r name want _rest; do
  case "$name" in ''|'#'*) continue ;; esac

  # Capture status AND body: a 404 still returns a JSON body, so body alone would
  # misreport an undeployed slug as "drift" instead of "missing".
  status=$(curl -s -m 15 -o /tmp/.fn-body -w '%{http_code}' \
             -X POST "$BASE/$name" -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
  rc=$?
  body=$(cat /tmp/.fn-body 2>/dev/null)

  if [ "$rc" -ne 0 ] || [ -z "$status" ] || [ "$status" = "000" ]; then
    echo "  UNREACHABLE  $name  (no HTTP response — network, or the project is down)"
    problems=$((problems + 1))
    continue
  fi

  if [ "$status" = "404" ]; then
    echo "  MISSING      $name  (404 — not deployed; deploy with ./scripts/deploy-functions.sh $name)"
    problems=$((problems + 1))
    continue
  fi

  case "$body" in
    *UNAUTHORIZED_NO_AUTH_HEADER*) got=on ;;
    *) got=off ;;
  esac

  if [ "$got" != "$want" ]; then
    echo "  DRIFT        $name  expected jwt=$want, live jwt=$got (HTTP $status)"
    echo "               body: $(printf '%s' "$body" | cut -c1-90)"
    problems=$((problems + 1))
  else
    ok=$((ok + 1))
    [ "$QUIET" -eq 1 ] || echo "  ok           $name  jwt=$got"
  fi
done < "$MANIFEST"
rm -f /tmp/.fn-body

echo
if [ "$problems" -gt 0 ]; then
  echo "FAILED: $problems problem(s), $ok function(s) correct"
  echo "Fix one with: ./scripts/deploy-functions.sh <name>"
  exit 1
fi
echo "all $ok functions deployed and on the expected JWT mode"
