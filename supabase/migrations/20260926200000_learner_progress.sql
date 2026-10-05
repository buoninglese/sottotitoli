-- learner_progress — the Learner tab's course state, per user.
--
-- WHY THIS EXISTS: the entire learner state (lesson completions, unit-test records, XP, daily
-- goal, streak, recent mistakes) lived ONLY in localStorage under 'sottotitoli-learner'. That is
-- per-browser, so signing out, switching device or clearing site data silently wiped the course.
-- Now that the guided course is reachable by signed-in users, it has to survive sessions.
--
-- SHAPE: one row per user holding the whole state as jsonb. The client already treats this as a
-- single document (load()/save() read and write one object), the fields are still in flux, and the
-- row is only ever read/written by its owner — so a blob beats normalising lessons/tests into
-- tables today. `updated_at` is the sync tiebreak against the local copy: the client compares it
-- so a fresh device hydrates from the server instead of silently overwriting it with {}.
--
-- SAFETY: SELECT/INSERT/UPDATE for `authenticated` only. No anon grant (explicitly revoked — the
-- Supabase default of granting anon is the footgun that broke user_credits), and no DELETE, since
-- there is no delete UI and account deletion is handled by the FK cascade. The value here is
-- cosmetic (XP/streak, no money), so unlike user_credits/user_tokens it needs no guard trigger —
-- but the blob IS size-capped so it cannot be abused as free storage.

create table if not exists public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint learner_progress_data_size check (pg_column_size(data) < 131072)
);
alter table public.learner_progress enable row level security;
drop policy if exists "Users read own learner progress" on public.learner_progress;
create policy "Users read own learner progress" on public.learner_progress
  for select using (auth.uid() = user_id);
drop policy if exists "Users insert own learner progress" on public.learner_progress;
create policy "Users insert own learner progress" on public.learner_progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own learner progress" on public.learner_progress;
create policy "Users update own learner progress" on public.learner_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.learner_progress to authenticated;
revoke all on public.learner_progress from anon;
-- Verify (read-only, safe to re-run):
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name='learner_progress' order by ordinal_position;
--   select policyname, cmd from pg_policies
--    where schemaname='public' and tablename='learner_progress';
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name='learner_progress' order by grantee, privilege_type;;
