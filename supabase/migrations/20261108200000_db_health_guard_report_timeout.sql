-- The health guard watched the wreckage of the 5-second timeout, never the cause.
--
-- pg_net's http_post default timeout is 5000 ms. process-ai-reports takes ~24 s
-- for a single report and the cron batch handles up to 10, so before this was
-- fixed every slow run was abandoned mid-flight while cron.job_run_details
-- recorded "succeeded" — the run succeeded, the work did not.
--
-- Raising the timeout to 120000 ms fixed it once. It is a value typed into a job
-- command, and a value typed into a job command can be lost: a recreated job, a
-- restored backup, someone tidying the SQL. Then the timeouts come back, and the
-- only symptom is a count of timeouts that rises after the work has already been
-- thrown away.
--
-- So assert the setting, not the symptom. This runs hourly in db_health_guard().

create or replace function public.db_health_guard()
returns text
language plpgsql
security definer
set search_path to 'public', 'cron', 'net', 'pg_catalog'
as $function$
declare
  db_bytes     bigint;
  cron_rows    bigint;
  http_rows    bigint;
  http_bytes   bigint;
  orphaned     bigint;
  everymin     text;
  report_jobs  int;
  short_report text;
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

  -- The timeout itself. A 24-second job behind a 5-second default is abandoned
  -- every time it runs, and the run history will not say so.
  select count(*) into report_jobs
    from cron.job
   where active and command ilike '%process-ai-reports%';
  if report_jobs = 0 then
    raise exception 'db_health: no active cron job posts to process-ai-reports — AI reports will never be generated';
  end if;

  select string_agg(
           'jobid ' || jobid || ' has '
             || coalesce(substring(command from
                  'timeout_milliseconds[[:space:]]*:=[[:space:]]*([0-9]+)') || ' ms',
                  'no timeout_milliseconds'),
           ', ')
    into short_report
    from cron.job
   where active
     and command ilike '%process-ai-reports%'
     and coalesce(nullif(substring(command from
           'timeout_milliseconds[[:space:]]*:=[[:space:]]*([0-9]+)'), '')::int, 0) < 60000;
  if short_report is not null then
    raise exception 'db_health: report cron timeout missing or too short — % — pg_net gives up after 5000 ms and the work is abandoned while the run log records a success',
      short_report;
  end if;

  return 'ok: ' || pg_size_pretty(db_bytes) || ', cron detail ' || cron_rows || ' rows, pg_net '
    || http_rows || ' rows, report cron timeout '
    || (select string_agg(substring(command from
              'timeout_milliseconds[[:space:]]*:=[[:space:]]*([0-9]+)') || ' ms', ', ')
          from cron.job
         where active and command ilike '%process-ai-reports%');
end;
$function$;

-- Same function, three new ways to fail. Prove each one actually raises rather
-- than trusting that the SQL parses: a guard whose branches are never exercised
-- is a guard that may only ever return 'ok'.
do $verify$
declare
  original text;
  raised   boolean;
  msg      text;

  -- cron.job is owned by the extension, so a direct UPDATE gets 42501. The only
  -- supported way to change a job is cron.alter_job(), which is also what the
  -- earlier timeout fix used.
begin
  select command into original from cron.job where jobid = 9 and active;

  if original is null then
    raise notice 'verify: jobid 9 not found, skipping the live-job checks';
    return;
  end if;

  -- 1. The healthy state must pass.
  perform public.db_health_guard();

  -- 2. Strip the timeout: must raise, naming the problem.
  perform cron.alter_job(job_id := 9, command := replace(original, 'timeout_milliseconds := 120000', ''));
  raised := false;
  begin
    perform public.db_health_guard();
  exception when others then
    raised := true; msg := sqlerrm;
  end;
  if not raised or msg not ilike '%timeout missing or too short%' then
    raise exception 'verify: guard did not catch a missing report timeout (raised=%, msg=%)', raised, msg;
  end if;

  -- 3. A 5-second timeout, the exact original bug: must raise.
  perform cron.alter_job(job_id := 9, command := replace(original, 'timeout_milliseconds := 120000', 'timeout_milliseconds := 5000'));
  raised := false;
  begin
    perform public.db_health_guard();
  exception when others then
    raised := true; msg := sqlerrm;
  end;
  if not raised or msg not ilike '%timeout missing or too short%' then
    raise exception 'verify: guard did not catch a 5000 ms report timeout (raised=%, msg=%)', raised, msg;
  end if;

  -- 4. Nothing posting to the report function at all: must raise about that.
  perform cron.alter_job(job_id := 9, command := 'select 1');
  raised := false;
  begin
    perform public.db_health_guard();
  exception when others then
    raised := true; msg := sqlerrm;
  end;
  if not raised or msg not ilike '%no active cron job posts to process-ai-reports%' then
    raise exception 'verify: guard did not catch a missing report job (raised=%, msg=%)', raised, msg;
  end if;

  -- Put the real command back, and prove it is back. Losing this job means no AI
  -- reports ever again, so the restore is checked rather than assumed.
  perform cron.alter_job(job_id := 9, command := original);
  if (select command from cron.job where jobid = 9) is distinct from original then
    raise exception 'verify: FAILED TO RESTORE jobid 9 — fix immediately: %', original;
  end if;
  perform public.db_health_guard();
  raise notice 'verify: all four report-timeout branches behave, jobid 9 restored';
end;
$verify$;
