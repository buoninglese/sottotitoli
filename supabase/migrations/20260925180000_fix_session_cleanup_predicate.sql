-- Fix the session retention predicate: key on the flag the UI actually writes.
--
-- ══ THE BUG ═══════════════════════════════════════════════════════════════════
-- cleanup-unsaved-sessions (pg_cron, daily 03:00) deleted:
--
--     WHERE saved IS NOT TRUE AND created_at < now() - interval '30 days'
--
-- Nothing has EVER written sessions.saved — not the app, not any edge function
-- (both verified by grep). The per-session control the UI actually exposes is the
-- STAR, which writes sessions.favorite (panoramica-trascrizioni.js → trToggleFav).
--
-- So every session was "unsaved" by definition and was scheduled for deletion 30
-- days after creation — and because session_ai_reports.session_id is ON DELETE
-- CASCADE, deleting a session also destroyed its AI reports, a paid artifact the
-- user spent credits on. privacy.html has always stated the intended behaviour:
--
--   "Le sessioni non salvate vengono eliminate dopo 30 giorni. Le sessioni che
--    salvi esplicitamente vengono conservate finche non le elimini tu stesso."
--
-- The implementation never matched it.
--
-- ══ THE FIX ═══════════════════════════════════════════════════════════════════
--   * key retention off `favorite` — the control users actually have;
--   * never delete a session that has AI reports, because a report is proof the
--     user paid for that session. Keeping the session (rather than switching the
--     FK to ON DELETE SET NULL) means no orphaned reports, no null-handling in the
--     reports UI, and no schema change at all.
--
-- ══ EXPOSURE AT TIME OF WRITING ══════════════════════════════════════════════
-- None. The oldest session is 2026-09-20, so the job had never deleted anything;
-- 0 sessions would have expired at the next run; 1 is starred; 0 have reports.
-- This was caught before it ever fired.
--
-- NOTE: sessions.saved is now referenced by nothing. It is deliberately LEFT IN
-- PLACE — dropping a column is a separate, independently reversible change, and
-- RLS policies and views should be checked for references first.

create or replace function public.cleanup_unsaved_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.sessions s
     where s.favorite is not true
       and s.created_at < now() - interval '30 days'
       and not exists (
         select 1 from public.session_ai_reports r where r.session_id = s.id
       )
    returning s.id
  )
  select count(*) into deleted_count from deleted;

  raise notice 'cleanup_unsaved_sessions: deleted % sessions older than 30 days (starred and report-bearing sessions are kept)', deleted_count;
  return deleted_count;
end;
$$;
-- The old index is on (created_at, saved) WHERE saved IS NOT TRUE, so it becomes
-- useless the moment the predicate changes.
drop index if exists public.idx_sessions_cleanup;
create index if not exists idx_sessions_cleanup
  on public.sessions (created_at)
  where favorite is not true;
-- Re-assert the schedule so this job has ONE definition. It previously existed
-- only because someone pasted the archived file into the SQL editor, which is why
-- it is absent from the migration ledger. cron.schedule() updates by jobname, so
-- this is idempotent.
select cron.schedule(
  'cleanup-unsaved-sessions',
  '0 3 * * *',
  'SELECT cleanup_unsaved_sessions();'
);
-- Verify after applying:
--   select (prosrc like '%favorite is not true%') as keys_off_favorite,
--          (prosrc like '%session_ai_reports%')  as keeps_reported_sessions
--     from pg_proc where proname = 'cleanup_unsaved_sessions';   -- both true
--   select indexdef from pg_indexes where indexname = 'idx_sessions_cleanup';
--   select jobname, schedule, active from cron.job
--    where jobname = 'cleanup-unsaved-sessions';                 -- one row, active
--
-- Dry run — how many WOULD be deleted right now:
--   select count(*) from public.sessions s
--    where s.favorite is not true
--      and s.created_at < now() - interval '30 days'
--      and not exists (select 1 from public.session_ai_reports r where r.session_id = s.id);;
