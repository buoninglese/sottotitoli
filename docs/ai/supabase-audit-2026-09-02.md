# Supabase Schema Audit — 2026-09-02

Method: probed the **live** database through PostgREST (`/rest/v1/`) with the anon
key — table existence (`select=*&limit=0`) and per-column presence
(`select=<col>&limit=0`, 400 = column missing). Compared against
`supabase/supabase_setup.sql`, `supabase/migrations/`, and every table/column the
frontend (`js/*.js`) and edge functions (`supabase/functions/*/index.ts`) use.

## TL;DR
- All 33 tables used by the app exist on live. ✅
- **Traduzione rooms are broken**: infinite RLS recursion on `rooms`,
  `room_members`, `room_invites`, `transcript_segments`.
- **Report AI was half-broken**: live tables use `module_key` (text), not
  `module_id`, and `session_ai_reports` has no `request_id`. Multiple code paths
  were failing with 400s.
- `supabase/supabase_setup.sql` was stale — now aligned to live.

---

## 1. RLS infinite recursion — Traduzione rooms (LIVE BREAKAGE)

Any query on `rooms`, `room_members`, `room_invites`, `transcript_segments`
returns `400 infinite recursion detected in policy`.

Cycle:
```
rooms SELECT policy  → EXISTS(SELECT FROM room_members …)   ← room_members RLS fires
room_members ALL     → EXISTS(SELECT FROM rooms …)          ← rooms SELECT RLS fires → …
room_invites ALL     → EXISTS(SELECT FROM rooms …)          → …
transcript_segments  → EXISTS(SELECT FROM room_members …)   → …
```

**Fix shipped:** `supabase/migrations/20260902_fix_rooms_rls_recursion.sql` —
SECURITY DEFINER helpers (`is_room_member`, `is_room_owner`,
`can_contribute_to_room`) that bypass RLS internally; all policies rewritten to
use them. Same row-level semantics.

**⚠️ Must be applied to live:** `supabase db push` or paste into SQL editor.

---

## 2. Report AI schema drift (LIVE BREAKAGE, code fixed)

### Live columns (verified)
| table | live has | live does NOT have |
|---|---|---|
| `ai_report_requests` | id, user_id, `module_key`, family_key, session_ids, scope_type, status, created_at, completed_at, error_message, prompt_version | module_id, processed_at, updated_at, raw_json, credits_used |
| `session_ai_reports` | id, user_id, module_id, session_id, summary, summary_text, overall_score, confidence, strengths, issues, recommendations, status, error_message, provider, model, created_at, updated_at, raw_json, prompt_version | request_id, family_key, module_key |

### Fixed in code (this commit)
1. `js/panoramica.js` — `requestSnapshot` and `requestFullReport` sent
   `module_id` → 400. Removed; `module_key` ('0'/'1') is the live column the
   edge function parses.
2. `supabase/functions/process-ai-reports/index.ts` — inserted
   `session_ai_reports.request_id` → **reports were never saved**. Removed.
   ⚠️ Requires re-deploy: `supabase functions deploy process-ai-reports`.
3. `js/panoramica-reportai-myreports.js` — `retryReport` updated/deleted by
   `request_id` (wrong linkage AND missing column). Rewritten for live schema:
   reads the failed report row (`module_id`, `session_id`), inserts a fresh
   `ai_report_requests` row with `module_key = String(module_id)`, then deletes
   the failed report row by `id`.

### Verified OK (no action)
- `data-service.getAIReports` selects `module_id` from `session_ai_reports` → exists. ✅
- `user_ai_entitlements` has all columns the edge function writes (entitlement_key,
  period_type, uses_allowed, uses_consumed, is_active). ✅
- `credit_transactions` uses `amount_seconds` everywhere → exists. ✅
- `user_credits`, `user_tokens`, `token_transactions`, `user_preferences`,
  review/wordbank/learner tables → all exist. ✅

---

## 3. ai_configs — two competing schemas (⚠️ decision needed)

Live `ai_configs` is a **key/value store**: `id, config_key, config_value` only.
- `process-ai-reports` reads `config_key, config_value` → works on live. ✅
- `analyze-session` reads a **columnar schema** (`provider, model, prompt_version,
  system_prompt, user_prompt_template, output_schema, options, is_active`) →
  **broken on live** (400 on every column except id).

`analyze-session` looks like the newer AI-config feature path (sessions.ai_status /
`ai_last_error` DO exist on live). Decision needed:
1. Migrate `ai_configs` to the columnar schema (new migration) and re-deploy
   `analyze-session`, or
2. Keep key/value and rewrite `analyze-session` to read configs from
   `config_key/config_value` (like process-ai-reports does).

## 4. setup.sql staleness (fixed)

`supabase/supabase_setup.sql` described a schema that never matched production:
- `ai_report_requests`: declared `module_id` + `processed_at` → now `module_key`,
  `completed_at`, `error_message`, `prompt_version` (live truth).
- `session_ai_reports`: declared `request_id` → now `updated_at`, `raw_json`,
  `prompt_version` (live truth).

A fresh environment built from setup.sql now matches what the code expects.

---

## 5. Notes / remaining observations
- `sessions.starter_report` exists in an **archived** migration
  (`20260728_starter_report_column.sql`) and NOT on live. No live code uses it —
  left alone. (`onboarding_responses.starter_report_md` is a different, working
  feature.)
- `sessions.updated_at` does not exist on live; nothing in the code writes it.
- `vocabulary_entries`, `segment_translations`, `grammar_reports`,
  `contextual_messages`, `client_errors` — exist on live, unused by current
  frontend code (candidates for future cleanup).
- The OpenAPI schema endpoint requires a secret key — the audit was done with
  the publishable key via per-column probing.

## 6. Deploy checklist (requires Supabase credentials)
1. `supabase db push` (applies `20260902_fix_rooms_rls_recursion.sql`).
2. `supabase functions deploy process-ai-reports`.
