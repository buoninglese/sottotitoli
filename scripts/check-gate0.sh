#!/usr/bin/env bash
# Gate 0 — "See": can the product tell anyone when it breaks, and can we read a funnel?
#
# Why this exists
# ---------------
# Gate 0 is only worth anything if it is *provably* on. A beacon that silently
# fails to insert is indistinguishable from a product with no errors, which is the
# exact trap this whole exercise exists to escape.
#
# So every claim is checked in BOTH directions:
#   * the beacon CAN insert as an anonymous user   (positive control)
#   * the same anonymous user CANNOT read it back   (fail-closed)
#   * the same anonymous user CANNOT delete it      (fail-closed)
#   * the funnel view CANNOT be reached over HTTP   (not exposed)
#   * the funnel view's numbers MATCH the source tables (self-validating)
#
# A check that can only ever pass is not a check. If the "cannot read" assertion
# ever returns a row, this script fails — that is the point.
#
# Usage:
#   ./scripts/check-gate0.sh            # run all checks
#   ./scripts/check-gate0.sh --quiet    # only failures + summary
#
# Exit codes: 0 all checks passed, 1 at least one failed, 2 could not check.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1
export GATE0_QUIET="$QUIET"

python3 - <<'PY'
import json, os, re, subprocess, sys, tempfile, urllib.error, urllib.request, uuid

QUIET = os.environ.get("GATE0_QUIET") == "1"
results = []


def record(name, ok, detail):
    results.append((name, ok, detail))
    if not QUIET or not ok:
        print(f"  {'PASS' if ok else 'FAIL'}  {name:<34} {detail}")


def sql(query):
    """Run SQL through the linked project. Returns rows, or raises."""
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f:
        f.write(query)
        path = f.name
    try:
        out = subprocess.run(
            ["supabase", "db", "query", "-f", path, "--linked"],
            capture_output=True, text=True)
    finally:
        os.unlink(path)
    raw = out.stdout
    if "{" not in raw:
        raise RuntimeError((raw + out.stderr).strip()[:200])
    return json.JSONDecoder().raw_decode(raw[raw.index("{"):])[0].get("rows", [])


def creds():
    src = open("js/auth.js", encoding="utf-8").read()
    url = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", src)
    key = re.search(r"SUPABASE_ANON_KEY\s*=\s*'([^']+)'", src)
    if not url or not key:
        raise RuntimeError("could not read SUPABASE_URL / SUPABASE_ANON_KEY from js/auth.js")
    return url.group(1).rstrip("/"), key.group(1)


def http(method, path, url, key, body=None, prefer="return=minimal"):
    req = urllib.request.Request(
        f"{url}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": prefer,
        })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode()[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


# ── 0. can we check at all? ────────────────────────────────────────────────
try:
    url, key = creds()
    probe = sql("select 1 as ok;")
    if not probe:
        raise RuntimeError("empty result from db query")
except Exception as e:
    print(f"FAIL: cannot check — {e}")
    sys.exit(2)

print("Gate 0 — error visibility + funnel")
print("  " + "-" * 74)

# ── 1. table shape and security posture ────────────────────────────────────
try:
    row = sql("""
        select c.relrowsecurity as rls,
               (select count(*) from information_schema.columns
                 where table_schema='public' and table_name='client_errors'
                   and column_name in ('error_type','message','page','user_agent','url','created_at')) as cols
          from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='public' and c.relname='client_errors';
    """)[0]
    record("client_errors exists, 6 columns", row["cols"] == 6, f"{row['cols']}/6 columns")
    record("client_errors has RLS on", bool(row["rls"]), "relrowsecurity")
except Exception as e:
    record("client_errors exists, 6 columns", False, str(e))
    record("client_errors has RLS on", False, str(e))

try:
    pols = sql("""
        select policyname, cmd, roles::text as roles
          from pg_policies where schemaname='public' and tablename='client_errors';
    """)
    ins = [p for p in pols if p["cmd"] == "INSERT" and "anon" in p["roles"]]
    reads = [p for p in pols
             if p["cmd"] in ("SELECT", "ALL")
             and ("anon" in p["roles"] or "authenticated" in p["roles"])]
    record("anonymous INSERT is allowed", bool(ins), ins[0]["policyname"] if ins else "no insert policy")
    record("anonymous READ is not allowed", not reads,
           "no read policy" if not reads else f"LEAK: {[p['policyname'] for p in reads]}")
except Exception as e:
    record("anonymous INSERT is allowed", False, str(e))
    record("anonymous READ is not allowed", False, str(e))

# ── 2. live behaviour: the beacon's own path, as an anonymous user ─────────
marker = "gate0-probe-" + uuid.uuid4().hex[:8]

status, _ = http("POST", "/rest/v1/client_errors", url, key, {
    "error_type": "Gate0Probe",
    "message": marker,
    "page": "/gate0-check",
    "user_agent": "check-gate0.sh",
    "url": "https://www.sottotitoli.pro/gate0-check",
})
record("anonymous INSERT over HTTP", status in (200, 201, 204), f"HTTP {status}")

status, body = http("GET", f"/rest/v1/client_errors?message=eq.{marker}", url, key)
leaked = status == 200 and body.strip() not in ("", "[]")
record("anonymous READ is blocked", not leaked, f"HTTP {status}, {'LEAKED A ROW' if leaked else 'no rows'}")

status, _ = http("DELETE", f"/rest/v1/client_errors?message=eq.{marker}", url, key)
try:
    still = sql(f"select count(*) as n from public.client_errors where message = '{marker}';")[0]["n"]
except Exception:
    still = -1
record("anonymous DELETE is blocked", still == 1, f"row survived delete (count={still})")

# ── 3. funnel view exists, is correct, and is unreachable publicly ─────────
try:
    n = sql("""
        select count(*) as n from information_schema.views
         where table_schema='internal' and table_name='funnel_daily';
    """)[0]["n"]
    record("internal.funnel_daily exists", n == 1, f"{n} view")
except Exception as e:
    record("internal.funnel_daily exists", False, str(e))

try:
    days = sql("select count(*) as n from internal.funnel_daily;")[0]["n"]
    record("funnel returns a 90-day series", days >= 90, f"{days} rows")
except Exception as e:
    record("funnel returns a 90-day series", False, str(e))

try:
    # Self-validating: the view must agree with the table it derives from.
    pair = sql("""
        select (select sum(signups) from internal.funnel_daily) as v,
               (select count(*) from public.profiles
                 where created_at::date >= current_date - interval '90 days') as t;
    """)[0]
    record("funnel matches source table", int(pair["v"] or 0) == int(pair["t"]),
           f"view={pair['v']} table={pair['t']}")
except Exception as e:
    record("funnel matches source table", False, str(e))

status, _ = http("GET", "/rest/v1/funnel_daily", url, key)
record("funnel is NOT exposed over HTTP", status != 200, f"HTTP {status}")

# ── 4. cleanup, then prove cleanup worked ──────────────────────────────────
try:
    sql(f"delete from public.client_errors where message = '{marker}';")
    left = sql("select count(*) as n from public.client_errors where error_type='Gate0Probe';")[0]["n"]
    record("probe rows cleaned up", left == 0, f"{left} left")
except Exception as e:
    record("probe rows cleaned up", False, str(e))

failed = [r for r in results if not r[1]]
print("  " + "-" * 74)
print(f"  {len(results) - len(failed)}/{len(results)} checks passed")
if failed:
    print("\n  FAILED:")
    for name, _, detail in failed:
        print(f"    - {name}: {detail}")
    sys.exit(1)
print("  Gate 0 is ON: failures are recorded, readable by nobody, and the funnel is private.")
sys.exit(0)
PY
