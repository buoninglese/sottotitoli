-- Grammar planner + synthesis report: schema for the Grammatica feature.
--
-- 1. learner_grammar_profiles — the scored learner profile (opaque jsonb) that
--    the Grammatica page (grammatica.html) reads/writes via js/grammar-profile-store.js.
--    One row per user; the review queue is profile.placement.missed inside the jsonb.
-- 2. ai_report_requests.context — the synthesis report's assembled context
--    (learner profile + onboarding + basis) sent only for module_key='15'.
-- 3. ai_report_modules id 15 — the Synthesis Report module row. Verified on live:
--    ai_report_modules has NO family CHECK constraint (family is a plain NOT NULL
--    text column), so no CHECK is added or relaxed here. The sequence sits at 14;
--    an explicit id insert does not advance it, so setval keeps a future implicit
--    insert from colliding.
--
-- Idempotent (safe to re-run).

-- ── 1. learner_grammar_profiles ───────────────────────────────────────────────
create table if not exists public.learner_grammar_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  profile    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Reuse the existing set_updated_at() (created elsewhere; do NOT re-create it).
drop trigger if exists learner_grammar_profiles_updated_at on public.learner_grammar_profiles;
create trigger learner_grammar_profiles_updated_at
  before update on public.learner_grammar_profiles
  for each row execute function public.set_updated_at();
alter table public.learner_grammar_profiles enable row level security;
drop policy if exists "own grammar profile select" on public.learner_grammar_profiles;
create policy "own grammar profile select"
  on public.learner_grammar_profiles for select using (auth.uid() = user_id);
drop policy if exists "own grammar profile insert" on public.learner_grammar_profiles;
create policy "own grammar profile insert"
  on public.learner_grammar_profiles for insert with check (auth.uid() = user_id);
drop policy if exists "own grammar profile update" on public.learner_grammar_profiles;
create policy "own grammar profile update"
  on public.learner_grammar_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Supabase default ACL grants ALL to anon+authenticated; revoke and re-grant the subset.
revoke all on public.learner_grammar_profiles from anon, authenticated, public;
grant select, insert, update on public.learner_grammar_profiles to authenticated;
-- ── 2. ai_report_requests.context ─────────────────────────────────────────────
alter table public.ai_report_requests
  add column if not exists context jsonb;
-- ── 3. ai_report_modules id 15 ────────────────────────────────────────────────
insert into public.ai_report_modules (id, label, description, family, default_rule)
values (15, 'Synthesis Report',
  'Multi-page personalised profile + plan fused from intake, placement, goals and live sessions',
  'synthesis',
  'Synthesise the learner intake (questionnaire, placement, objectives) with their live-session evidence into one multi-page profile and plan. Write in Italian, translate every score into prose, state the archetype affirmatively, and tie every recommendation to a concrete concept_id + objective.')
on conflict (id) do nothing;
-- An explicit id=15 does not advance the sequence; advance it past the max id so a
-- future implicit insert (nextval) can't collide on 15.
select setval('ai_report_modules_id_seq', (select max(id) from ai_report_modules));
-- ── 4. ai_configs.preset_pricing (bookkeeping only) ───────────────────────────
-- The client reads a hardcoded PRESET_MAP (ai_configs is service_role-only since
-- 20260923_security_hardening.sql); this keeps the server-side pricing in sync.
update public.ai_configs
set config_value = config_value || jsonb_build_object('synthesis', jsonb_build_object('credits', 6, 'module_id', 15))
where config_key = 'preset_pricing';
