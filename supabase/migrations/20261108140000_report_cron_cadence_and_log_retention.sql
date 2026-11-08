-- Incident 2026-11-08: the database went down. This is the fix, kept in a
-- migration so a rebuild cannot reintroduce it.
--
-- WHAT HAPPENED
-- -------------
-- `process-ai-reports` was scheduled `* * * * *` — every minute, since June. By
-- the time it mattered it had written:
--
--   cron.job_run_details   202,862 rows   231 MB
--   net._http_response         173 rows   113 MB   (~1 GB/day of churn, pruned
--                                                   at a 6h TTL but never vacuumed)
--
-- together 94% of a 366 MB database, on a NANO instance with **256 MB of RAM and
-- no swap**. Dashboard memory commitment peaked at 1.11 GB / SEVERE, Postgres
-- wedged, and the whole database stopped accepting sessions: connections timed
-- out at 5s while the API layer stayed up and the control plane still reported
-- ACTIVE_HEALTHY. Only a project restart recovered it.
--
-- Note how the failure presents: auth/rest/storage answer normally (401/200),
-- TCP to 5432 connects, but no session is ever established. "Project unhealthy"
-- with a healthy control plane means the compute is up and Postgres is not
-- serving — not a paused project, which fails differently (DNS/TLS unreachable).
--
-- THE FIX, IN TWO PARTS
-- ---------------------
-- 1. The cron is a BACKSTOP, not the only processor. Both client paths that
--    enqueue a report (js/grammar-report.js and js/panoramica-reportai-myreports
--    .js) now POST the request id to the function after inserting, exactly as
--    js/panoramica-reportai.js already did. Without that, slowing the cron would
--    have meant a 15-minute wait on a Grammatica report, so the cadence could not
--    be lowered on its own.
--
-- 2. Retention, so the history cannot grow back. The job keeps three days of
--    cron runs and one day of pg_net responses.
--
-- `postgres` is not a superuser here and does not own the `cron` schema, so
-- `update cron.job ...` fails with 42501. The extension's own functions
-- (`cron.alter_job`, `cron.schedule`) do work. DELETE and TRUNCATE on both log
-- tables are permitted, so the retention job can actually do its work.

do $$
begin
  -- Backstop cadence: 1440 invocations/day -> 96.
  if exists (select 1 from cron.job where jobid = 9) then
    perform cron.alter_job(9, '*/15 * * * *');
  end if;

  -- Retention. Idempotent: replace the job if it already exists.
  if exists (select 1 from cron.job where jobname = 'prune_platform_logs') then
    perform cron.unschedule('prune_platform_logs');
  end if;
  perform cron.schedule(
    'prune_platform_logs',
    '15 3 * * *',
    $prune$
      delete from cron.job_run_details where start_time < now() - interval '3 days';
      delete from net._http_response    where created    < now() - interval '1 day';
    $prune$
  );
end $$;
