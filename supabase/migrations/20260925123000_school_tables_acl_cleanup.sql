-- Remove the broad default ACL from the new school tables.
--
-- Supabase sets `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
-- authenticated`, so every new table in `public` starts with TRUNCATE,
-- REFERENCES and TRIGGER as well as the ordinary verbs.
--
-- The schools migration (20260925090000) revoked that from `anon` and re-granted
-- a subset to `authenticated` — but a GRANT does not remove what is already
-- there. `authenticated` therefore still held TRUNCATE / REFERENCES / TRIGGER on
-- these tables: the same footprint that made `user_credits` dangerous.
--
-- Severity today: not exploitable. RLS blocks every data path, and PostgREST
-- cannot issue TRUNCATE. It becomes live the moment anyone writes a SECURITY
-- INVOKER function against these tables — which is exactly how the user_credits
-- hole would have been reachable if a helper had ever been written casually.
--
-- This is the "check grants, not just policies" rule from the session log,
-- applied to my own work.

revoke all on public.organisations, public.organisation_credits,
              public.organisation_members, public.platform_admins,
              public.transcription_usage
  from anon, authenticated, public;
-- Re-grant only what the console actually needs. Every write is additionally
-- gated by an is_platform_admin() policy, so the grant alone confers nothing.
grant select, insert, update, delete on public.organisations        to authenticated;
grant select, insert, update, delete on public.organisation_credits to authenticated;
grant select, insert, update, delete on public.organisation_members to authenticated;
-- platform_admins: NO grant at all. Membership is read exclusively through the
-- SECURITY DEFINER helper is_platform_admin(), and promotion stays a
-- service-role/psql act, so no session can read or write this table directly.
--
-- transcription_usage: NO grant at all. Only the SECURITY DEFINER functions
-- authorize_transcription / record_transcription touch it.

-- Verify: authenticated must hold only the verbs above, and nothing on the two
-- service-only tables:
--   select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
--     from information_schema.role_table_grants
--    where table_name in ('organisations','organisation_credits',
--          'organisation_members','platform_admins','transcription_usage')
--      and grantee in ('anon','authenticated')
--    group by 1,2 order by 1,2;;
