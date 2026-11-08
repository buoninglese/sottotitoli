-- One row, every number the health check judges. Kept in a single statement
-- because `supabase db query` prints only the last statement's result set —
-- splitting these into several selects would silently report just one of them.
select jsonb_build_object(
  'db_bytes',            pg_database_size(current_database()),
  'db_size',             pg_size_pretty(pg_database_size(current_database())),
  -- WAL lives on the same small disk. A long-running transaction can stop the
  -- checkpoint that recycles it, and nothing else here would notice.
  'wal_bytes',           coalesce((select sum(size) from pg_ls_waldir()), 0),
  'wal_size',            coalesce((select pg_size_pretty(sum(size)) from pg_ls_waldir()), '0'),
  'cron_detail_rows',    (select count(*) from cron.job_run_details),
  'cron_detail_bytes',   coalesce(pg_total_relation_size('cron.job_run_details'), 0),
  'http_rows',           (select count(*) from net._http_response),
  'http_bytes',          coalesce(pg_total_relation_size('net._http_response'), 0),

  -- The exact configuration that took the database down: a job on every minute.
  'every_minute_jobs', (select coalesce(jsonb_agg(jsonb_build_object(
                          'jobid', jobid, 'name', jobname, 'schedule', schedule)), '[]'::jsonb)
                          from cron.job where schedule = '* * * * *' and active),
  'inactive_jobs', (select coalesce(jsonb_agg(jsonb_build_object(
                      'jobid', jobid, 'name', jobname)), '[]'::jsonb)
                      from cron.job where not active),
  'cron_failures_24h',  (select count(*) from cron.job_run_details
                          where status = 'failed' and start_time > now() - interval '24 hours'),

  -- pg_net's 5s default timeout made every slow report look successful. Rows
  -- that timed out, errored, or never completed are all versions of that bug.
  'http_timeouts_24h',   (select count(*) from net._http_response
                           where timed_out and created > now() - interval '24 hours'),
  'http_errors_24h',     (select count(*) from net._http_response
                           where status_code >= 400 and created > now() - interval '24 hours'),
  'http_incomplete',     (select count(*) from net._http_response
                           where status_code is null and not timed_out
                             and created < now() - interval '10 minutes'),

  -- Counting timeouts only reports the damage after work has been abandoned.
  -- A report batch takes ~24 s and pg_net's default is 5 s, so if job 9 is ever
  -- recreated without timeout_milliseconds the reports die mid-flight again and
  -- cron.job_run_details still says "succeeded". Assert the setting itself.
  'report_post_timeouts', (select coalesce(jsonb_agg(jsonb_build_object(
                             'jobid', jobid,
                             'timeout_ms', nullif(substring(command from
                               'timeout_milliseconds[[:space:]]*:=[[:space:]]*([0-9]+)'), '')::int
                           )), '[]'::jsonb)
                           from cron.job
                          where active and command ilike '%process-ai-reports%'),

  'big_tables', (select coalesce(jsonb_agg(t order by t.bytes desc), '[]'::jsonb) from (
                   select n.nspname || '.' || c.relname as name,
                          pg_total_relation_size(c.oid) as bytes,
                          pg_size_pretty(pg_total_relation_size(c.oid)) as size
                     from pg_class c
                     join pg_namespace n on n.oid = c.relnamespace
                    where c.relkind = 'r'
                      and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
                      and pg_total_relation_size(c.oid) > 10 * 1024 * 1024) t),

  'dead_tuple_tables', (select coalesce(jsonb_agg(jsonb_build_object(
                          'name', relname, 'dead', n_dead_tup, 'live', n_live_tup)), '[]'::jsonb)
                          from pg_stat_user_tables where n_dead_tup > 1000),

  'stuck_slots', (select coalesce(jsonb_agg(jsonb_build_object(
                    'slot', slot_name, 'active', active)), '[]'::jsonb)
                    from pg_replication_slots where not active)
) as health;
