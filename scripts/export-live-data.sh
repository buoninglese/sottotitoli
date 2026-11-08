#!/usr/bin/env bash
# Export every public table to JSON, without the database password.
#
# Why this exists
# ---------------
# The free plan has NO scheduled backups ("LAST BACKUP: No backups" in the
# dashboard), and on 2026-11-08 the database went down for reasons that had
# nothing to do with backups — there was simply no restore point. The schema was
# reproducible from git; the data was not.
#
# `supabase db dump` needs the database password. This does not: it goes through
# the Management API via `db query`, which authenticates with the CLI's stored
# credential. That is the only password-free path to the data.
#
# Output: exports/<timestamp>/<table>.json, each a JSON array of rows.
# Exits non-zero if ANY table fails or comes back unreadable — a partial backup
# that reports success is worse than no backup.
#
# Usage:  ./scripts/export-live-data.sh [output-dir]

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="${1:-exports/$STAMP}"
mkdir -p "$OUT" || exit 1

echo "Exporting to $OUT"

# ── Discover public tables (never trust a hardcoded list to stay complete) ──
cat > /tmp/_export_tables.sql <<'SQL'
select jsonb_agg(table_name order by table_name) as tables
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';
SQL

TABLES=$(supabase db query -f /tmp/_export_tables.sql --linked 2>/dev/null | python3 -c '
import sys, json
t = sys.stdin.read(); i = t.find("{")
if i < 0: sys.exit("no JSON from db query")
o, _ = json.JSONDecoder().raw_decode(t[i:])
print("\n".join(o["rows"][0]["tables"] or []))
')

if [ -z "$TABLES" ]; then
  echo "✗ could not list tables — refusing to report an empty backup as success"
  exit 1
fi

n_tables=0
n_failed=0
declare -a report=()

for t in $TABLES; do
  n_tables=$((n_tables + 1))
  printf 'select coalesce(jsonb_agg(x), %s) as data from public."%s" x;\n' "'[]'::jsonb" "$t" > /tmp/_export_one.sql

  raw=$(supabase db query -f /tmp/_export_one.sql --linked 2>&1)

  rows=$(printf '%s' "$raw" | python3 -c '
import sys, json
t = sys.stdin.read(); i = t.find("{")
if i < 0:
    print("ERR:no-json"); raise SystemExit
try:
    o, _ = json.JSONDecoder().raw_decode(t[i:])
    data = o["rows"][0]["data"]
    if not isinstance(data, list):
        print("ERR:not-a-list"); raise SystemExit
    print(len(data))
except Exception as e:
    print("ERR:" + str(e)[:60])
')

  case "$rows" in
    ERR:*)
      n_failed=$((n_failed + 1))
      report+=("  ✗ $t — ${rows#ERR:}")
      continue
      ;;
  esac

  # Write the array on its own so the file is valid JSON, not the CLI envelope.
  printf '%s' "$raw" | python3 -c '
import sys, json
t = sys.stdin.read(); i = t.find("{")
o, _ = json.JSONDecoder().raw_decode(t[i:])
json.dump(o["rows"][0]["data"], sys.stdout, indent=1)
' > "$OUT/$t.json"

  # Read it back: a file that cannot be parsed is not a backup.
  if python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$OUT/$t.json" 2>/dev/null; then
    report+=("  ✓ $t — $rows rows")
  else
    n_failed=$((n_failed + 1))
    report+=("  ✗ $t — written file is not valid JSON")
  fi
done

# Schema snapshot alongside the data, so a restore does not depend on the repo.
# dump-live-schema.sh writes to supabase/schema-live.sql and prints only a status
# line, so redirecting its STDOUT gave a 1-line "schema.sql" that passed silently
# as success. Copy the file it actually writes, and check it looks like SQL.
if [ -x ./scripts/dump-live-schema.sh ]; then
  if ./scripts/dump-live-schema.sh >/dev/null 2>&1 && [ -s supabase/schema-live.sql ]; then
    cp supabase/schema-live.sql "$OUT/schema.sql"
    lines=$(wc -l < "$OUT/schema.sql" | tr -d ' ')
    if [ "$lines" -gt 100 ]; then
      report+=("  ✓ schema.sql — $lines lines")
    else
      n_failed=$((n_failed + 1))
      report+=("  ✗ schema.sql — only $lines lines, that is not a schema")
    fi
  else
    n_failed=$((n_failed + 1))
    report+=("  ✗ schema.sql — could not be regenerated")
  fi
fi

printf '%s\n' "${report[@]}"

total_rows=$(python3 - "$OUT" <<'PY'
import glob, json, os, sys
d = sys.argv[1]; n = 0
for f in glob.glob(os.path.join(d, "*.json")):
    n += len(json.load(open(f)))
print(n)
PY
)

echo
if [ "$n_failed" -gt 0 ]; then
  echo "✗ $n_failed of $n_tables tables failed — this is NOT a usable backup"
  exit 1
fi
echo "✓ all $n_tables tables exported, $total_rows rows total, every file re-read"
echo "  NOT encrypted and contains personal data — keep it out of git (exports/ is ignored)"
