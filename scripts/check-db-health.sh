#!/usr/bin/env bash
# Is the database quietly filling up again?
#
# Why this exists
# ---------------
# The 2026-11-08 outage had no warning of any kind. 202,862 cron log rows and
# 113 MB of HTTP response bodies accumulated over months, took a 366 MB database
# to 94% log data, and on a 256 MB instance with no swap Postgres simply stopped
# accepting sessions — while the dashboard still said ACTIVE_HEALTHY. The first
# anyone knew was a connection timeout.
#
# Nothing was watching. This watches.
#
# It reads only the numbers that predicted that outage and the two silent-failure
# shapes found while auditing the fix: a job scheduled every minute, and pg_net
# rows that timed out while everything reported success. It exits non-zero when
# something is wrong, so it can be put on a schedule and mail you.
#
# Usage:
#   ./scripts/check-db-health.sh          # full report
#   ./scripts/check-db-health.sh --quiet   # problems only, for cron
#
# Exit codes: 0 healthy or warnings only, 1 at least one failure, 2 could not check.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

# --payload <file> judges a saved payload instead of querying. That is how the
# failure path is tested: a checker nobody has seen fail is a checker that may
# only ever print "ok".
PAYLOAD=""
if [ "${1:-}" = "--payload" ]; then PAYLOAD="${2:-}"; fi

if [ -n "$PAYLOAD" ]; then
  if [ ! -f "$PAYLOAD" ]; then
    echo "FAIL: payload file not found: $PAYLOAD"
    exit 2
  fi
  HEALTH=$(cat "$PAYLOAD")
else
  JSON=$(supabase db query -f scripts/sql/db-health.sql --linked 2>/dev/null)
  if [ -z "$JSON" ]; then
    echo "FAIL: could not query the database at all (is the project awake?)"
    exit 2
  fi

  HEALTH=$(printf '%s' "$JSON" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    obj, _ = json.JSONDecoder().raw_decode(raw[raw.index("{"):])
    print(json.dumps(obj["rows"][0]["health"]))
except Exception as e:
    print("PARSE_ERROR " + str(e))
')

  case "$HEALTH" in
    PARSE_ERROR*)
      echo "FAIL: could not read the health payload — ${HEALTH#PARSE_ERROR }"
      exit 2
      ;;
  esac
fi

printf '%s' "$HEALTH" | python3 -c '
import json, sys

h = json.load(sys.stdin)
fails, warns, oks = [], [], []

DB_CAP      = 500 * 1024 * 1024
FAIL_DB     = int(DB_CAP * 0.60)
WARN_DB     = int(DB_CAP * 0.30)
FAIL_ROWS   = 20000
FAIL_BYTES  = 50 * 1024 * 1024
FAIL_HTTP   = 5000
WARN_WAL    = 512 * 1024 * 1024

def check(cond_ok, ok, bad, level):
    if cond_ok:
        oks.append(ok)
    else:
        (fails if level == "fail" else warns).append(bad)

check(h["db_bytes"] < FAIL_DB,
      "database size %s (%.1f%% of the 500 MB free cap)" % (h["db_size"], 100.0 * h["db_bytes"] / DB_CAP),
      "database is %s — %.1f%% of the 500 MB free cap, which is the ceiling that matters"
        % (h["db_size"], 100.0 * h["db_bytes"] / DB_CAP), "fail")

if h["db_bytes"] >= WARN_DB and h["db_bytes"] < FAIL_DB:
    warns.append("database is %s — past 30%% of the free cap. Growth, not an emergency."
                 % h["db_size"])

check(not h["every_minute_jobs"],
      "no job is scheduled every minute",
      "a job runs EVERY MINUTE: %s — this is the exact configuration that took the database down"
        % json.dumps(h["every_minute_jobs"]), "fail")

check(h["cron_detail_rows"] < FAIL_ROWS,
      "cron history small: %d rows" % h["cron_detail_rows"],
      "cron history has grown to %d rows" % h["cron_detail_rows"], "fail")
check(h["cron_detail_bytes"] < FAIL_BYTES,
      "cron history %s on disk" % h["cron_detail_bytes"],
      "cron history occupies %d bytes — retention is not running" % h["cron_detail_bytes"], "fail")

check(h["http_rows"] < FAIL_HTTP,
      "pg_net responses small: %d rows" % h["http_rows"],
      "pg_net has %d response rows — retention is not running" % h["http_rows"], "fail")
check(h["http_bytes"] < FAIL_BYTES,
      "pg_net responses %s on disk" % h["http_bytes"],
      "pg_net responses occupy %d bytes — retention is not running" % h["http_bytes"], "fail")

check(h["http_incomplete"] == 0,
      "every pg_net call has an outcome recorded",
      "%d pg_net call(s) never recorded an outcome — a request went out and nothing came back"
        % h["http_incomplete"], "fail")

# The timeout itself, not the wreckage it leaves. A report batch runs ~24 s against
# the pg_net default of 5 s, so a job recreated without timeout_milliseconds abandons
# every slow report while cron.job_run_details records it as a success.
REPORT_MIN_TIMEOUT = 60 * 1000
posts = h["report_post_timeouts"]
if not posts:
    fails.append("no active cron job posts to process-ai-reports — AI reports would "
                 "never be generated at all")
else:
    short = [p for p in posts if p["timeout_ms"] is None or p["timeout_ms"] < REPORT_MIN_TIMEOUT]
    if short:
        fails.append(
            "the report cron timeout is missing or too short: %s — pg_net gives up after 5 s "
            "while the run log still records a success"
            % ", ".join(
                "jobid %s (%s)" % (p["jobid"], "no timeout_milliseconds set"
                                    if p["timeout_ms"] is None else "%d ms" % p["timeout_ms"])
                for p in short))
    else:
        oks.append("report cron timeout set: %s"
                   % ", ".join("%d ms" % p["timeout_ms"] for p in posts))

check(not h["inactive_jobs"],
      "all cron jobs active",
      "inactive cron job(s): %s — they will never run" % json.dumps(h["inactive_jobs"]), "warn")

check(h["cron_failures_24h"] == 0,
      "no cron failures in 24h",
      "%d cron failure(s) in the last 24h" % h["cron_failures_24h"], "warn")

check(h["http_timeouts_24h"] == 0,
      "no pg_net timeouts in 24h",
      "%d pg_net call(s) timed out in the last 24h — the work may have been abandoned mid-flight"
        % h["http_timeouts_24h"], "warn")

check(h["http_errors_24h"] == 0,
      "no pg_net HTTP errors in 24h",
      "%d pg_net call(s) returned 4xx/5xx in the last 24h" % h["http_errors_24h"], "warn")

check(not h["big_tables"],
      "no table over 10 MB",
      "table(s) over 10 MB: %s" % json.dumps(h["big_tables"]), "warn")

check(not h["dead_tuple_tables"],
      "no table with over 1000 dead rows",
      "table(s) with over 1000 dead rows (autovacuum behind): %s" % json.dumps(h["dead_tuple_tables"]), "warn")

check(h["wal_bytes"] < WARN_WAL,
      "WAL %s" % h["wal_size"],
      "WAL is %s — a stuck transaction is preventing WAL recycling" % h["wal_size"], "warn")

check(not h["stuck_slots"],
      "no inactive replication slots",
      "inactive replication slot(s): %s — these hold WAL forever and fill the disk"
        % json.dumps(h["stuck_slots"]), "warn")

quiet = "--quiet" in sys.argv
if not quiet:
    for o in oks:
        print("  ok    " + o)
for w in warns:
    print("  WARN  " + w)
for f in fails:
    print("  FAIL  " + f)

if fails:
    print("\n%d failure(s), %d warning(s)" % (len(fails), len(warns)))
    sys.exit(1)
if warns:
    print("\nhealthy, %d warning(s)" % len(warns))
    sys.exit(0)
if not quiet:
    print("\nhealthy: nothing is quietly filling up")
sys.exit(0)
' "$@"
