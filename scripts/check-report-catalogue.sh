#!/usr/bin/env bash
# Check the report catalogue for the drift that has repeatedly shipped.
#
# Background
# ----------
# Five separate places used to encode "what reports exist", and none agreed:
#
#   1. public.ai_report_families      family taxonomy          -> DELETED
#   2. public.ai_report_modules       ids + labels             -> renamed
#   3. ai_configs.preset_pricing      prices, read by NOBODY   -> DELETED
#   4. MODULE_PROMPTS in prompts.ts   what can be generated
#   5. PRESET_MAP / cards in the UI   what the user is sold
#
# There is now one table, public.report_products. This script enforces that it
# stays the only one, and that it stays in step with (4) and (5).
#
# What it checks
#   A. prompts.ts declares each id exactly once. JS object literals are last-wins
#      and tsc does not flag TS1117 on the esbuild/Deno deploy path, so a
#      duplicated id is a silent behaviour change with no build error.
#   B. Every report_products row has a prompt. getModulePrompt() throws otherwise,
#      and the user has already been charged by then.
#   C. Every prompt has a row. session_ai_reports.module_id references
#      report_products(id), so a report whose module has no row cannot be stored.
#   D. The superseded sources are actually gone.
#   E. The UI's radio cards are exactly the active 'sessions' products. This is
#      the check that mattered most: "CEFR Extravaganza" (4cr, promising an A1–C2
#      lexicon split) was pointed at the Pronunciation prompt, and no single layer
#      could see it. Only a cross-layer check catches that.
#
# Usage:  ./scripts/check-report-catalogue.sh
# Exits 1 on any mismatch, so it can gate a deploy.

set -euo pipefail

cd "$(dirname "$0")/.."

PROMPTS="supabase/functions/process-ai-reports/prompts.ts"
INDEX_TS="supabase/functions/process-ai-reports/index.ts"
CONTEXT_JS="../sottotitoli/js/grammar-report-context.js"
UI_HTML="../sottotitoli/panoramica.html"

# The migration that defines the learner eraser. The function is redefined whole
# each time, so the newest definition is the live one.
PURGE_SQL=$(grep -l "create or replace function public.purge_learner_input" supabase/migrations/*.sql 2>/dev/null | sort | tail -1)

[ -f "$PROMPTS" ] || { echo "missing $PROMPTS"; exit 1; }

# ── Prompt ids declared in prompts.ts, in file order ────────────────────────
# Top-level keys of the MODULE_PROMPTS literal. Tolerate any leading indent:
# an earlier version pinned this to exactly two spaces and silently missed id 14,
# which is indented with three — reporting a false "no prompt" and hiding the
# real defect underneath. Never make a scanner depend on formatting.
PROMPT_IDS=$(grep -oE '^[[:space:]]+[0-9]+: \{' "$PROMPTS" | grep -oE '[0-9]+' | sort -n | tr '\n' ' ')
PROMPT_DUPES=$(grep -oE '^[[:space:]]+[0-9]+: \{' "$PROMPTS" | grep -oE '[0-9]+' | sort -n | uniq -d | tr '\n' ' ')

# ── UI cards: the value of each reportType radio ────────────────────────────
if [ -f "$UI_HTML" ]; then
  UI_KEYS=$(grep -oE 'name="reportType"[^>]*value="[a-zA-Z_]+"' "$UI_HTML" \
            | grep -oE 'value="[a-zA-Z_]+"' | sed 's/value="//;s/"//' | sort | tr '\n' ' ')
else
  UI_KEYS="__UI_NOT_FOUND__"
fi

# ── Live catalogue ──────────────────────────────────────────────────────────
SQL="$(mktemp)"
trap 'rm -f "$SQL"' EXIT
cat > "$SQL" <<'SQL'
select jsonb_build_object(
  'products', coalesce((
     select jsonb_agg(jsonb_build_object(
              'id', p.id, 'key', p.product_key, 'label', p.label,
              'credits', p.credits, 'basis', p.basis, 'is_active', p.is_active)
            order by p.sort_order, p.id)
     from public.report_products p), '[]'::jsonb),
  'legacy_tables', coalesce((
     select jsonb_agg(t.table_name)
     from information_schema.tables t
     where t.table_schema = 'public'
       and t.table_name in ('ai_report_modules', 'ai_report_families')), '[]'::jsonb),
  'preset_pricing', (
     select count(*) from public.ai_configs where config_key = 'preset_pricing')
) as r;
SQL

CATALOGUE=$(supabase db query -f "$SQL" --linked 2>/dev/null | python3 -c '
import json,sys
t=sys.stdin.read(); i=t.find("{")
if i < 0: sys.exit("db query returned no JSON")
o,_=json.JSONDecoder().raw_decode(t[i:])
print(json.dumps(o["rows"][0]["r"]))')

# ── Payload check: content, not pattern ────────────────────────────────────
# The python checks below read source code. They cannot see what the builder
# actually produces, and content is what leaves the machine.
PAYLOAD_ERR=""
if command -v node >/dev/null 2>&1; then
  if ! PAYLOAD_OUT=$(node scripts/check-report-context-payload.js 2>&1); then
    PAYLOAD_ERR=$(printf '%s\n' "$PAYLOAD_OUT" | head -8)
  fi
fi

# ── Prose-strip check: the server-side control, executed ───────────────────
# The synthesis context reaches the model through process-ai-reports, which
# strips learner free text from it. A structural scan of that file would only
# confirm the stripper is mentioned; this runs it.
STRIP_ERR=""
if command -v node >/dev/null 2>&1; then
  if ! STRIP_OUT=$(node scripts/check-synthesis-prose-strip.js 2>&1); then
    STRIP_ERR=$(printf '%s\n' "$STRIP_OUT" | head -8)
  fi
fi

PROMPT_IDS="$PROMPT_IDS" PROMPT_DUPES="$PROMPT_DUPES" UI_KEYS="$UI_KEYS" CATALOGUE="$CATALOGUE" \
PROMPTS_FILE="$PROMPTS" INDEX_TS="$INDEX_TS" CONTEXT_JS="$CONTEXT_JS" \
PAYLOAD_ERR="$PAYLOAD_ERR" PURGE_SQL="$PURGE_SQL" STRIP_ERR="$STRIP_ERR" python3 <<'PY'
import json, os, re, pathlib

prompt_ids = {int(x) for x in os.environ["PROMPT_IDS"].split()}
dupes      = [int(x) for x in os.environ["PROMPT_DUPES"].split()]
ui_keys    = set(os.environ["UI_KEYS"].split())
cat        = json.loads(os.environ["CATALOGUE"])

products = cat["products"]
by_id    = {p["id"]: p for p in products}
active   = [p for p in products if p["is_active"]]
sessions = {p["key"] for p in active if p["basis"] == "sessions"}

print("── prompts.ts declares ──")
print("  " + (", ".join(str(i) for i in sorted(prompt_ids)) or "(none)"))
print("── report_products ──")
for p in products:
    flag = "ACTIVE " if p["is_active"] else "       "
    print(f"  {flag}{p['id']:>2}  {p['key']:<26} {p['credits']}cr  {p['basis']:<10} {p['label']}")

problems = []

# A. Duplicate keys in the literal: JS is last-wins, so the first is dead code
#    and a wrong winner silently changes what a paid product receives.
if dupes:
    problems.append(
        "duplicate prompt ids " + ", ".join(str(d) for d in dupes)
        + " in MODULE_PROMPTS — JS object literals are last-wins, so the earlier\n"
          "     declaration is dead and the later one is served, with no build error.")

# B. Catalogue row with no prompt -> permanent failure, after the charge.
for pid in sorted(set(by_id) - prompt_ids):
    p = by_id[pid]
    problems.append(
        f"report_products {pid} ({p['key']}, {p['label']}) has no prompt;\n"
        f"     getModulePrompt({pid}) throws and the request fails after the charge")

# C. Prompt with no catalogue row -> the report cannot be stored (FK).
for pid in sorted(prompt_ids - set(by_id)):
    problems.append(
        f"prompt {pid} has no report_products row;\n"
        f"     session_ai_reports.module_id references report_products(id), so the\n"
        f"     completed report cannot be stored")

# D. The superseded sources must be gone.
if cat["legacy_tables"]:
    problems.append("superseded table(s) still present: " + ", ".join(cat["legacy_tables"])
                    + "\n     report_products is meant to be the single source of truth")
if cat["preset_pricing"]:
    problems.append("ai_configs still has a 'preset_pricing' row;\n"
                    "     prices belong in report_products.credits and nowhere else")

# E. The UI cards must be exactly the active session products.
if "__UI_NOT_FOUND__" in ui_keys:
    problems.append("could not find panoramica.html to check the UI cards")
else:
    for k in sorted(ui_keys - sessions):
        hit = next((p for p in products if p["key"] == k), None)
        if hit and not hit["is_active"]:
            problems.append(f"UI offers '{k}' ({hit['label']}) but it is is_active=false")
        elif hit:
            problems.append(f"UI offers '{k}' but its basis is '{hit['basis']}', not 'sessions'")
        else:
            problems.append(f"UI offers '{k}', which is not a report_products key at all")
    for k in sorted(sessions - ui_keys):
        problems.append(f"'{k}' is an active session product but has no UI card")

# ── F. Privacy invariants ────────────────────────────────────────────────
#
# The prompt context is sent to OpenAI. Three things must stay true, and none of
# them is visible from any single file: which columns are read, which modules may
# receive the context, and that the synthesis payload passes a filtered object
# rather than raw onboarding.
index_src  = pathlib.Path(os.environ["INDEX_TS"]).read_text()
prompts_src = pathlib.Path(os.environ["PROMPTS_FILE"]).read_text()
ctx_src    = pathlib.Path(os.environ["CONTEXT_JS"]).read_text() \
    if os.path.exists(os.environ["CONTEXT_JS"]) else ""

# Strip comments before scanning. A scanner that reads prose as code will both
# miss real defects and invent fake ones: this check first reported prompt 14 as
# accepting profileCtx (the comment block belonging to 15 sits inside 14's slice)
# and then flagged its own explanatory comment as a `raw:` passthrough. The same
# class of mistake as pinning the indentation in the id scan — the check is only
# as good as its parsing.
def strip_comments(src: str) -> str:
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return "\n".join(ln for ln in src.split("\n") if not ln.strip().startswith("//"))

# F1. No identity columns may be selected into the prompt context. A learner's
#     name is not needed to analyse their grammar.
#
#     Every profiles select is checked, not the first one: index.ts reads
#     profiles twice, and the earlier version of this check inspected the
#     report-language select instead of the context select, so it passed no
#     matter what the context select contained. A check that cannot fail is
#     worse than no check.
IDENTITY = {'full_name', 'location', 'bio_summary', 'email', 'display_name', 'avatar_url'}
sels = re.findall(r"\.from\('profiles'\)\s*\n?\s*\.select\('([^']*)'\)", index_src)
if not sels:
    problems.append("could not find any profiles select in index.ts — "
                    "privacy invariant F1 cannot be verified any more")
else:
    for s in sels:
        leaked = sorted({c.strip() for c in s.split(',')} & IDENTITY)
        if leaked:
            problems.append(
                "index.ts selects identifying column(s) into the context sent to OpenAI: "
                + ", ".join(leaked)
                + "\n     A report does not need the learner's name; the model is told to"
                  " address them as 'you'.")

# F2. The allow-list must equal the prompts that actually accept a profileCtx
#     argument, minus synthesis (whose entire input IS the learner profile).
#     Otherwise the transfer is decided by a function signature.
syn = re.search(r'SYNTHESIS_MODULE_ID\s*=\s*(\d+)', index_src)
syn_id = int(syn.group(1)) if syn else -1
allow = re.search(r'PROFILE_CONTEXT_MODULES\s*=\s*new Set<number>\(\[([^\]]*)\]\)', index_src)
allowed = {int(x) for x in re.findall(r'\d+', allow.group(1))} if allow else set()
code_src = strip_comments(prompts_src)
lines = code_src.split("\n")
headers = []
for i, ln in enumerate(lines):
    h = re.match(r'^\s*(\d+):\s*\{', ln)
    if h:
        headers.append((int(h.group(1)), i))
accepts = set()
for j, (pid, i) in enumerate(headers):
    end = headers[j + 1][1] if j + 1 < len(headers) else len(lines)
    if 'profileCtx' in "\n".join(lines[i:end]):
        accepts.add(pid)
expected = accepts - {syn_id}
if allowed != expected:
    problems.append(
        "PROFILE_CONTEXT_MODULES in index.ts is "
        + (", ".join(str(x) for x in sorted(allowed)) or "empty")
        + " but the prompts that accept a profileCtx argument are "
        + (", ".join(str(x) for x in sorted(expected)) or "none") + "\n"
          "     Which modules receive learner context must be a decision, not a"
          " function signature.")

# F3. The synthesis context must be a filtered allow-list, not raw onboarding.
#     onboarding.intake_transcript is a spoken self-introduction and in practice
#     carries a name, a job and a city.
if ctx_src and re.search(r'\braw\s*:', strip_comments(ctx_src)):
    problems.append(
        "grammar-report-context.js passes a `raw` object into the payload sent to"
        " OpenAI\n     onboarding.raw contains intake_transcript (a self-introduction)."
        " Send an allow-list instead.")

# F4. What the builder actually produces, run for real with a named profile.
payload_err = os.environ.get("PAYLOAD_ERR", "").strip()
if payload_err:
    problems.append("synthesis payload check failed:\n"
                    + "\n".join("     " + l for l in payload_err.split("\n")))

# F9. The server-side stripper, run against the shipped source rather than
#     described. If it cannot be executed the check reports a failure, not a
#     pass: an unverified privacy control is the thing this script exists to
#     prevent.
strip_err = os.environ.get("STRIP_ERR", "").strip()
if strip_err:
    problems.append("prose-strip check failed:\n"
                    + "\n".join("     " + l for l in strip_err.split("\n")))

# F5/F6. The prose stays, and the name never travels.
#
# extract-learner-profile is the ONLY thing allowed to read the onboarding prose.
# Every other consumer reads the structured interpretation. That is the whole
# design, and it is exactly the kind of thing that erodes: the previous
# starter-report sent the transcripts verbatim, and its reasoning ("they are the
# richest signal") was sound at the time.
#
# Comments are stripped first. Both files legitimately *mention* these tokens in
# comments explaining their removal, and a check that reads prose as code invents
# failures — which this script already did once today.
CONSUMERS = {
  'process-ai-reports': 'supabase/functions/process-ai-reports/index.ts',
  'starter-report': 'supabase/functions/starter-report/index.ts',
}
IDENTITY_TOKENS = ['full_name', 'user_metadata', 'bio_summary', 'location']
PROSE_TOKENS = [
  'intake_conversation_transcript', 'ai_objectives_conversation_transcript',
  'shortterm_transcript', 'short_term_goal', 'long_term_goal', 'difficulties_other',
]

for label, rel in CONSUMERS.items():
    p = pathlib.Path(rel)
    if not p.exists():
        problems.append(f"{label}: missing at {rel} — privacy invariants F5/F6 cannot be verified")
        continue
    code = strip_comments(p.read_text())
    # A denylist names what it forbids. Scanning for those names without
    # excluding the list itself reports the removal as the crime — which is the
    # same shape of mistake as reading a comment as code, and it fired here the
    # moment PROSE_KEYS was introduced.
    code = re.sub(r'const PROSE_KEYS\s*=\s*new Set<string>\(\[.*?\]\);', '', code, flags=re.S)
    hit_id = [t for t in IDENTITY_TOKENS if t in code]
    hit_prose = [t for t in PROSE_TOKENS if t in code]
    if hit_id:
        problems.append(
            f"{label} references identity field(s) {', '.join(hit_id)} outside comments;\n"
              "     the prompt addresses the learner as 'you' and never names them")
    if hit_prose:
        problems.append(
            f"{label} reads onboarding prose ({', '.join(hit_prose)});\n"
              "     prose is interpreted once by extract-learner-profile and does not travel")

# F7. The client-side synthesis builder must not carry prose either, and it is
#     where the leak actually lived. mapOnboarding kept `goal` (from
#     short_term_goal) on the reasoning that the learner wrote it about their
#     learning rather than about themselves. That reasoning was not good enough:
#     it is still the learner's own words, it is a column the eraser deletes, and
#     grammar-report.js reads the object out of localStorage and puts it in the
#     prompt — so a learner who had just purged would still have sent it.
CLIENT_PROSE_TOKENS = PROSE_TOKENS + [
  'intake_transcript', 'longterm_transcript', 'why_english_other', 'profession_other',
  'native_lang_other', 'spoken_languages_other', 'improve_languages_other',
  'heard_from_other', 'goal',
]
if ctx_src:
    ctx_code = strip_comments(ctx_src)
    hit = [t for t in CLIENT_PROSE_TOKENS
           if re.search(r'\b' + re.escape(t) + r'\b', ctx_code)]
    if hit:
        problems.append(
            "grammar-report-context.js carries learner prose (" + ', '.join(hit) + ")\n"
            "     into the synthesis payload; goals must arrive as structured facts from\n"
            "     learner_profile_extractions, merged server-side")

# F8. The fields a prompt refuses to carry must equal the columns the eraser
#     deletes. If those drift, one of the two promises is false: either we delete
#     text we still send, or we keep text we call private. Neither is visible
#     from inside either file — only the comparison is.
ALLOWED_NOT_COLUMNS = {
  # Payload-side keys, not columns: the client's onboarding object names the
  # spoken transcripts without the `_conversation` suffix, and `goal` is the
  # payload key for short_term_goal.
  'goal', 'intake_transcript', 'longterm_transcript',
}
prose_keys = set()
prose_keys_ok = True
m_keys = re.search(r'const PROSE_KEYS\s*=\s*new Set<string>\(\[(.*?)\]\);',
                   pathlib.Path(os.environ["INDEX_TS"]).read_text(), re.S)
if not m_keys:
    problems.append("F8 cannot be verified: PROSE_KEYS not found in process-ai-reports/index.ts")
    prose_keys_ok = False
else:
    prose_keys = {k.lower() for k in re.findall(r"'([a-z_][a-z0-9_]*)'", m_keys.group(1))}

purge_sql = os.environ.get("PURGE_SQL", "").strip()
if not purge_sql or not pathlib.Path(purge_sql).exists():
    problems.append("F8 cannot be verified: no migration defines purge_learner_input()")
else:
    sql = strip_comments(pathlib.Path(purge_sql).read_text())
    nulled, missing_stmt = set(), []
    for table in ('onboarding_responses', 'profiles'):
        mm = re.search(r'update\s+public\.' + table + r'\s+set\s+(.*?);', sql, re.S | re.I)
        if not mm:
            missing_stmt.append(table)
            continue
        nulled |= {c.lower() for c in re.findall(r'([a-z_][a-z0-9_]*)\s*=\s*null',
                                                 mm.group(1), re.I)}
    if missing_stmt:
        problems.append("F8 cannot be verified: the purge no longer updates "
                        + ', '.join(missing_stmt) + " — its column set is unknown")
    if prose_keys_ok and nulled:
        deleted_but_sent = nulled - prose_keys
        listed_but_kept = prose_keys - nulled - ALLOWED_NOT_COLUMNS
        if deleted_but_sent:
            problems.append(
                "the purge deletes column(s) that prompts do not refuse to send: "
                + ', '.join(sorted(deleted_but_sent)) + "\n"
                "     add them to PROSE_KEYS or the eraser and the prompts disagree")
        if listed_but_kept:
            problems.append(
                "PROSE_KEYS lists field(s) the purge does not delete: "
                + ', '.join(sorted(listed_but_kept)) + "\n"
                "     either the purge must clear them, or they are not prose")

print()
if problems:
    print(f"✗ {len(problems)} catalogue problem(s):\n")
    for i, p in enumerate(problems, 1):
        print(f"  {i}. {p}\n")
    raise SystemExit(1)

print(f"✓ one source of truth: {len(active)} active products, UI and prompts agree")
PY
