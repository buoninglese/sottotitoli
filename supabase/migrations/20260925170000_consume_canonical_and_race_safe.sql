-- Canonical re-assertion of consume_session_minutes + race safety + pool-only daily cap.
--
-- ══ WHY THIS FILE EXISTS ══════════════════════════════════════════════════════
-- 20260925140000 was edited IN PLACE after it had already been applied (the guard
-- and the daily cap were added by a later commit). The live function is therefore
-- correct — it was re-run manually — but the FILE no longer matches what the
-- ledger says was applied. That is exactly the divergence that makes a database
-- unreproducible from its migrations, so this migration re-asserts the canonical
-- state in a NEW file. 20260925140000 must never be edited again.
--
-- ══ WHAT CHANGES ══════════════════════════════════════════════════════════════
--   1. `for update` on the session row — closes a double-charge race.
--   2. The daily cap now applies ONLY when the charge comes out of a shared org
--      pool (see the long note at the cap itself).
--   3. tg_charge_session_on_end() re-asserted unchanged, so both halves of the
--      charging logic have one canonical home.
--
-- ══ THE RACE (why `for update`) ═══════════════════════════════════════════════
-- The idempotency check is `exists(marker)` followed by an insert, which is not
-- atomic, and credit_transactions.reference has NO unique constraint. Two
-- concurrent callers for the SAME session — typically the client's save racing
-- charge_session_on_end — can both pass the check and both charge. Taking a row
-- lock on the session serialises them: the second now sees the marker and returns
-- 'already charged'.
--
--   NOTE FOR FUTURE READERS: when this function is called from
--   charge_session_on_end (an AFTER UPDATE trigger on the very same row), the
--   calling transaction ALREADY holds this lock, so the FOR UPDATE is a no-op
--   there. It is NOT redundant — it is what blocks a concurrent CLIENT call. Do
--   not "optimise" it away.
--
-- Verified before writing: no duplicate `session:%` or `transcription:%` markers
-- exist, so the race has never actually fired in production.

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
  v_org      uuid;
  v_sess     record;
  v_elapsed  integer;
  v_target   integer;
  v_streamed integer := 0;
  v_charge_s integer;
  v_minutes  integer;
  v_daily    integer;
  v_new      integer;
  -- Per-user minutes per rolling 24h, applied to SHARED POOL spend only.
  c_daily_cap constant integer := 480;
begin
  if v_uid is null then
    return query select false, null::integer, 'not authenticated'::text; return;
  end if;

  -- A zero/negative claim must NEVER settle a session: it would write the
  -- idempotency marker while charging nothing, permanently making it free — and
  -- because that marker is what charge_session_on_end relies on, it would also
  -- disable the server-side backstop for the session. This guard must stay ABOVE
  -- the marker check; its position is as load-bearing as its presence.
  if p_seconds is null or p_seconds <= 0 then
    return query select false, null::integer, 'invalid duration'::text; return;
  end if;

  if p_session_id is null then
    return query select false, null::integer, 'session id required'::text; return;
  end if;

  -- Row lock: serialises concurrent callers for this session (see header).
  select id, user_id, created_at into v_sess
    from public.sessions where id = p_session_id
    for update;
  if not found or v_sess.user_id <> v_uid then
    return query select false, null::integer, 'unknown session'::text; return;
  end if;

  -- Resolved once: decides where the charge lands, and whether the cap applies.
  v_org := public.current_org_id();

  -- Already settled for this session → idempotent no-op.
  if exists (
    select 1 from public.credit_transactions
     where user_id = v_uid and reference = 'session:' || p_session_id::text
  ) then
    if v_org is not null then
      select coalesce(balance_minutes, 0) into v_new
        from public.organisation_credits where org_id = v_org;
    end if;
    if v_new is null then
      select coalesce(balance_minutes, 0) into v_new
        from public.user_credits where user_id = v_uid;
    end if;
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
    -- ══ Daily cap: ORG POOL ONLY ═════════════════════════════════════════════
    -- The cap exists to bound harm TO OTHERS — the "many tiny sessions" multiplier
    -- that lets one member drain a school's shared pool a minute at a time. On a
    -- personal balance there are no others: those minutes are the user's own
    -- purchased credit, so capping their daily use buys no security and creates a
    -- customer-visible ceiling. Premium sells 900 minutes; a 480 cap would block a
    -- €29,99 buyer mid-way through a study session and read as a scam.
    -- Therefore: only a charge that lands on a shared pool is rate-limited.
    if v_org is not null then
      select coalesce(sum(-amount_seconds) / 60, 0) into v_daily
        from public.credit_transactions
       where user_id = v_uid and type = 'session_usage'
         and created_at > now() - interval '24 hours';
      if (v_daily + v_minutes) > c_daily_cap then
        return query select false, null::integer, 'daily consumption limit reached'::text; return;
      end if;
    end if;

    v_new := public.charge_minutes(v_minutes, 'session:' || p_session_id::text);
    if v_new is null then
      return query select false, null::integer, 'no credits row'::text; return;
    end if;
  else
    -- Reached only when fully streamed (v_streamed >= v_target > 0): everything was
    -- already paid for as it streamed. Drop a zero marker so this session can never
    -- be billed again.
    insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
    values (v_uid, 'session_usage', 0,
            coalesce((select balance_minutes from public.organisation_credits where org_id = v_org),
                     (select balance_minutes from public.user_credits where user_id = v_uid), 0) * 60,
            'session:' || p_session_id::text);

    if v_org is not null then
      select coalesce(balance_minutes, 0) into v_new
        from public.organisation_credits where org_id = v_org;
    end if;
    if v_new is null then
      select coalesce(balance_minutes, 0) into v_new
        from public.user_credits where user_id = v_uid;
    end if;
  end if;

  return query select true, v_new, 'ok'::text;
end;
$$;
-- ── Server-side charge when a session ends (re-asserted, unchanged) ───────────
-- Nothing used to charge on finalisation: consume_session_minutes() was only ever
-- invoked by real-mic.js, so a crafted client could simply never call it. This is
-- the backstop — the charge no longer depends on the client choosing to ask.
--
--   billable = least(server_elapsed, client_duration  if > 0, else server_elapsed)
--
-- The client's duration_seconds EXCLUDES paused time; server elapsed INCLUDES it.
-- Charging elapsed outright would bill people for thinking, so an honest client
-- pays its own pause-excluded duration, while a client that omits or zeroes the
-- duration falls back to server elapsed and cannot escape by silence.
create or replace function public.tg_charge_session_on_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_server integer;
  v_client integer;
  v_secs   integer;
begin
  -- Only the user-speaking session types are billable. Unknown (null) types still
  -- charge, so a new type cannot silently become free.
  if new.session_type is not null and new.session_type not in ('caption','solo') then
    return new;
  end if;

  v_server := greatest(0, extract(epoch from (least(new.ended_at, now()) - new.created_at))::integer);
  v_client := coalesce(new.duration_seconds, 0);
  v_secs   := least(v_server, case when v_client > 0 then v_client else v_server end);

  if v_secs > 0 then
    -- Match the client's established rounding exactly — floor to whole minutes,
    -- minimum 1 — then hand a whole-minute value to consume (whose ceil is then a
    -- no-op). Raw seconds would round UP and bill more than the normal path.
    v_secs := greatest(1, floor(v_secs / 60.0)::integer) * 60;
    begin
      perform public.consume_session_minutes(v_secs, new.id);
    exception when others then
      raise warning 'charge_session_on_end skipped for %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;
drop trigger if exists charge_session_on_end on public.sessions;
create trigger charge_session_on_end
  after update on public.sessions
  for each row
  when (old.ended_at is null and new.ended_at is not null)
  execute function public.tg_charge_session_on_end();
revoke all on function public.consume_session_minutes(integer, uuid) from public, anon;
grant execute on function public.consume_session_minutes(integer, uuid) to authenticated;
-- Verify after applying:
--   select pg_get_functiondef('public.consume_session_minutes(integer, uuid)'::regprocedure)
--     like '%for update%';                                  -- t
--   select pg_get_functiondef('public.consume_session_minutes(integer, uuid)'::regprocedure)
--     like '%invalid duration%';                             -- t
--   select pg_get_functiondef('public.consume_session_minutes(integer, uuid)'::regprocedure)
--     like '%v_org is not null%';                            -- t
--   select tgname from pg_trigger where tgname = 'charge_session_on_end';  -- present
--
-- Behavioural (as an authenticated user, rolled back):
--   select * from public.consume_session_minutes(0, '<own-session>');   -- NOT ok
--   -- balance unchanged AND the session must still be billable:
--   update public.sessions set ended_at = now(), duration_seconds = 600 where id = '<own>';
--   select * from public.credit_transactions where reference = 'session:<own>';  -- charged
--
-- Concurrency (two sessions in parallel should NOT double-charge):
--   select reference, count(*) from public.credit_transactions
--    where reference like 'session:%' group by 1 having count(*) > 1;  -- no rows;
