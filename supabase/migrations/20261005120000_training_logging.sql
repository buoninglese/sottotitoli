-- ═══════════════════════════════════════════════════════════════════════════
-- D — Training logging
--
-- One row per completed trainer session (training_sessions), plus one row per
-- card for bank/review runs (training_card_results).
--
-- NOTE ON RE-RUNNING: this is written as a first create, matching the agreed
-- SQL. If an earlier version without the check() constraints was already
-- applied by hand, `create table` will fail here; in that case apply only the
-- four constraints, which are listed at the bottom of this file.
--
-- Retention: `on delete cascade` from auth.users means account deletion clears
-- training history automatically. The retention register must say the same.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. training_sessions ───────────────────────────────────────────────────
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bank','review','mission','lesson','test','practice')),
  unit_id text, unit_name text, lang text,
  started_at timestamptz, finished_at timestamptz not null default now(),
  duration_seconds int,
  cards_total int not null default 0, cards_correct int not null default 0,
  accuracy_pct int check (accuracy_pct is null or accuracy_pct between 0 and 100),
  earned_xp int not null default 0,
  again_count int not null default 0, hard_count int not null default 0,
  good_count int not null default 0, easy_count int not null default 0,
  created_at timestamptz not null default now()
);
create index training_sessions_user_finished_idx on public.training_sessions (user_id, finished_at desc);
create index training_sessions_user_unit_idx on public.training_sessions (user_id, unit_id);

-- ── 2. training_card_results ───────────────────────────────────────────────
create table public.training_card_results (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,  -- denormalised for uniform RLS
  word text not null, translation text, pos text, cefr text,
  quality smallint check (quality is null or quality in (1,3,4,5)),   -- SM-2; null for path steps
  result text check (result is null or result in ('again','hard','good','easy')),
  created_at timestamptz not null default now()
);
create index training_card_results_training_idx on public.training_card_results (training_id);

-- ── 3. Row Level Security (owner-only) ─────────────────────────────────────
alter table public.training_sessions enable row level security;
alter table public.training_card_results enable row level security;

create policy own_training_sessions on public.training_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_training_card_results on public.training_card_results
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 4. Verify ──────────────────────────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
--  where schemaname='public'
--    and tablename in ('training_sessions','training_card_results')
--  order by tablename;

-- ═══════════════════════════════════════════════════════════════════════════
-- FALLBACK — only if an earlier version of these tables already exists
-- without the check() constraints. Run these four statements instead of the
-- whole file.
-- ═══════════════════════════════════════════════════════════════════════════
-- alter table public.training_sessions
--   add constraint training_sessions_kind_check
--   check (kind in ('bank','review','mission','lesson','test','practice'));
-- alter table public.training_sessions
--   add constraint training_sessions_accuracy_check
--   check (accuracy_pct is null or accuracy_pct between 0 and 100);
-- alter table public.training_card_results
--   add constraint training_card_results_quality_check
--   check (quality is null or quality in (1,3,4,5));
-- alter table public.training_card_results
--   add constraint training_card_results_result_check
--   check (result is null or result in ('again','hard','good','easy'));
