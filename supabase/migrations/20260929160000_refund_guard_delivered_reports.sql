-- ════════════════════════════════════════════════════════════════════════════
--  Refund guard: do not refund a report that was actually DELIVERED
-- ════════════════════════════════════════════════════════════════════════════
--  CONTEXT
--  20260929140000 bounded refund_report_credits by the original charge, which
--  removed unlimited self-minting. One bounded hole remained: the function never
--  checked whether a report was DELIVERED, so a user could charge 6, receive the
--  report, then refund the same reference — one free report per real charge.
--
--  WHY A NEW COLUMN
--  ai_report_requests had no link back to the charge: it stores tokens_spent but
--  not the reference. The client already generates one reference per charge and
--  uses it for both calls:
--      var chargeRef = 'report_' + presetKey + '_' + Date.now();
--      deduct_tokens(...,          p_reference: chargeRef)
--      refund_report_credits(...,  p_reference: chargeRef)
--  Persisting that reference on the request lets the refund ask one question:
--  does a request carrying this reference exist AND have status='completed'?
--
--  THE RULE — three states, only one refuses
--    completed              -> REFUSE. The user has the report.
--    queued / failed / etc. -> allow. No report was produced.
--    NO REQUEST ROW AT ALL   -> allow. This is the enqueue-failure case, where the
--                              insert itself never happened, so no report could
--                              exist. Must keep working: it is a primary reason
--                              this function exists (see 20260927120000).
--
--  SEQUENCING
--  Applying this is safe before the frontend ships: with charge_reference NULL on
--  every existing row, the EXISTS matches nothing and behaviour is unchanged. The
--  protection simply starts once the frontend populates the column. Deploying in
--  the other order would give no protection at all, which is why the column and
--  the frontend change go first.
--
--  PREREQUISITE — verified before writing this, not assumed
--  ai_report_requests has NO update and NO delete policy, and no update/delete
--  grant to `authenticated`. Only the service-role worker can change `status`, so
--  status is trustworthy input. If a client could set its own request to 'failed',
--  this guard would be bypassable and would be worth nothing.
--    (live policies: INSERT "Enable insert for authenticated users only",
--     INSERT "Users insert own requests", SELECT "Users read own requests")
-- ════════════════════════════════════════════════════════════════════════════

alter table public.ai_report_requests
  add column if not exists charge_reference text;
create index if not exists ai_report_requests_charge_ref_idx
  on public.ai_report_requests (user_id, charge_reference);
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
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return jsonb_build_object('success', false, 'error', 'not authorized');
  end if;

  -- ── Bound 1: refund at most what was actually charged under this reference ──
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

  -- ── Bound 2: a report that WAS delivered is not refundable ──
  -- Permissive when no row matches (NULL charge_reference on older rows, or an
  -- enqueue that never happened) — absence of evidence is not evidence of delivery.
  if exists (
    select 1
    from ai_report_requests r
    where r.user_id = p_user_id
      and r.charge_reference = p_reference
      and r.status = 'completed'
  ) then
    return jsonb_build_object('success', false, 'error', 'report already delivered',
                              'reference', p_reference);
  end if;

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
  'Re-credits report credits when no report was delivered. Two bounds: (1) at most the original deduct_tokens charge for the same reference — p_amount is a request, not the truth; (2) refused outright if a request carrying that charge_reference reached status=completed. Idempotent per p_reference. Full refund, no admin fee (policy 2026-09-27).';
