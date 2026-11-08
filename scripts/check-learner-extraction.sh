#!/usr/bin/env bash
# Live check for the onboarding-extraction invariant.
#
# Unlike check-report-catalogue.sh this one talks to the LINKED Supabase project,
# so it needs credentials and network. It is therefore kept separate: the offline
# guard must stay runnable with no secrets.
#
# It asserts that coverage and payload cannot disagree — the thing every report
# branches on — and it is written so that it CAN fail: a missing constraint, a
# rejected-everything constraint, or a leaked write all exit non-zero.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

SQL="scripts/sql/check-learner-extraction.sql"
out=$(supabase db query -f "$SQL" --linked 2>&1)
rc=$?

if [ $rc -ne 0 ]; then
  echo "✗ could not run the check (exit $rc):"
  echo "$out"
  exit 1
fi

# The CLI returns JSON; pull the res values out without depending on jq.
results=$(printf '%s' "$out" | grep -o '"res": *"[^"]*"' | sed 's/.*: *"//; s/"$//')

if [ -z "$results" ]; then
  echo "✗ no results parsed — the check produced no evidence, which is not a pass"
  echo "$out"
  exit 1
fi

echo "$results" | sed 's/^/  /'

# A named violation must be reported as a violation, and it must be checked BEFORE
# the assertion count: otherwise a genuine FAILED is announced as "only 4
# assertions passed", which is true but points at the wrong problem.
bad=0
while IFS= read -r line; do
  case "$line" in
    *FAILED*|*INCONCLUSIVE*) bad=1; echo "  (violation: $line)" ;;
    *ok*) : ;;
    *) bad=1; echo "  (unrecognised result, treated as failure: $line)" ;;
  esac
done <<< "$results"

if [ $bad -ne 0 ]; then
  echo "✗ learner extraction invariant violated"
  exit 1
fi

# A run where no case actually asserted anything must not look green.
n_ok=$(printf '%s\n' "$results" | grep -c "ok")
if [ "$n_ok" -lt 5 ]; then
  echo "✗ only $n_ok assertions passed; expected 5. Missing cases are not passes."
  exit 1
fi

echo "✓ coverage/payload invariant holds, and the constraint enforcing it is live"
