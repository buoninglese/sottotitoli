#!/usr/bin/env bash
# Prove the health check can actually fail.
#
# After this session, "it printed ok" is not evidence of anything on its own. Three
# separate checks during the audit reported success while verifying nothing: a
# scanner that stripped its own denylist, a sentinel test that planted zero rows
# and still printed "0 left", and a prune job that had never once executed.
#
# So this feeds check-db-health.sh payloads that are deliberately wrong and
# asserts it exits 1 with the right complaint. If it ever stops failing on these,
# the health check is decoration.
#
# Run: ./scripts/check-db-health-selftest.sh

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
CHECK=./scripts/check-db-health.sh
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
failures=0

base() {
  cat > "$1" <<'JSON'
{
  "db_bytes": 22020096, "db_size": "21 MB", "wal_bytes": 134217728, "wal_size": "128 MB",
  "cron_detail_rows": 5, "cron_detail_bytes": 32768,
  "http_rows": 5, "http_bytes": 49152,
  "every_minute_jobs": [], "inactive_jobs": [],
  "cron_failures_24h": 0, "http_timeouts_24h": 0, "http_errors_24h": 0, "http_incomplete": 0,
  "report_post_timeouts": [{"jobid": 9, "timeout_ms": 120000}],
  "big_tables": [], "dead_tuple_tables": [], "stuck_slots": []
}
JSON
}

expect() { # expect <want-exit> <label> <file>
  local want="$1" label="$2" file="$3"
  local out rc
  out=$("$CHECK" --payload "$file" 2>&1)
  rc=$?
  if [ "$rc" -ne "$want" ]; then
    echo "  FAILED: $label — expected exit $want, got $rc"
    echo "$out" | sed 's/^/           /'
    failures=$((failures + 1))
  elif [ "$want" -eq 1 ] && ! printf '%s' "$out" | grep -q "FAIL"; then
    echo "  FAILED: $label — exited 1 but printed no FAIL line"
    failures=$((failures + 1))
  else
    echo "  ok: $label (exit $rc)"
  fi
}

echo "checks that must PASS:"
base "$TMP/healthy.json"
expect 0 "a clean payload is healthy" "$TMP/healthy.json"

echo
echo "checks that must FAIL:"

python3 - "$TMP/healthy.json" "$TMP/everymin.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["every_minute_jobs"] = [{"jobid": 9, "name": "process-ai-reports", "schedule": "* * * * *"}]
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "a job on every minute — the exact outage cause" "$TMP/everymin.json"

python3 - "$TMP/healthy.json" "$TMP/bigdb.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["db_bytes"] = 340 * 1024 * 1024
d["db_size"] = "340 MB"
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "database past 60% of the free cap" "$TMP/bigdb.json"

python3 - "$TMP/healthy.json" "$TMP/cronswell.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["cron_detail_rows"] = 250000
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "cron history grown to a quarter of a million rows" "$TMP/cronswell.json"

python3 - "$TMP/healthy.json" "$TMP/noretention.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["http_bytes"] = 120 * 1024 * 1024
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "pg_net responses festering at 120 MB" "$TMP/noretention.json"

python3 - "$TMP/healthy.json" "$TMP/incomplete.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["http_incomplete"] = 3
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "pg_net calls that never recorded an outcome" "$TMP/incomplete.json"

python3 - "$TMP/healthy.json" "$TMP/notimeout.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["report_post_timeouts"] = [{"jobid": 9, "timeout_ms": None}]
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "report cron recreated without a timeout — the 5s bug returning" "$TMP/notimeout.json"

python3 - "$TMP/healthy.json" "$TMP/shorttimeout.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["report_post_timeouts"] = [{"jobid": 9, "timeout_ms": 5000}]
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "report cron left on pg_net's 5s default" "$TMP/shorttimeout.json"

python3 - "$TMP/healthy.json" "$TMP/noreport.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["report_post_timeouts"] = []
json.dump(d, open(sys.argv[2], "w"))
PY
expect 1 "nothing posts to process-ai-reports at all" "$TMP/noreport.json"

echo
echo "checks that must WARN but not fail:"
python3 - "$TMP/healthy.json" "$TMP/timeout.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["http_timeouts_24h"] = 2
json.dump(d, open(sys.argv[2], "w"))
PY
expect 0 "pg_net timeouts warn without failing" "$TMP/timeout.json"

echo
if [ "$failures" -gt 0 ]; then
  echo "SELF-TEST FAILED: $failures case(s) — the health check cannot be trusted"
  exit 1
fi
echo "self-test ok: every failure condition was detected, warnings stayed warnings"
