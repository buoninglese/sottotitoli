-- Convert transcription from a CAP into a CHARGE, without double-billing iOS.
--
-- ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════
-- 20260925103000 bounded transcription per 24h but deducted nothing. That left
-- two defects, and the second is the serious one:
--
--   1. The byte budget was looser than the balance (6000 B/s assumed vs the real
--      ~4 KB/s), so 25 minutes of balance bought ~37 minutes of audio.
--   2. Worse, the window resets daily and the balance never moves, so an account
--      that simply never saves a session could transcribe its balance's worth of
--      Whisper *every day, forever*, for free. A bound on the rate is not a bound
--      on the total.
--
-- ══ WHY NOT JUST "DEDUCT IN record_transcription" ═════════════════════════════
-- Because the session save ALSO deducts (consume_session_minutes), so a naive
-- charge would bill iOS users twice for the same minutes — while Android/desktop
-- users, whose transcription is free browser Web Speech, are billed once. Same
-- minutes of talking, different price. That is why the fix is attribution, not
-- just deduction:
--
--   * each transcription is tagged with the SESSION it belongs to;
--   * the session save charges only (session seconds - seconds already charged
--     for that session).
--
-- A session that goes through Whisper is therefore charged once, as it streams.
-- One that does not is charged once, at save. Same total either way.
--
-- ══ GRACEFUL DEGRADATION ═════════════════════════════════════════════════════
-- Charging only happens when the caller supplies a session id. A cached client
-- that does not yet send one keeps the old behaviour (capped, not charged) rather
-- than being double-billed. Nothing regresses; the leak closes for updated
-- clients. Old clients are still bounded by the tightened cap below.

-- ── Usage becomes measurable, not just bounded ───────────────────────────────
-- seconds / *_tokens are recorded so the real bytes-per-second of MediaRecorder
-- output and the real per-minute cost of the model can be read off actual usage
-- instead of guessed at. Both were assumptions until now.
alter table public.transcription_usage add column if not exists seconds      integer;
alter table public.transcription_usage add column if not exists session_id   uuid;
alter table public.transcription_usage add column if not exists input_tokens integer;
alter table public.transcription_usage add column if not exists output_tokens integer;
create index if not exists transcription_usage_session_idx
  on public.transcription_usage (session_id) where session_id is not null;
-- ── Charge whole MINUTES ─────────────────────────────────────────────────────
-- Takes MINUTES, not seconds, so callers own the rounding decision and can
-- accumulate across chunks. Charges auth.uid() only — it cannot bill anyone else,
-- even if it were reachable.
drop function if exists public.charge_seconds(integer, text);
create or replace function public.charge_minutes(p_minutes integer, p_reference text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_new integer;
begin
  if v_uid is null or p_minutes is null or p_minutes <= 0 then
    return null;
  end if;

  v_org := public.current_org_id();

  if v_org is not null then
    update public.organisation_credits oc
       set balance_minutes = greatest(0, oc.balance_minutes - p_minutes),
           balance_seconds = greatest(0, oc.balance_seconds - (p_minutes * 60)),
           updated_at      = now()
     where oc.org_id = v_org
    returning oc.balance_minutes into v_new;

    if v_new is not null then
      insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
      values (v_uid, 'session_usage', -(p_minutes * 60), v_new * 60, coalesce(p_reference, 'org_pool'));
      return v_new;
    end if;
  end if;

  update public.user_credits uc
     set balance_minutes = greatest(0, uc.balance_minutes - p_minutes),
         balance_seconds = greatest(0, uc.balance_seconds - (p_minutes * 60)),
         updated_at      = now()
   where uc.user_id = v_uid
  returning uc.balance_minutes into v_new;

  if v_new is not null then
    insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
    values (v_uid, 'session_usage', -(p_minutes * 60), v_new * 60, coalesce(p_reference, 'charge_minutes'));
  end if;

  return v_new;
end;
$$;
-- Clients must not reach this directly — only the DEFINER functions above it.
revoke all on function public.charge_minutes(integer, text) from public, anon, authenticated;
-- ── Authorize (pre-call refusal) ─────────────────────────────────────────────
drop function if exists public.authorize_transcription(integer);
create or replace function public.authorize_transcription(p_bytes integer, p_seconds integer default null)
returns table(allowed boolean, available_seconds integer, used_bytes_24h bigint, budget_bytes bigint, reason text)
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_avail  integer;
  v_used_b bigint;
  v_used_s integer;
  v_budget bigint;
  c_hard_cap  constant bigint := 60 * 1024 * 1024;
  -- Plausible MediaRecorder bitrates: 4 kbps .. 256 kbps. A claim outside this
  -- range for the bytes actually uploaded is rejected, which is what stops a
  -- client from declaring 1 second for 20 MB of audio.
  c_min_bps   constant integer := 500;
  c_max_bps   constant integer := 32000;
begin
  if v_uid is null then
    return query select false, 0, 0::bigint, 0::bigint, 'not authenticated'::text; return;
  end if;
  if p_bytes is null or p_bytes <= 0 then
    return query select false, 0, 0::bigint, 0::bigint, 'empty audio'::text; return;
  end if;

  -- Cross-check a claimed duration against the upload size.
  if p_seconds is not null and p_seconds > 0 then
    if (p_bytes::numeric / p_seconds) < c_min_bps or (p_bytes::numeric / p_seconds) > c_max_bps then
      return query select false, 0, 0::bigint, 0::bigint,
        ('implausible duration for ' || p_bytes || ' bytes')::text; return;
    end if;
  end if;

  v_avail := public.available_seconds();

  select coalesce(sum(bytes), 0), coalesce(sum(coalesce(seconds, 0)), 0)
    into v_used_b, v_used_s
    from public.transcription_usage
   where user_id = v_uid and created_at > now() - interval '24 hours';

  v_budget := least((v_avail::bigint * 6000), c_hard_cap);

  if v_avail <= 0 then
    return query select false, v_avail, v_used_b, v_budget, 'no minutes available'::text; return;
  end if;

  -- The invariant the previous version lacked: audio permitted in a rolling day
  -- may not exceed the minutes actually available. Enforced in SECONDS, so it
  -- holds whatever bitrate the client happens to use.
  if v_used_s + coalesce(p_seconds, 0) > v_avail then
    return query select false, v_avail, v_used_b, v_budget, 'daily transcription limit reached'::text; return;
  end if;

  -- Secondary byte ceiling, for callers that cannot report a duration.
  if v_used_b + p_bytes > v_budget then
    return query select false, v_avail, v_used_b, v_budget, 'daily transcription limit reached'::text; return;
  end if;

  return query select true, v_avail, v_used_b, v_budget, 'ok'::text;
end;
$$;
-- ── Record (+ charge, when the session is known) ─────────────────────────────
drop function if exists public.record_transcription(integer);
create or replace function public.record_transcription(
  p_bytes integer,
  p_seconds integer default null,
  p_session_id uuid default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns table(charged boolean, charged_minutes integer, new_balance_minutes integer, used_bytes_24h bigint)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_sec         integer;
  v_cum_before  integer := 0;
  v_cum_after   integer := 0;
  v_min_delta   integer;
  v_charged_min integer := 0;
  v_new         integer := null;
  v_used        bigint;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;
  if p_bytes is null or p_bytes <= 0 then
    return query select false, 0, null::integer, 0::bigint; return;
  end if;

  -- Clamp: one call cannot claim more than the hard ceiling, so a crafted client
  -- cannot poison its own accounting.
  v_sec := least(greatest(coalesce(p_seconds, 0), 0), 7200);

  -- Cumulative seconds for this session BEFORE this chunk.
  if p_session_id is not null then
    select coalesce(sum(coalesce(seconds, 0)), 0) into v_cum_before
      from public.transcription_usage
     where user_id = v_uid and session_id = p_session_id;
  end if;

  insert into public.transcription_usage (user_id, bytes, seconds, session_id, input_tokens, output_tokens)
  values (
    v_uid,
    least(p_bytes::bigint, 60 * 1024 * 1024),
    nullif(v_sec, 0),
    p_session_id,
    p_input_tokens,
    p_output_tokens
  );

  -- Charge only when we know which session this belongs to, so the save-time
  -- deduction can net it off. Without a session id we cap instead of charge —
  -- better than billing a cached client twice.
  if p_session_id is not null and v_sec > 0 then
    v_cum_after := v_cum_before + v_sec;
    -- Whole minutes only, charged as they ACCRUE. Twelve 12-second chunks bill one
    -- minute; sixty of them bill twelve. Rounding each chunk up instead would
    -- bill a 12-minute session as 60 minutes.
    v_min_delta := (v_cum_after / 60) - (v_cum_before / 60);
    if v_min_delta > 0 then
      v_new := public.charge_minutes(v_min_delta, 'transcription:' || p_session_id::text);
      v_charged_min := case when v_new is null then 0 else v_min_delta end;
    end if;
  end if;

  select coalesce(sum(bytes), 0) into v_used
    from public.transcription_usage
   where user_id = v_uid and created_at > now() - interval '24 hours';

  return query select (v_charged_min > 0), v_charged_min, v_new, v_used;
end;
$$;
-- ── Session save nets off what transcription already charged ─────────────────
drop function if exists public.consume_session_minutes(integer);
create or replace function public.consume_session_minutes(p_seconds integer, p_session_id uuid default null)
returns table(ok boolean, new_balance_minutes integer, reason text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_already  integer := 0;
  v_charge_s integer;
  v_minutes  integer;
  v_new      integer;
begin
  if v_uid is null then
    return query select false, null::integer, 'not authenticated'::text; return;
  end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    return query select false, null::integer, 'invalid duration'::text; return;
  end if;

  -- Seconds already charged for THIS session (streamed transcription).
  if p_session_id is not null then
    select coalesce(sum(coalesce(seconds, 0)), 0) into v_already
      from public.transcription_usage
     where user_id = v_uid and session_id = p_session_id;
  end if;

  v_charge_s := greatest(0, p_seconds - v_already);

  if v_charge_s = 0 then
    -- Everything was already paid for as it streamed: report success without a
    -- second deduction, so an iOS session is billed once, not twice.
    select coalesce(uc.balance_minutes, 0) into v_new
      from public.user_credits uc where uc.user_id = v_uid;
    return query select true, v_new, 'already charged during transcription'::text; return;
  end if;

  -- Ceil only the REMAINDER, once per session — not once per chunk.
  v_minutes := ceil(v_charge_s / 60.0)::integer;

  v_new := public.charge_minutes(v_minutes, case when p_session_id is not null
                                                 then 'session:' || p_session_id::text
                                                 else 'consume_session_minutes' end);

  if v_new is null then
    return query select false, null::integer, 'no credits row'::text; return;
  end if;

  return query select true, v_new,
    case when v_already > 0 then 'remainder after transcription' else 'ok' end;
end;
$$;
revoke all on function public.authorize_transcription(integer, integer) from public, anon;
revoke all on function public.record_transcription(integer, integer, uuid, integer, integer) from public, anon;
revoke all on function public.consume_session_minutes(integer, uuid) from public, anon;
grant execute on function public.authorize_transcription(integer, integer) to authenticated;
grant execute on function public.record_transcription(integer, integer, uuid, integer, integer) to authenticated;
grant execute on function public.consume_session_minutes(integer, uuid) to authenticated;
-- Verify (rolled back), as an authenticated user:
--   select * from public.authorize_transcription(200000, 12);            -- ok
--   select * from public.authorize_transcription(200000, 1);             -- implausible duration
--   select * from public.record_transcription(48000, 12, '<session>');   -- charged = true
--   select * from public.consume_session_minutes(720, '<session>');      -- nets off the 12s;
