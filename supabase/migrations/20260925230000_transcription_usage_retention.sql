-- Retention for transcription_usage: a meter that nothing ever emptied.
--
-- ══ THE GAP ═══════════════════════════════════════════════════════════════════
-- authorize_transcription() sums this table over a ROLLING 24 HOURS:
--
--     where user_id = v_uid and created_at > now() - interval '24 hours'
--
-- Nothing deleted a row, ever. So the table only grew while only the last 24 hours
-- of it were ever read — a user id and an audio byte count, kept indefinitely for
-- no purpose once the day had passed. Art. 5(1)(e) requires storage limitation, and
-- the retention schedule carried this as unknown gap 1 ("Fix: a scheduled delete of
-- rows older than 30 days, then update this table").
--
-- Erasure was already correct: user_id cascades from auth.users, so deleting an
-- account removed its rows. The missing piece was time-based retention only.
--
-- ══ WHY 30 DAYS ══════════════════════════════════════════════════════════════
-- The read window is 24 hours, so 30 days is roughly 30x the working set. That
-- headroom is deliberate: it keeps a debugging window after an incident, and it is
-- the same figure session retention already uses, so there is one number to
-- remember rather than two.
--
-- ══ WHY NOT FOLDED INTO cleanup_unsaved_sessions() ═══════════════════════════
-- That function's name, its notice and its return value all describe sessions. A
-- second, unrelated delete inside it would make its own log line untrue. A separate
-- function and a separate job also mean a failure in one cannot stop the other.
--
-- NOTE: this expires 0 rows today — the table is empty, because the iOS fallback
-- that writes it has never engaged. It is a rule applied before the data arrives,
-- which is the right order to be in.

create or replace function public.cleanup_transcription_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.transcription_usage
     where created_at < now() - interval '30 days'
    returning id
  )
  select count(*) into deleted_count from deleted;

  raise notice 'cleanup_transcription_usage: deleted % rows older than 30 days', deleted_count;
  return deleted_count;
end;
$$;
-- EXECUTE is granted to PUBLIC by default on a new function, so without this anon
-- and authenticated could call it. Nothing in the app needs to: unlike
-- cleanup_unsaved_sessions (which the client can trigger on demand), this runs only
-- from the scheduler, as the migration owner.
revoke all on function public.cleanup_transcription_usage() from anon, authenticated, public;
-- The cleanup filters on created_at alone, and the existing index leads with
-- user_id, so it cannot serve this delete. Without a leading-column index the job
-- seq-scans the whole table every night.
create index if not exists transcription_usage_created_idx
  on public.transcription_usage (created_at);
-- 04:00 — an hour after the session cleanup, so the two deletes never contend.
-- cron.schedule() updates by jobname, so this is idempotent.
select cron.schedule(
  'cleanup-transcription-usage',
  '0 4 * * *',
  'SELECT cleanup_transcription_usage();'
);
-- Verify after applying:
--   select jobname, schedule, active from cron.job
--    where jobname = 'cleanup-transcription-usage';          -- one row, active
--   select prosecdef, proconfig from pg_proc
--    where proname = 'cleanup_transcription_usage';          -- true, search_path=public
--   select has_function_privilege('authenticated',
--          'public.cleanup_transcription_usage()', 'EXECUTE');  -- false
--
-- Dry run — how many WOULD be deleted right now:
--   select count(*) from public.transcription_usage
--    where created_at < now() - interval '30 days';;
