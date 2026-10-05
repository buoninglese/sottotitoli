-- Harden consume_session_minutes against shared-pool griefing.
--
-- ══ THE HOLE ══════════════════════════════════════════════════════════════════
-- consume_session_minutes(p_seconds, p_session_id) is SECURITY DEFINER and granted
-- to `authenticated`, and for an org member it charges the SCHOOL POOL (via
-- charge_minutes -> organisation_credits). But:
--   * p_seconds was entirely client-supplied (only bounded to <= 86400);
--   * p_session_id was optional and never verified;
--   * the only net-off came from transcription_usage, which is written only on the
--     iOS streaming path — so the same session could be charged again and again.
-- Net: any active member could call it in a loop with an arbitrary duration and
-- zero the school's shared balance. Self-harm on a personal balance; damage to
-- others on a shared one.
--
-- ══ THE FIX ═══════════════════════════════════════════════════════════════════
--   * a session id is REQUIRED and must belong to the caller;
--   * the billable duration is capped by the session's server-side age
--     (sessions.created_at is server-set, so a client cannot inflate it);
--   * the save-time charge happens at most ONCE per session (a 'session:<id>'
--     ledger marker), so repeat calls are no-ops.

create or replace function public.consume_session_minutes(
  p_seconds integer,
  p_session_id uuid default null
)
returns table(ok boolean, new_balance_minutes integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_sess     record;
  v_elapsed  integer;
  v_target   integer;
  v_streamed integer := 0;
  v_charge_s integer;
  v_minutes  integer;
  v_new      integer;
begin
  if v_uid is null then
    return query select false, null::integer, 'not authenticated'::text; return;
  end if;

  if p_session_id is null then
    return query select false, null::integer, 'session id required'::text; return;
  end if;

  select id, user_id, created_at into v_sess
    from public.sessions where id = p_session_id;
  if not found or v_sess.user_id <> v_uid then
    return query select false, null::integer, 'unknown session'::text; return;
  end if;

  -- Already settled at save for this session → idempotent no-op.
  if exists (
    select 1 from public.credit_transactions
     where user_id = v_uid and reference = 'session:' || p_session_id::text
  ) then
    select coalesce(balance_minutes, 0) into v_new
      from public.user_credits where user_id = v_uid;
    return query select true, v_new, 'already charged'::text; return;
  end if;

  -- Cap the billable seconds by how long the session has actually existed on the
  -- server (created_at is not client-writable). +30s absorbs clock skew at save.
  v_elapsed := greatest(0, extract(epoch from (now() - v_sess.created_at))::integer) + 30;
  v_target  := least(greatest(coalesce(p_seconds, 0), 0), v_elapsed, 86400);

  -- Seconds already paid for as they streamed (the iOS transcription path).
  select coalesce(sum(seconds), 0) into v_streamed
    from public.transcription_usage
   where user_id = v_uid and session_id = p_session_id;

  v_charge_s := greatest(0, v_target - v_streamed);
  v_minutes  := ceil(v_charge_s / 60.0)::integer;

  if v_minutes > 0 then
    v_new := public.charge_minutes(v_minutes, 'session:' || p_session_id::text);
    if v_new is null then
      return query select false, null::integer, 'no credits row'::text; return;
    end if;
  else
    -- Fully streamed (or nothing billable): drop a zero marker so this session can
    -- never be billed again, then report the current balance.
    insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
    select v_uid, 'session_usage', 0, coalesce(balance_minutes, 0) * 60,
           'session:' || p_session_id::text
      from public.user_credits where user_id = v_uid;

    select coalesce(balance_minutes, 0) into v_new
      from public.user_credits where user_id = v_uid;
  end if;

  return query select true, v_new, 'ok'::text;
end;
$$;
revoke all on function public.consume_session_minutes(integer, uuid) from public, anon;
grant execute on function public.consume_session_minutes(integer, uuid) to authenticated;
-- Verify (rolled back), as an authenticated member:
--   select * from public.consume_session_minutes(600, '<own-session>');  -- charges
--   select * from public.consume_session_minutes(600, '<own-session>');  -- 'already charged'
--   select * from public.consume_session_minutes(600, gen_random_uuid()); -- 'unknown session'
--   select * from public.consume_session_minutes(600, null);              -- 'session id required';
