-- ═══════════════════════════════════════════════════════════════════════════
--  Gate 0 — "See": a funnel you can read, in a schema the internet cannot reach.
--
--  Why a private schema rather than an RLS-protected view in public:
--  a view in `public` is served by PostgREST, and anything served there is a
--  surface to get wrong later. `internal` is not in the exposed schema list, so
--  `anon` and `authenticated` cannot address it at all — enforced by ACL, not by
--  a policy someone can drop.
--
--  The numbers come from tables that already record them:
--    profiles.created_at            → signup
--    sessions.created_at, user_id   → first real use / activity
--    credit_transactions            → money (type='purchase') and consumption
--  No new writes, no new vendor, no cookie, no consent question.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists internal;

revoke all on schema internal from public;
revoke all on schema internal from anon, authenticated;
grant usage on schema internal to service_role;

-- security_invoker on purpose: if this is ever exposed by accident, the caller's
-- RLS applies instead of the view owner's rights.
create or replace view internal.funnel_daily
with (security_invoker = true) as
with days as (
  select generate_series(
           (current_date - interval '90 days')::date,
           current_date,
           interval '1 day'
         )::date as day
)
select
  d.day,
  (select count(*) from public.profiles p
    where p.created_at::date = d.day)                       as signups,
  (select count(*) from public.sessions s
    where s.created_at::date = d.day)                       as sessions,
  (select count(distinct s.user_id) from public.sessions s
    where s.created_at::date = d.day)                       as active_users,
  (select count(*) from public.credit_transactions c
    where c.type = 'purchase' and c.created_at::date = d.day) as purchases,
  (select coalesce(-sum(c.amount_seconds), 0) / 60
     from public.credit_transactions c
    where c.type = 'session_usage' and c.created_at::date = d.day) as minutes_used,
  (select count(*) from public.client_errors e
    where e.created_at::date = d.day)                       as client_errors
from days d;

revoke all on internal.funnel_daily from public;
revoke all on internal.funnel_daily from anon, authenticated;
grant select on internal.funnel_daily to service_role;

comment on view internal.funnel_daily is
  'Gate 0 funnel: last 90 days of signups / sessions / purchases / minutes / client errors. '
  'Read-only, derived from existing tables. Not exposed through PostgREST.';
