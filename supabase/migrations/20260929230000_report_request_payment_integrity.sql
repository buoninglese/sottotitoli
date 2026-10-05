-- Payment integrity for AI report requests.
--
-- THE PROBLEM
-- -----------
-- Charging was done entirely by the CLIENT (a `deduct_tokens` call in the
-- browser) and never verified by the server. The client then inserted its own
-- `ai_report_requests` row, and the cron worker generated whatever it found with
-- status 'queued'. So the charge was advisory: the worker had no idea whether a
-- request had been paid for.
--
-- Three of the five enqueue sites in the frontend charged nothing at all:
--   * js/panoramica.js `requestFullReport`  — module 1, 3 credits, no charge
--   * js/panoramica-reportai-myreports.js `retryReport` — inserts a request while
--     its own dialog says "I crediti verranno dedotti nuovamente", and deducts
--     nothing
--   * (js/panoramica.js `requestSnapshot` is module 0, which is free by design)
--
-- And because `ai_report_requests` grants INSERT to `authenticated` with only
-- `auth.uid() = user_id` as the check — which is correct and necessary, since the
-- client does the insert — any signed-in user could insert a request for any
-- module directly and have it generated for free.
--
-- The fix is server-side: the worker now requires a matching charge in the
-- ledger before it will process a request whose product costs anything. The
-- client is no longer trusted to have paid.
--
-- WHY THE COLUMN
-- --------------
-- The refund path read `request.tokens_spent` as the amount to refund, because
-- the client wrote the credit price into it at enqueue. But the worker OVERWRITES
-- `tokens_spent` with the real token count on success. So for a request that had
-- already completed, that column held a token count — and refunding it would have
-- credited thousands. Worse, `tokens_spent` is a client-supplied value on a
-- client-inserted row, so a user could set it to anything and mint credits by
-- making processing fail.
--
-- `credits_charged` records what was actually taken, and is backfilled from the
-- LEDGER rather than from the request row, because the ledger is the only
-- trustworthy record. The worker refunds from the ledger too. `tokens_spent` now
-- means only what its name says: tokens, 0 until the model runs.
--
-- The refund reference was already `'report_refund:' || request.id`, which makes
-- it idempotent, so this change cannot introduce a double refund.

alter table public.ai_report_requests
  add column if not exists credits_charged integer not null default 0;
comment on column public.ai_report_requests.credits_charged is
  'Credits actually taken for this request, backfilled from token_transactions and maintained by the enqueue sites. The refund path uses this, never tokens_spent.';
comment on column public.ai_report_requests.tokens_spent is
  'Model tokens consumed. 0 until processing; NOT a credit amount — credits live in credits_charged.';
-- ── Backfill from the ledger, the only record of what was really charged ────
update public.ai_report_requests r
   set credits_charged = coalesce((
         select abs(t.amount)
           from public.token_transactions t
          where t.reference  = r.charge_reference
            and t.type       = 'report_usage'
            and t.user_id    = r.user_id
          order by t.created_at desc
          limit 1), 0)
 where r.charge_reference is not null
   and r.credits_charged = 0;
alter table public.ai_report_requests
  drop constraint if exists ai_report_requests_credits_charged_check;
alter table public.ai_report_requests
  add constraint ai_report_requests_credits_charged_check check (credits_charged >= 0);
-- ── Privilege reduction ────────────────────────────────────────────────────
-- Supabase's ALTER DEFAULT PRIVILEGES grants ALL on new public tables, so anon
-- and authenticated hold UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER here as well
-- as the INSERT/SELECT the app actually uses. There is no UPDATE or DELETE
-- policy, so those grants are unusable today — which makes them free surface for
-- the day someone adds a policy. Revoke what is not used, keep what is:
--   authenticated: INSERT (the client enqueues) + SELECT (the client polls)
--   anon: nothing at all
revoke all on table public.ai_report_requests from anon;
revoke update, delete, truncate, references, trigger
  on table public.ai_report_requests from authenticated;
grant insert, select on table public.ai_report_requests to authenticated;
