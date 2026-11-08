# AI Report Processing Edge Function

## Overview
This Edge Function processes AI report requests by:
1. Fetching pending requests from `ai_report_requests`
2. Loading session transcripts and module details
3. Using module-specific prompts from `prompts.ts`
4. Calling OpenAI API (gpt-4) with sophisticated assessment prompts
5. Storing results in `session_ai_reports` with status tracking

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in to Supabase: `supabase login`
- Project linked: `supabase link --project-ref qzqmuegbpmvqrjrlfbgk`

### Environment Variables (Already Set)
✅ `OPENAI_API_KEY` - Set in dashboard (21 May 2026)
✅ `SUPABASE_URL` - Auto-injected by Supabase
✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected (SUPABASE_SECRET_KEYS)

### Deploy Command
```bash
cd /path/to/sottotitoli
supabase functions deploy process-ai-reports --no-verify-jwt --use-api --project-ref qzqmuegbpmvqrjrlfbgk
```

⚠️ **`--no-verify-jwt` is REQUIRED, not a relaxation.** This function is invoked by
the cron with only an `x-s8t-cron` header (no Bearer JWT). With gateway JWT
verification on, every cron run is rejected before the function runs and all
report generation stops silently. Authentication is enforced **inside** the
function instead (`isService` = `x-s8t-cron` matches `CRON_SECRET`, fail-closed if
the secret is empty; non-service callers must pass a valid user token and can only
touch their own requests). Do NOT remove the flag to "harden" it — that re-enables
the gateway and kills the cron. `--use-api` bundles server-side so the `esm.sh`
import resolves the same way in CI as it does in production.

### Test Deployment
```bash
curl -L -X POST \
  'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports' \
  -H 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --data '{"test":true}'
```

## Module Prompts

> ⚠️ **The authoritative module list is `prompts.ts`** (`MODULE_PROMPTS`), not this
> README. Resolved ids are `0`–`14`; module **15 = Synthesis Report** (profile-driven,
> added 2026-09-29). The list below is legacy and out of date.

### Cambridge Modules (IDs 3-9)
- **3**: Fluency & Coherence - Rate of speech, hesitations, logical organization
- **4**: Grammar & Accuracy - Grammatical structures, verb tenses, accuracy
- **5**: Pronunciation - Intelligibility, stress patterns, problem sounds
- **6**: Vocabulary Range - Lexical variety, collocations, topic-specific vocabulary
- **7**: Formal Register - Professional communication, business correspondence
- **8**: Presentation Skills - Clarity, audience engagement, structure
- **9**: Academic Register - Research presentations, academic discourse

### Business Modules (IDs 10-11)
- **10**: Critical Thinking - Argumentation, evidence evaluation
- **11**: Discourse Markers - Cohesive devices, logical connectors

### Academic Modules (IDs 12-13)
- **12**: Complexity Metrics - Lexical density, syntactic complexity
- **13**: Error Analysis - Systematic error patterns, fossilization

### Linguistic Analysis (IDs 14-16)
- **14**: Interaction Patterns - Turn-taking, backchanneling, collaboration
- **15**: Pragmatic Competence - Appropriateness, politeness, implicature
- **16**: Narrative Structure - Orientation, complication, resolution

## Architecture

### Data Flow
1. Frontend (`analysis.html`) → `requestReport(moduleId)` → inserts to `ai_report_requests` (status='pending')
2. Edge Function (scheduled/triggered) → fetches pending requests
3. For each request:
   - Load session transcript & module details
   - Get module-specific prompts via `getModulePrompt(moduleId, transcript)`
   - Call OpenAI API with system/user prompts
   - Insert result to `session_ai_reports` (status='done', summary_text, tokens_used)
   - Update request status to 'completed'
4. Frontend polls `session_ai_reports` for the row whose `request_id` matches its
   own request, and displays it when `status = 'completed'`

### Database Schema

#### `ai_report_requests`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `session_ids` (uuid[]) — the sessions analysed; `{}` for profile-driven reports
  (there is no singular `session_id` column)
- `module_key` (text) — the report product id, as text
- `scope_type` (text) — single_session | selected_sessions | last_7_days | last_30_days.
  Enforced by a live-only CHECK constraint that existed in no migration; see
  `supabase/schema-live.sql`
- `status` (text) — queued | processing | completed | failed
- `tokens_spent` (int) — model tokens consumed. 0 until the worker runs, then the
  real count. This is NOT a credit amount — see `credits_charged`. It used to
  carry the price so a failure knew how much to give back, which made the column
  mean two things at once and made the refund read a token count for any request
  that had already completed
- `credits_charged` (int) — the credits taken for this request. The refund path
  reads the LEDGER, not this; this is the record, and the backfill came from the
  ledger too (migration 20260929230000)
- `charge_reference` (text) — ties the request to its charge, so a refund can tell
  "nothing was delivered" from "the report was delivered". It is also the
  reference the refund is FILED UNDER: `refund_report_credits` refunds at most
  what was charged under the same reference, and at most once
- `context` (jsonb) — the assembled learner profile, for profile-driven reports
- `report_markdown` (text), `input_snapshot` (jsonb), `prompt_key` (text),
  `prompt_version` (text), `report_json` (jsonb)

## The worker verifies payment (20260929230000)

The charge is taken by the CLIENT and was never checked by the server, while
`ai_report_requests` accepts an INSERT from any signed-in user for their own row.
Three of the five frontend enqueue sites deducted nothing at all. So a signed-in
user could insert a request for any module and have it generated for free, and
`retryReport` handed out a free report while its dialog said the credits would be
deducted again.

The worker now refuses to process a request whose product costs anything unless
the LEDGER holds a matching charge, and it refuses a signed-in caller's attempt
to re-run a request that is not `queued`/`pending`. Free products (credits = 0)
pass without a charge.

Two consequences worth remembering:

1. A refund is bounded twice — by the ledger amount and by the RPC's own
   per-reference cap. Passing `'report_refund:<request id>'` (as this used to)
   pointed at a reference no charge was recorded under, so the refund silently
   returned "no matching charge" and failed reports kept the user's credits. A
   business-rule refusal arrives as a normal response, not an RPC error, so it
   must be logged or it is invisible.
2. `input_snapshot` used to be `profileCtx.slice(0, 2000)`, which is shorter than
   a typical payload: the record stopped part-way through the client's own data
   and never contained the server-added `interpreted_profile`. It is now the whole
   context as jsonb, so `input_snapshot ? 'interpreted_profile'` answers the one
   question the snapshot exists for.
- `family_key` (text) — vestigial, unused, kept only because dropping it is a
  separate decision
- `error_message` (text), `created_at` (timestamptz), `completed_at` (timestamptz)

#### `session_ai_reports`
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions, **nullable**) — NULL for profile-driven
  (synthesis) reports; the plural `session_ids` covers multi-session ones
- `session_ids` (uuid[])
- `request_id` (uuid, FK → ai_report_requests, nullable) — links a report to the
  request that produced it so a client polls for ITS report instead of the newest
  completed one. NULL for reports generated before migration 20260929180000
- `user_id` (uuid, FK → auth.users)
- `module_id` (int, FK → report_products) — read this FK as "the product id"
- `status` (text) — queued | processing | completed | failed
- `summary` / `summary_text` (text) — for synthesis, this IS the full report text
- `raw_json` (jsonb) — full OpenAI response
- `confidence`, `overall_score` (numeric) — CONFIDENCE parsed out of the response
- `created_at`, `updated_at` (timestamptz)

#### `report_products`
The single source of truth for what reports exist. One row = one promise = one
prompt id = one price.
- `id` (bigint, PK) — this is the `MODULE_PROMPTS` key in `prompts.ts`
- `product_key` (text, unique) — stable slug the frontend binds its UI cards to
  (`comprehensive`, `fluency`, `vocabulary`, `pronunciation`, `discourse`, `synthesis`)
- `label` (text), `description` (text), `default_rule` (text)
- `credits` (int) — price in AI report credits. NOTE: these are `token_transactions`
  / `user_tokens` credits, NOT the transcription minutes in
  `credit_transactions` / `user_credits`. The two ledgers must never be mixed
- `basis` (text) — sessions | both | grammatica
- `is_active` (bool) — whether the product is offered in the UI. Inactive rows stay
  valid targets so they can be re-enabled by flipping one boolean
- `sort_order` (int)

This replaced `ai_report_modules` (renamed), `ai_report_families` (dropped) and
`ai_configs.preset_pricing` (dropped — no code had ever read it).

Run `scripts/check-report-catalogue.sh` after touching this table or `prompts.ts`.
It exits non-zero if the catalogue, the prompts, and the UI cards disagree.

## Testing End-to-End

### 1. Create Test Request
```sql
-- In Supabase SQL Editor
INSERT INTO ai_report_requests (session_id, module_id, status)
SELECT id, 3, 'pending'
FROM sessions
WHERE transcript_text IS NOT NULL
LIMIT 1;
```

### 2. Trigger Edge Function
```bash
# Manual invocation
curl -L -X POST \
  'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports' \
  -H 'Authorization: Bearer [YOUR_ANON_KEY]'
```

### 3. Check Results
```sql
-- Verify report was created
SELECT * FROM session_ai_reports ORDER BY created_at DESC LIMIT 1;

-- Check request status
SELECT * FROM ai_report_requests ORDER BY created_at DESC LIMIT 1;
```

### 4. Frontend Test
1. Navigate to `/analysis.html`
2. Select a session with transcript
3. Click "Genera report" on Fluency & Coherence module
4. Wait for polling to detect status='done'
5. Verify report displays
6. Click "Scarica report" to download

## Troubleshooting

### Issue: Function not processing requests
- Check Edge Function logs in Supabase dashboard
- Verify OPENAI_API_KEY is set correctly
- Ensure RLS policies allow service role to insert into `session_ai_reports`

### Issue: Frontend not showing reports
- Check browser console for errors
- Verify polling is running: `pollReportStatus()` every 3 seconds
- Confirm `session_ai_reports` has matching session_id and module_id
- Check RLS policy allows user to read their own reports

### Issue: OpenAI API errors
- Verify API key is valid and has credits
- Check token limits (currently set to max_completion_tokens: 800)
- Review OpenAI API status

## Next Steps

1. **Deploy Function**: Run deployment command above
2. **Schedule Processing**: Set up cron job or database trigger to invoke function automatically
3. **Monitor Usage**: Track OpenAI token consumption and costs
4. **UI Polish**: Add Italian translations, loading states, error handling
5. **Token Display**: Show token usage in frontend for transparency
6. **Batch Processing**: Optimize for multiple concurrent requests
7. **Caching**: Consider caching reports to avoid re-generation

## File Structure
```
supabase/functions/process-ai-reports/
├── index.ts        # Main Edge Function handler
├── prompts.ts      # 14 module-specific prompt definitions
└── README.md       # This file
```

## Commit History
- feat(backend): add Supabase Edge Function for AI report processing
- feat(backend): create 14 module-specific prompts for AI analysis
- feat(backend): integrate module-specific prompts into Edge Function
