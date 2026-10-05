-- Link a generated report back to the request that produced it.
--
-- Why: both frontends polled session_ai_reports for "the newest completed report
-- for this user" rather than for THE report their request will produce. With one
-- report in flight that is indistinguishable; with two — a user clicking generate
-- twice, or a synthesis while a session report is running — each poll can pick up
-- the other request's text and render it as its own. That is a wrong-report bug
-- no single-user manual test would ever surface.
--
-- request_id makes the link explicit so the poll can be exact. Nullable because
-- every report generated before this migration has none; the frontends fall back
-- to the newest-completed query while request_id is null.

alter table public.session_ai_reports
  add column if not exists request_id uuid;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_ai_reports_request_id_fkey'
      and conrelid = 'public.session_ai_reports'::regclass
  ) then
    alter table public.session_ai_reports
      add constraint session_ai_reports_request_id_fkey
      foreign key (request_id) references public.ai_report_requests(id)
      on delete set null;
  end if;
end $$;
create index if not exists session_ai_reports_request_id_idx
  on public.session_ai_reports (request_id);
comment on column public.session_ai_reports.request_id is
  'The ai_report_requests row that produced this report. NULL for reports generated before migration 20260929180000. Set by process-ai-reports so a client can poll for its own report instead of the newest completed one.';
