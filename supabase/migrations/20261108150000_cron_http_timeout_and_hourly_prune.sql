-- Follow-up to 20261108140000. Same incident (2026-11-08), found by auditing that
-- fix instead of trusting it. Both faults below have the shape of the outage
-- itself: something reports success while doing nothing.
--
-- 1. THE CRON ABANDONED EVERY JOB IT STARTED.
--    pg_net's http_post default timeout is 5000 ms. Report generation takes ~24 s
--    (measured: a 3,896-character synthesis report in ~24 s) and the batch
--    processes up to 10 requests per invocation. Observed live at 15:00:
--
--      status_code = NULL, timed_out = true,
--      error_msg  = 'Timeout of 5000 ms reached. Total time: 5001.133 ms'
--
--    while cron.job_run_details recorded the invocation as succeeded. Nothing was
--    lost — the request stayed `queued` and was picked up on the next tick — but
--    every slow run looked healthy and did its work twice over.
--
--    The command is patched in place with replace() rather than rewritten, so a
--    rebuild against another project keeps its own URL and key. If the patch does
--    not land this migration raises, because a silent no-op here is the same bug.
--
-- 2. THE PRUNE RAN ONCE A DAY, SO A DAY OF PAYLOADS COULD ACCUMULATE.
--    net._http_response gains a row per cron run, and those rows were ~653 kB
--    each when the worker returned report payloads (113 MB over 173 rows). At 96
--    runs/day the peak between prunes was therefore ~63 MB — survivable on the
--    500 MB free tier, and entirely avoidable. Hourly caps it at ~4 runs. The
--    3-day delete on cron.job_run_details is cheap enough to run hourly as well.
--
-- Verified against the live database before being written down: planting a
-- 30-day-old row in each table and running this exact SQL deleted both, while
-- rows created "now" survived. The earlier attempt planted nothing (42501 on
-- cron.runid_seq, because the insert default calls nextval) and still printed
-- "0 sentinels left" — which is why the sentinels here are inserted with an
-- explicit id.

do $$
declare
  patched text;
begin
  -- 1. Give the cron time to finish what it starts.
  if exists (select 1 from cron.job where jobid = 9) then
    select case
             when position('timeout_milliseconds' in command) > 0 then command
             else replace(
                    command,
                    'body := ''{}''::jsonb',
                    'body := ''{}''::jsonb, timeout_milliseconds := 120000'
                  )
           end
      into patched
      from cron.job
     where jobid = 9;

    perform cron.alter_job(job_id := 9, command := patched);

    if not exists (
      select 1 from cron.job
       where jobid = 9
         and command like '%timeout_milliseconds := 120000%'
    ) then
      raise exception
        'job 9 command did not take timeout_milliseconds; it would still abandon work after 5s';
    end if;
  end if;

  -- 2. Prune hourly, not nightly.
  if exists (select 1 from cron.job where jobname = 'prune_platform_logs') then
    perform cron.unschedule('prune_platform_logs');
  end if;
  perform cron.schedule(
    'prune_platform_logs',
    '7 * * * *',
    $prune$
      delete from cron.job_run_details where start_time < now() - interval '3 days';
      delete from net._http_response    where created    < now() - interval '1 day';
    $prune$
  );
end $$;
