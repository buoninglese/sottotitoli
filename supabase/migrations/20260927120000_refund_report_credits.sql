-- ════════════════════════════════════════════════════════════════════════════
--  refund_report_credits — give report credits back when no report was delivered
-- ════════════════════════════════════════════════════════════════════════════
--  WHY THIS EXISTS
--  A report is charged UP FRONT (deduct_tokens, at enqueue), but the work happens
--  asynchronously and can fail. Two real paths were losing the user's money:
--
--    1. The enqueue INSERT fails AFTER the deduction. This is not hypothetical:
--       js/panoramica-reportai.js sent scope_type='multi_session', which is not in
--       ai_report_requests_scope_type_check, so choosing 2+ sessions failed
--       deterministically — and the code returned without refunding.
--    2. process-ai-reports marks the request 'failed' (index.ts ~line 166) and
--       never refunds.
--
--  deduct_tokens cannot undo itself: it rejects p_amount <= 0 ('Invalid amount')
--  and hardcodes type='report_usage'. Crediting therefore needs its own function.
--
--  WHY A DB FUNCTION AND NOT A CLIENT-SIDE UPDATE
--  Crediting is two writes — the balance and the ledger. From JS, a failure
--  between them leaves a balance that contradicts its own history. As one function
--  it fully applies or does not apply, and it is testable inside a rolled-back
--  transaction (the same technique reverse_purchase was verified with).
--
--  IDEMPOTENT BY p_reference. Callers may retry freely: the client retries on a
--  flaky network, and process-ai-reports can run twice for one request because the
--  cron re-picks anything still 'queued'/'pending'. A repeat call with the same
--  reference returns already_refunded and touches nothing. That is also what makes
--  it safe for BOTH the client and the worker to attempt the same refund.
--
--  POLICY (agreed 2026-09-27): a failed report is re-credited IN FULL, with NO
--  administrative fee. No payment processor is touched when an internal balance is
--  restored, so there is no cost to pass on; charging for our own failure is an
--  unfair-terms risk under the Codice del Consumo and would contradict the FAQ.
--  A processor fee is withheld only on a *money* refund under the 14-day policy,
--  where it genuinely is not returned — that is Stripe-side and lives in
--  reverse_purchase, NOT here.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.refund_report_credits(
  p_user_id   uuid,
  p_amount    integer,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance  integer;
  v_existing integer;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid amount');
  end if;

  if p_reference is null or length(trim(p_reference)) = 0 then
    return jsonb_build_object('success', false, 'error', 'missing reference');
  end if;

  -- Only the caller (or service_role, whose auth.uid() is null) may credit.
  -- Same guard as deduct_tokens, so a client cannot mint credits for another user.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return jsonb_build_object('success', false, 'error', 'not authorized');
  end if;

  -- Idempotency: at most one refund per reference.
  select count(*) into v_existing
  from token_transactions
  where user_id = p_user_id
    and reference = p_reference
    and type = 'refund';

  if v_existing > 0 then
    return jsonb_build_object('success', true, 'already_refunded', true);
  end if;

  -- Lock the row so a concurrent deduction cannot interleave with this credit.
  select balance into v_balance
  from user_tokens
  where user_id = p_user_id
  for update;

  if not found then
    insert into user_tokens (user_id, balance, lifetime_tokens)
    values (p_user_id, p_amount, 0)
    returning balance into v_balance;
  else
    update user_tokens
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user_id
    returning balance into v_balance;
  end if;

  insert into token_transactions (user_id, amount, type, reference, balance_after)
  values (p_user_id, p_amount, 'refund', p_reference, v_balance);

  return jsonb_build_object('success', true, 'balance', v_balance, 'refunded', p_amount);
end;
$$;
revoke execute on function public.refund_report_credits(uuid, integer, text) from public, anon;
grant  execute on function public.refund_report_credits(uuid, integer, text) to authenticated, service_role;
comment on function public.refund_report_credits(uuid, integer, text) is
  'Re-credits report credits when no report was delivered. Idempotent per p_reference. Full refund, no admin fee (policy 2026-09-27).';
