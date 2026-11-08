-- A monitor that lives in the database, so it does not depend on a laptop being
-- awake or on an external service being configured.
--
-- The 2026-11-08 outage had exactly one signal, and it arrived too late: a
-- connection timeout. Nothing inside the system knew it was filling up. An hourly
-- job that checks the conditions which caused it, and FAILS if any is met, puts
-- that knowledge back inside the system. A failure here is recorded by pg_cron in
-- cron.job_run_details and shows on the dashboard as a failed job, which is also
-- what scripts/check-db-health.sh reads.
--
-- Thresholds are deliberately far from current values (the database is at 21 MB
-- of a 500 MB cap, the log tables at tens of kilobytes) so this cannot cry wolf:
--
--   database > 300 MB         60% of the free-tier cap
--   cron.job_run_details > 20,000 rows
--   net._http_response  > 5,000 rows or 50 MB
--   any active job on '* * * * *'
--   any pg_net call with no outcome after 10 minutes
--
-- Raises the FIRST breach with a specific message rather than a boolean, so the
-- failed job says what is wrong without anyone going looking.

create or replace function public.db_health_guard()
returns text
language plpgsql
security definer
set search_path = public, cron, net, pg_catalog
as $$
declare
  db_bytes   bigint;
  cron_rows  bigint;
  http_rows  bigint;
  http_bytes bigint;
  orphaned   bigint;
  everymin   text;
begin
  db_bytes := pg_database_size(current_database());
  if db_bytes > 300 * 1024 * 1024 then
    raise exception 'db_health: database is % (% of the 500 MB free cap) — growth is not being pruned',
      pg_size_pretty(db_bytes), round(100.0 * db_bytes / (500.0 * 1024 * 1024), 1);
  end if;

  -- The exact configuration that took the database down.
  select string_agg(jobname || ' (jobid ' || jobid || ')', ', ')
    into everymin
    from cron.job
   where active and schedule = '* * * * *';
  if everymin is not null then
    raise exception 'db_health: job(s) running EVERY MINUTE: % — this filled the database last time',
      everymin;
  end if;

  select count(*) into cron_rows from cron.job_run_details;
  if cron_rows > 20000 then
    raise exception 'db_health: cron.job_run_details has % rows — the retention job is not keeping up',
      cron_rows;
  end if;

  select count(*) into http_rows from net._http_response;
  http_bytes := coalesce(pg_total_relation_size('net._http_response'), 0);
  if http_rows > 5000 then
    raise exception 'db_health: net._http_response has % rows — the retention job is not keeping up',
      http_rows;
  end if;
  if http_bytes > 50 * 1024 * 1024 then
    raise exception 'db_health: net._http_response occupies % — retention is not reclaiming space',
      pg_size_pretty(http_bytes);
  end if;

  -- A pg_net call that went out and never recorded a status is the shape of the
  -- 5s-timeout bug: the work may have been abandoned mid-flight.
  select count(*) into orphaned
    from net._http_response
   where status_code is null and not timed_out and created < now() - interval '10 minutes';
  if orphaned > 0 then
    raise exception 'db_health: % pg_net call(s) never recorded an outcome', orphaned;
  end if;

  return 'ok: ' || pg_size_pretty(db_bytes) || ', cron detail ' || cron_rows || ' rows, pg_net '
    || http_rows || ' rows';
end;
$$;

comment on function public.db_health_guard() is
  'Raises if the database is filling up the way it did on 2026-11-08. Scheduled hourly by pg_cron; a breach shows as a failed job.';

-- Runs at :23 so it does not collide with the :07 retention job.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'db_health_guard') then
    perform cron.unschedule('db_health_guard');
  end if;
  perform cron.schedule('db_health_guard', '23 * * * *', 'select public.db_health_guard();');
end $$;
