-- ════════════════════════════════════════════════════════════════════════════
--  HARDEN refund_report_credits — a user could mint themselves credits
-- ════════════════════════════════════════════════════════════════════════════
--  THE HOLE (found 2026-09-29, proven inside a rolled-back transaction)
--
--  refund_report_credits is SECURITY DEFINER and granted to `authenticated`, and
--  p_amount came straight from the client with no upper bound. The only guard
--  asked WHOSE balance was being credited:
--
--      if auth.uid() is not null and auth.uid() <> p_user_id then
--        return jsonb_build_object('success', false, 'error', 'not authorized');
--
--  That correctly refuses crediting ANOTHER user — but says nothing about HOW
--  MUCH. Measured as an authenticated user, own uid, invented reference:
--
--      select refund_report_credits(<own uid>, 999999, 'probe-self-1');
--      -> {"success": true, "refunded": 999999, "balance": 1000967}   (was 968)
--
--  Cross-user was refused; self-minting was unlimited. Report credits drive
--  OpenAI spend, so this is real money. It does not touch other users' balances:
--  it is the mirror of the consume_session_minutes griefing hole, which drained a
--  shared pool. That one asked "how much" and got hardened; this one did not.
--
--  THE FIX
--
--  A refund is bounded by the CHARGE, not by a number the client supplies. The
--  frontend already threads one reference through both calls:
--
--      var chargeRef = 'report_' + presetKey + '_' + Date.now();
--      deduct_tokens(...,          p_reference: chargeRef)
--      refund_report_credits(...,  p_reference: chargeRef)
--
--  and deduct_tokens writes a token_transactions row (type='report_usage', negative
--  amount) carrying that reference — verified in the live ledger, e.g.
--  `report_usage | -2 | report_homework_1790543857248`. So:
--
--    1. look up the original charge for (user_id, reference);
--    2. no charge found  -> refuse: there is nothing to give back;
--    3. refund at most what was charged — p_amount becomes a request, not the truth.
--
--  Result: a user recovers what they actually paid, and only once. The ownership
--  guard, the per-reference idempotency check, the row lock and the full-refund
--  policy are all unchanged.
--
--  KNOWN RESIDUAL (deliberately NOT fixed here, tracked as a follow-up): nothing
--  checks that a report was never delivered, so a user who *received* a report can
--  still refund its charge once. Closing that needs a charge reference on
--  ai_report_requests so the refund can join to the request's status. Bounded and
--  small compared to unlimited minting, which is what this migration removes.
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
  v_charged  bigint;
  v_refund   integer;
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

  -- ── The bound that was missing ──
  -- Refund is limited to what was actually charged under this reference. Without
  -- this, p_amount was the only input and any positive integer was accepted.
  select coalesce(sum(-amount), 0) into v_charged
  from token_transactions
  where user_id   = p_user_id
    and reference = p_reference
    and type      = 'report_usage'
    and amount    < 0;

  if v_charged <= 0 then
    return jsonb_build_object('success', false, 'error', 'no matching charge',
                              'reference', p_reference);
  end if;

  -- Never more than was charged, and never more than was asked for. In practice
  -- the caller passes exactly the charge amount, so this is a no-op on the happy
  -- path and a hard ceiling on every other one.
  v_refund := least(p_amount::bigint, v_charged)::integer;

  -- Idempotency: at most one refund per reference.
  select count(*) into v_existing
  from token_transactions
  where user_id   = p_user_id
    and reference = p_reference
    and type      = 'refund';

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
    values (p_user_id, v_refund, 0)
    returning balance into v_balance;
  else
    update user_tokens
    set balance = balance + v_refund, updated_at = now()
    where user_id = p_user_id
    returning balance into v_balance;
  end if;

  insert into token_transactions (user_id, amount, type, reference, balance_after)
  values (p_user_id, v_refund, 'refund', p_reference, v_balance);

  return jsonb_build_object('success', true, 'balance', v_balance,
                            'refunded', v_refund, 'requested', p_amount);
end;
$$;
revoke execute on function public.refund_report_credits(uuid, integer, text) from public, anon;
grant  execute on function public.refund_report_credits(uuid, integer, text) to authenticated, service_role;
comment on function public.refund_report_credits(uuid, integer, text) is
  'Re-credits report credits when no report was delivered. Bounded by the original deduct_tokens charge for the same reference: p_amount is a request, not the truth. Idempotent per p_reference. Full refund, no admin fee (policy 2026-09-27).';
