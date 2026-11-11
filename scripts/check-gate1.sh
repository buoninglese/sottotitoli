#!/usr/bin/env bash
# Gate 1 — can money be taken without goods being delivered, or goods delivered twice?
#
# Why this exists
# ---------------
# The Stripe integration is in LIVE mode (its own fallback price IDs are live
# prices), so a real test purchase is a real charge. This proves the same
# guarantees without charging anyone.
#
# How
# ---
# It deploys a TEMPORARY copy of the real webhook handler as
# `stripe-webhook-selftest`, changing exactly ONE line: where the signing secret
# comes from. Everything else — the grant logic, the idempotency claims, the
# refund guards — is byte-identical, and the script prints the diff to prove it.
# With a secret we know, we can forge events Stripe would otherwise sign.
#
# It then asserts the two things that can lose money:
#   * a replayed delivery must NOT grant a second time
#   * a refund that cannot be resolved must NOT claw back blindly
#
# The twin, its rows and its throwaway user are removed afterwards, including on
# failure.
#
# Exit codes: 0 all checks passed, 1 a check failed, 2 could not check.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

TWIN="stripe-webhook-selftest"
TWIN_DIR="supabase/functions/$TWIN"
cleanup_done=0
cleanup() {
  [ "$cleanup_done" = "1" ] && return
  cleanup_done=1
  rm -rf "$TWIN_DIR" 2>/dev/null
  supabase functions delete "$TWIN" --project-ref qzqmuegbpmvqrjrlfbgk --yes >/dev/null 2>&1
}
trap cleanup EXIT INT TERM

echo "Gate 1 — money path"
echo "  deploying temporary twin from the real handler…"

mkdir -p "$TWIN_DIR"
python3 - "$TWIN_DIR/index.ts" <<'PY'
import secrets, sys
src = open("supabase/functions/stripe-webhook/index.ts", encoding="utf-8").read()
secret = "gate1_" + secrets.token_hex(16)
old = "const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;"
new = f"const STRIPE_WEBHOOK_SECRET = '{secret}';"
if src.count(old) != 1:
    print("FAIL: could not find the secret line to substitute"); sys.exit(1)
open(sys.argv[1], "w").write(src.replace(old, new))
open("/tmp/gate1_secret.txt", "w").write(secret)
PY
if [ $? -ne 0 ]; then echo "FAIL: could not build the twin"; exit 2; fi

# Prove the twin is the real code, differing in exactly one line.
DIFF_LINES=$(diff supabase/functions/stripe-webhook/index.ts "$TWIN_DIR/index.ts" | grep -c '^[<>]')
if [ "$DIFF_LINES" != "2" ]; then
  echo "FAIL: twin differs by $DIFF_LINES lines, expected exactly 2 (one line replaced)"
  exit 2
fi
echo "  twin == real handler, differing in exactly 1 line (the secret source)"

supabase functions deploy "$TWIN" --no-verify-jwt --use-api >/dev/null 2>&1
if [ $? -ne 0 ]; then echo "FAIL: twin deploy failed"; exit 2; fi
echo "  twin deployed"

python3 - <<'PY'
import hashlib, hmac, json, os, subprocess, sys, tempfile, time, urllib.error, urllib.request, uuid

PROJECT = "qzqmuegbpmvqrjrlfbgk"
BASE = f"https://{PROJECT}.supabase.co"
SECRET = open("/tmp/gate1_secret.txt").read().strip()
results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name:<44} {detail}")


def service_key():
    out = subprocess.run(["supabase", "projects", "api-keys", "--project-ref", PROJECT],
                         capture_output=True, text=True)
    for line in out.stdout.splitlines():
        if line.strip().startswith("service_role"):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 2:
                return parts[1]
    raise RuntimeError("no service_role key")


KEY = service_key()


def sql(q):
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f:
        f.write(q); path = f.name
    try:
        out = subprocess.run(["supabase", "db", "query", "-f", path, "--linked"],
                             capture_output=True, text=True)
    finally:
        os.unlink(path)
    raw = out.stdout
    if "{" not in raw:
        raise RuntimeError((raw + out.stderr)[:200])
    return json.JSONDecoder().raw_decode(raw[raw.index("{"):])[0].get("rows", [])


def sign(payload, secret=SECRET, ts=None):
    ts = ts or int(time.time())
    mac = hmac.new(secret.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"t={ts},v1={mac}"


def post(path, payload, signature, with_key=True):
    headers = {"Content-Type": "application/json", "Stripe-Signature": signature}
    if with_key:
        headers["apikey"] = KEY
    req = urllib.request.Request(BASE + path, method="POST",
                                 data=payload.encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode()[:200]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def api(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body else None,
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"raw": e.read().decode()[:200]}


# ── throwaway user ─────────────────────────────────────────────────────────
email = f"gate1-{uuid.uuid4().hex[:10]}@example.com"
status, user = api("POST", "/auth/v1/admin/users",
                   {"email": email, "password": "Gate1-" + uuid.uuid4().hex, "email_confirm": True})
uid = user.get("id") or (user.get("user") or {}).get("id")
if status not in (200, 201) or not uid:
    print(f"FAIL: could not create throwaway user: {status} {str(user)[:150]}")
    sys.exit(2)
print(f"  throwaway user {uid[:8]}…")


def bal():
    """Current balances. Measured, never assumed: signup seeds them, so the only
    honest assertion is the DELTA the purchase causes."""
    c = sql(f"select coalesce((select balance_minutes from public.user_credits where user_id='{uid}'),0) as m;")[0]["m"]
    t = sql(f"select coalesce((select balance from public.user_tokens where user_id='{uid}'),0) as t;")[0]["t"]
    return int(c), int(t)


BASE_MIN, BASE_TOK = bal()
print(f"  signup seeded: {BASE_MIN} min, {BASE_TOK} tokens (the handler must ADD to this)")

session_id = "cs_test_gate1_" + uuid.uuid4().hex[:12]
pi_id = "pi_gate1_" + uuid.uuid4().hex[:12]


def completed_event():
    return json.dumps({
        "id": "evt_gate1_" + session_id, "type": "checkout.session.completed",
        "data": {"object": {
            "id": session_id, "object": "checkout.session", "amount_total": 900,
            "payment_intent": pi_id,
            "metadata": {"user_id": uid, "product": "sottotitoli_starter",
                         "credits_seconds": "3600", "tokens": "5"},
        }},
    })


try:
    # ── A. the DEPLOYED handler must refuse forged deliveries ─────────────
    s, _ = post("/functions/v1/stripe-webhook", "{}", "")
    record("live webhook rejects a missing signature", s == 400, f"HTTP {s}")
    s, _ = post("/functions/v1/stripe-webhook", "{}", "t=1,v1=deadbeef")
    record("live webhook rejects a bad signature", s == 401, f"HTTP {s}")

    # ── B. the twin (same logic, known secret) ────────────────────────────
    body = completed_event()
    s, _ = post(f"/functions/v1/stripe-webhook-selftest", body, sign(body, secret="wrong-secret"))
    record("twin rejects a signature from another secret", s == 401, f"HTTP {s}")

    s, txt = post("/functions/v1/stripe-webhook-selftest", body, sign(body))
    record("valid purchase event accepted", s == 200, f"HTTP {s}")

    row = sql(f"select count(*) n, coalesce(sum(amount_seconds),0) secs from credit_transactions "
              f"where reference='{session_id}' and type='purchase';")[0]
    record("exactly one purchase ledger row", row["n"] == 1 and int(row["secs"]) == 3600,
           f"{row['n']} row, {row['secs']}s")

    got_min, got_tok = bal()
    record("minutes granted: exactly +60", got_min == BASE_MIN + 60,
           f"{BASE_MIN} -> {got_min}")

    tok = sql(f"select count(*) n, coalesce(sum(amount),0) t from token_transactions "
              f"where reference='{session_id}';")[0]
    record("tokens granted: exactly +5",
           tok["n"] == 1 and int(tok["t"]) == 5 and got_tok == BASE_TOK + 5,
           f"{BASE_TOK} -> {got_tok}, {tok['n']} ledger row")

    # ── C. THE check: replaying the same delivery must change nothing ─────
    s, txt = post("/functions/v1/stripe-webhook-selftest", body, sign(body))
    row2 = sql(f"select count(*) n from credit_transactions where reference='{session_id}';")[0]
    r_min, r_tok = bal()
    record("replayed delivery grants NOTHING extra",
           s == 200 and row2["n"] == 1 and r_min == BASE_MIN + 60 and r_tok == BASE_TOK + 5,
           f"HTTP {s}, rows={row2['n']}, minutes={r_min}, tokens={r_tok}")

    # ── D. guards that must not act blindly ───────────────────────────────
    anon = json.dumps({"id": "evt_anon", "type": "checkout.session.completed",
                       "data": {"object": {"id": "cs_anon", "object": "checkout.session",
                                           "metadata": {"user_id": "anonymous", "credits_seconds": "3600"}}}})
    post("/functions/v1/stripe-webhook-selftest", anon, sign(anon))
    anonrows = sql("select count(*) n from credit_transactions where reference='cs_anon';")[0]
    record("a session with no user grants nothing", anonrows["n"] == 0, f"{anonrows['n']} rows")

    pending = json.dumps({"id": "evt_rf1", "type": "refund.created",
                          "data": {"object": {"id": "re_gate1_pending", "object": "refund",
                                              "status": "pending", "amount": 900,
                                              "payment_intent": pi_id}}})
    s, txt = post("/functions/v1/stripe-webhook-selftest", pending, sign(pending))
    record("pending refund does not claw back yet", "not settled" in txt or s == 200,
           f"HTTP {s} {txt[:60]}")
    p_min, _ = bal()
    record("balance untouched by a pending refund", p_min == BASE_MIN + 60,
           f"minutes={p_min}")

    unknown = json.dumps({"id": "evt_rf2", "type": "refund.updated",
                          "data": {"object": {"id": "re_gate1_unknown", "object": "refund",
                                              "status": "succeeded", "amount": 900,
                                              "payment_intent": "pi_does_not_exist_gate1"}}})
    s, txt = post("/functions/v1/stripe-webhook-selftest", unknown, sign(unknown))
    u_min, _ = bal()
    record("unresolvable refund does not guess",
           u_min == BASE_MIN + 60, f"HTTP {s}, minutes={u_min}")

    # ── E. the database locks the handler relies on ───────────────────────
    dup = sql(f"""
        do $$ begin
          insert into public.credit_transactions (user_id, amount_seconds, type, reference, balance_after)
          values ('{uid}', 3600, 'purchase', '{session_id}', 9999);
        exception when unique_violation then raise notice 'blocked';
        end $$;
        select count(*) n from public.credit_transactions where reference='{session_id}';
    """)[0]
    record("duplicate purchase reference is refused by the DB", dup["n"] == 1,
           f"{dup['n']} row after attempting a duplicate")

    # ── F. the atomic reversal used by the refund path ────────────────────
    rev = sql(f"select * from public.reverse_purchase('{session_id}', 're_gate1_full', 1.0, 'gate1 test');")[0]
    rev_min, _ = bal()
    record("full refund removes exactly what was bought",
           rev_min == BASE_MIN,
           f"{BASE_MIN + 60} -> {rev_min} (bought 60), ok={rev.get('ok')}")

    rev2 = sql(f"select * from public.reverse_purchase('{session_id}', 're_gate1_full', 1.0, 'gate1 test');")[0]
    rev2_min, _ = bal()
    record("reversing the same refund twice is a no-op",
           rev2_min == BASE_MIN,
           f"minutes={rev2_min}, second call ok={rev2.get('ok')}")

finally:
    # Remove every trace: ledger rows, balances, then the user itself.
    try:
        sql(f"delete from public.credit_transactions where user_id='{uid}';")
        sql(f"delete from public.token_transactions where user_id='{uid}';")
        sql(f"delete from public.user_credits where user_id='{uid}';")
        sql(f"delete from public.user_tokens where user_id='{uid}';")
        api("DELETE", f"/auth/v1/admin/users/{uid}")
        left = sql("select count(*) n from public.credit_transactions where user_id='%s';" % uid)[0]
        record("test data fully removed", left["n"] == 0, f"{left['n']} rows left")
    except Exception as e:
        record("test data fully removed", False, str(e)[:80])

failed = [r for r in results if not r[1]]
print("  " + "-" * 74)
print(f"  {len(results) - len(failed)}/{len(results)} checks passed")
if failed:
    print("\n  FAILED:")
    for n, _, d in failed:
        print(f"    - {n}: {d}")
    sys.exit(1)
print("  Money path holds: a replay grants nothing, and a refund needs a real grant.")
sys.exit(0)
PY
RC=$?
exit $RC
