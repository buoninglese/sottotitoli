-- ════════════════════════════════════════════════════════════════════════════
--  reverse_purchase — atomically reverse a Stripe purchase grant on refund
-- ════════════════════════════════════════════════════════════════════════════
--  Called by the stripe-webhook edge function on `refund.created`.
--
--  WHY A DB FUNCTION RATHER THAN JAVASCRIPT
--  The reversal touches five things: the minutes balance, the minutes ledger, the
--  report-credit balance, the credits ledger, and the cumulative-partial maths.
--  Done as separate PostgREST calls from the edge function, a failure halfway
--  leaves minutes deducted but credits not, and no ledger row — a silent drift.
--  As one function it is atomic: it fully applies or it does not apply at all.
--  It is also testable inside a rolled-back transaction, which is the only reason
--  the arithmetic below could be verified before it was ever used in anger.
--
--  WHAT IS NOT REVERSED (deliberate):
--    * the signup bonus — not part of what was bought;
--    * referral bonuses (ref_… / ref_referred_…) — a separate reward.
--  Only the type='purchase' row for this session is considered, and only its
--  proportional share is clawed back.
--
--  ⚠️ CLAMPING AT ZERO means a user who SPENDS the minutes and then refunds keeps
--  the usage. That is a small refund-fraud vector, accepted deliberately: refusing
--  refunds would be worse. The shortfall is RETURNED rather than swallowed, so the
--  caller can log it and it stays visible.
--
--  ACCESS: service_role only. A normal user must never be able to reverse a grant.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.reverse_purchase(
  p_session_ref text,
  p_refund_id   text,
  p_fraction    numeric,
  p_reason      text default null
)
returns table(
  ok                boolean,
  new_minutes       integer,
  new_tokens        integer,
  reversed_seconds  integer,
  reversed_tokens   integer,
  shortfall_minutes integer,
  shortfall_tokens  integer,
  reason            text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref         text;
  v_grant       record;
  v_token_grant integer := 0;
  v_target_s    integer;
  v_target_t    integer;
  v_already_s   integer := 0;
  v_already_t   integer := 0;
  v_delta_s     integer := 0;
  v_delta_t     integer := 0;
  v_cur_min     integer := 0;
  v_cur_tok     integer := 0;
  v_new_min     integer;
  v_new_tok     integer;
  v_claw_min    integer := 0;
  v_short_min   integer := 0;
  v_short_tok   integer := 0;
begin
  if p_session_ref is null or p_refund_id is null then
    return query select false, null::integer, null::integer, 0, 0, 0, 0, 'missing identifiers'::text;
    return;
  end if;

  if p_fraction is null or p_fraction <= 0 or p_fraction > 1 then
    return query select false, null::integer, null::integer, 0, 0, 0, 0, 'invalid fraction'::text;
    return;
  end if;

  -- Unique per refund (idempotency) AND scoped per session (so the cumulative
  -- maths below can find earlier partials for the same purchase).
  v_ref := 'refund:' || p_session_ref || ':' || p_refund_id;

  if exists (select 1 from public.credit_transactions where reference = v_ref) then
    return query select false, null::integer, null::integer, 0, 0, 0, 0, 'already reversed'::text;
    return;
  end if;

  -- The original purchase grant. Purchases only — see the header.
  select ct.user_id, ct.amount_seconds into v_grant
    from public.credit_transactions ct
   where ct.reference = p_session_ref
     and ct.type = 'purchase'
   limit 1;

  if not found or v_grant.user_id is null then
    return query select false, null::integer, null::integer, 0, 0, 0, 0, 'no grant'::text;
    return;
  end if;

  select coalesce(tt.amount, 0) into v_token_grant
    from public.token_transactions tt
   where tt.reference = p_session_ref
     and tt.type = 'purchase'
   limit 1;
  v_token_grant := coalesce(v_token_grant, 0);

  -- Target clawback for this fraction, MINUS what earlier partials already took.
  -- Deducting each partial's share from a shrinking balance would drift: the
  -- second 50% of a half-refunded purchase would take 50% of what was left.
  v_target_s := round(coalesce(v_grant.amount_seconds, 0) * p_fraction)::integer;
  select coalesce(sum(abs(amount_seconds)), 0) into v_already_s
    from public.credit_transactions
   where reference like 'refund:' || p_session_ref || ':%';
  v_delta_s := greatest(0, v_target_s - coalesce(v_already_s, 0));

  v_target_t := round(v_token_grant * p_fraction)::integer;
  select coalesce(sum(abs(amount)), 0) into v_already_t
    from public.token_transactions
   where reference like 'refund:' || p_session_ref || ':%';
  v_delta_t := greatest(0, v_target_t - coalesce(v_already_t, 0));

  if v_delta_s = 0 and v_delta_t = 0 then
    return query select false, null::integer, null::integer, 0, 0, 0, 0, 'at target'::text;
    return;
  end if;

  -- ── Minutes ──
  if v_delta_s > 0 then
    select coalesce(balance_minutes, 0) into v_cur_min
      from public.user_credits where user_id = v_grant.user_id;
    v_cur_min   := coalesce(v_cur_min, 0);
    v_claw_min  := ceil(v_delta_s / 60.0)::integer;
    v_new_min   := greatest(0, v_cur_min - v_claw_min);
    v_short_min := greatest(0, v_claw_min - v_cur_min);

    update public.user_credits
       set balance_minutes = v_new_min,
           balance_seconds = v_new_min * 60,
           updated_at      = now()
     where user_id = v_grant.user_id;

    insert into public.credit_transactions (user_id, amount_seconds, type, reference, balance_after)
    values (v_grant.user_id, -v_delta_s, 'refund', v_ref, v_new_min * 60);
  else
    select coalesce(balance_minutes, 0) into v_new_min
      from public.user_credits where user_id = v_grant.user_id;
  end if;

  -- ── Report credits ──
  if v_delta_t > 0 then
    select balance into v_cur_tok
      from public.user_tokens where user_id = v_grant.user_id;

    if not found then
      -- No tokens row to deduct from: record no token reversal rather than
      -- invent a row and a ledger entry that never happened.
      v_delta_t := 0;
      v_new_tok := null;
    else
      v_cur_tok   := coalesce(v_cur_tok, 0);
      v_new_tok   := greatest(0, v_cur_tok - v_delta_t);
      v_short_tok := greatest(0, v_delta_t - v_cur_tok);

      update public.user_tokens
         set balance = v_new_tok,
             updated_at = now()
       where user_id = v_grant.user_id;

      insert into public.token_transactions (user_id, amount, type, reference, description, balance_after)
      values (v_grant.user_id, -v_delta_t, 'refund', v_ref,
              coalesce(p_reason, 'Storno acquisto — rimborso Stripe'), v_new_tok);
    end if;
  else
    select balance into v_new_tok
      from public.user_tokens where user_id = v_grant.user_id;
  end if;

  return query select true, v_new_min, v_new_tok, v_delta_s, v_delta_t,
                      v_short_min, v_short_tok, 'ok'::text;
end;
$$;
-- Service role only — a normal user must never be able to reverse a grant.
revoke all on function public.reverse_purchase(text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.reverse_purchase(text, text, numeric, text)
  to service_role;
-- ════════════════════════════════════════════════════════════════════════════
--  SELF-CHECK — run this to confirm the maths, in a rolled-back transaction so
--  nothing is changed. Replace the session reference with your own purchase.
--
--  begin;
--    -- 60 min / 5 credits bought for €4.99
--    select * from public.reverse_purchase('<cs_live_...>', 're_check_full', 1.0);
--    -- expect: ok=t, reversed_seconds=3600, reversed_tokens=5, new_minutes = old-60
--    select * from public.reverse_purchase('<cs_live_...>', 're_check_dup', 1.0);
--    -- expect: ok=f, 'already reversed'  (idempotent)
--  rollback;
--
--  Partial cumulative — 50% then another 50% must total 100%, not 75%:
--  begin;
--    select * from public.reverse_purchase('<cs_live_...>', 're_p1', 0.5);
--    -- expect reversed_seconds = 1800
--    select * from public.reverse_purchase('<cs_live_...>', 're_p2', 1.0);
--    -- expect reversed_seconds = 1800  (the DELTA, not another 3600)
--  rollback;
-- ════════════════════════════════════════════════════════════════════════════;
