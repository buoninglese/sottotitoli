-- Metering for transcribe-audio (the Whisper endpoint).
--
-- ══ THE GAP ═══════════════════════════════════════════════════════════════════
-- The minute guard shipped in 20260924120000 closed self-service balance
-- inflation. It did nothing about the OTHER half: an authenticated user with a
-- valid balance could call transcribe-audio in a loop and burn Whisper spend
-- without ever recording a session — nothing server-side counted anything.
--
-- ══ WHY BYTES, NOT DURATION ═══════════════════════════════════════════════════
-- The obvious design is to measure the audio duration Whisper reports and meter
-- that. But the accurate-duration response format (verbose_json) is NOT supported
-- by the cheaper gpt-4o-mini-transcribe model — so metering on duration would
-- force us to keep paying twice the price for the privilege of measuring it.
--
-- Bytes, by contrast, are known BEFORE the call. That means the ceiling can be
-- enforced up front — we refuse rather than transcribe-and-hope — which is
-- strictly better for abuse prevention anyway.
--
-- Budget model: a user's rolling 24h transcribed BYTES may not exceed their own
-- available minutes' worth of audio.
--
--   budget = min(available_seconds × 6000 bytes, 60 MB)
--
-- 6000 B/s ≈ 48 kbps, deliberately generous relative to MediaRecorder's actual
-- output (~24–32 kbps) so a legitimate user is never cut off early. The 60 MB
-- hard ceiling (~3.5 hours of audio) bounds the worst case per account per day
-- regardless of how large their balance is — a 1000-minute balance must not mean
-- a 1000-minute daily allowance.

create table if not exists public.transcription_usage (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  bytes      bigint not null check (bytes > 0),
  created_at timestamptz not null default now()
);
create index if not exists transcription_usage_user_time_idx
  on public.transcription_usage (user_id, created_at desc);
alter table public.transcription_usage enable row level security;
-- Nothing but the SECURITY DEFINER functions below touches this table. No grants
-- to anon/authenticated at all — the default Supabase ACL would otherwise hand
-- them write access, which is how user_credits got into trouble.
revoke all on public.transcription_usage from anon, authenticated, public;
-- The caller's usable seconds: the school pool when they are an org member,
-- otherwise their personal balance. `balance_minutes` is authoritative — the app
-- reads that column, and the two columns have drifted in practice (one account
-- holds 1000 minutes but only 60 900 seconds / 1015 minutes' worth), so trusting
-- a max() of the two would over-serve.
create or replace function public.available_seconds()
returns integer
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_sec integer;
begin
  if v_uid is null then return 0; end if;

  v_org := public.current_org_id();
  if v_org is not null then
    select coalesce(balance_minutes, 0) * 60 into v_sec
      from public.organisation_credits where org_id = v_org;
    if v_sec is not null and v_sec > 0 then return v_sec; end if;
  end if;

  select coalesce(balance_minutes, 0) * 60 into v_sec
    from public.user_credits where user_id = v_uid;

  return coalesce(v_sec, 0);
end;
$$;
-- Called BEFORE contacting Whisper. p_bytes is the upload size, which the
-- function has already read, so this refuses rather than paying first.
create or replace function public.authorize_transcription(p_bytes integer)
returns table(allowed boolean, available_seconds integer, used_bytes_24h bigint, budget_bytes bigint, reason text)
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_avail  integer;
  v_used   bigint;
  v_budget bigint;
  c_bytes_per_second constant integer := 6000;          -- ≈48 kbps headroom
  c_hard_cap         constant bigint  := 60 * 1024 * 1024;  -- 60 MB / rolling 24h
begin
  if v_uid is null then
    return query select false, 0, 0::bigint, 0::bigint, 'not authenticated'::text;
    return;
  end if;

  if p_bytes is null or p_bytes <= 0 then
    return query select false, 0, 0::bigint, 0::bigint, 'empty audio'::text;
    return;
  end if;

  v_avail := public.available_seconds();

  select coalesce(sum(bytes), 0) into v_used
    from public.transcription_usage
   where user_id = v_uid and created_at > now() - interval '24 hours';

  v_budget := least((v_avail::bigint * c_bytes_per_second), c_hard_cap);

  if v_avail <= 0 then
    return query select false, v_avail, v_used, v_budget, 'no minutes available'::text;
    return;
  end if;

  if v_used + p_bytes > v_budget then
    return query select false, v_avail, v_used, v_budget, 'daily transcription limit reached'::text;
    return;
  end if;

  return query select true, v_avail, v_used, v_budget, 'ok'::text;
end;
$$;
-- Called AFTER a successful transcription, so the 24h window reflects audio that
-- was actually paid for. A rejected call records nothing.
create or replace function public.record_transcription(p_bytes integer)
returns table(used_bytes_24h bigint)
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_used bigint;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    return query select 0::bigint;
    return;
  end if;

  -- Clamp: one call cannot record more than the hard ceiling, so a crafted client
  -- cannot poison its own accounting with an absurd number.
  insert into public.transcription_usage (user_id, bytes)
  values (v_uid, least(p_bytes::bigint, 60 * 1024 * 1024));

  select coalesce(sum(bytes), 0) into v_used
    from public.transcription_usage
   where user_id = v_uid and created_at > now() - interval '24 hours';

  return query select v_used;
end;
$$;
revoke all on function public.available_seconds()             from public, anon;
revoke all on function public.authorize_transcription(integer) from public, anon;
revoke all on function public.record_transcription(integer)    from public, anon;
grant execute on function public.available_seconds()             to authenticated;
grant execute on function public.authorize_transcription(integer) to authenticated;
grant execute on function public.record_transcription(integer)    to authenticated;
-- Verify (as an authenticated user):
--   select * from public.authorize_transcription(200000);
--   -- with zero minutes: allowed = false, reason = 'no minutes available'
-- Retention: rows older than the 24h window are inert. Add a cleanup job later if
-- the table ever matters; it is tiny next to net._http_response.;
