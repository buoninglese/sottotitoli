-- 202607180004_word_bank_catalog_schema.sql
-- Extends review_words with recommendation/scoring columns + creates bank catalog tables

begin;

-- 1. Extend review_words with bank-related signals (IF NOT EXISTS safe)
alter table public.review_words
  add column if not exists first_seen_at timestamptz,
  add column if not exists first_saved_at timestamptz,
  add column if not exists saved_origin text,
  add column if not exists archived_at timestamptz,
  add column if not exists relevance_score numeric(6,2) not null default 0,
  add column if not exists personal_frequency integer not null default 0,
  add column if not exists goal_relevance_score numeric(6,2) not null default 0,
  add column if not exists roadmap_relevance_score numeric(6,2) not null default 0,
  add column if not exists progression_fit_score numeric(6,2) not null default 0,
  add column if not exists final_recommendation_score numeric(6,2) not null default 0,
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_reason text,
  add column if not exists promoted_to_yours_at timestamptz;

-- Constraint for saved_origin
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'review_words_saved_origin_check'
      and conrelid = 'public.review_words'::regclass
  ) then
    alter table public.review_words
      add constraint review_words_saved_origin_check
      check (
        saved_origin is null
        or saved_origin in ('session', 'manual', 'smart', 'import')
      );
  end if;
end $$;

-- 2. Master bank catalog table
create table if not exists public.review_bank_definitions (
  key text primary key,
  title text not null,
  group_key text not null,
  bank_type text not null,
  is_system boolean not null default true,
  is_pinned boolean not null default false,
  is_smart boolean not null default false,
  is_user_creatable boolean not null default false,
  description text not null,
  subtitle_template text,
  empty_state_text text not null,
  sort_mode text not null,
  filter jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_bank_definitions_group_check
    check (group_key in ('pinned','smart','yours')),
  constraint review_bank_definitions_type_check
    check (bank_type in (
      'queue','collection-queue','recommendation',
      'user-collection','rescue-queue','activation-queue'
    ))
);

-- 3. Bank-word membership (materialized bank → word mapping)
create table if not exists public.review_bank_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_key text not null references public.review_bank_definitions(key) on delete cascade,
  word_id uuid not null references public.review_words(id) on delete cascade,
  source_type text not null,
  rank_score numeric(6,2) not null default 0,
  reason_code text,
  reason_text text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, bank_key, word_id),
  constraint review_bank_words_source_check
    check (source_type in ('system','smart','user')),
  constraint review_bank_words_status_check
    check (status in ('active','dismissed','promoted','archived'))
);

-- 4. Learner profile / goals
create table if not exists public.review_user_learning_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_language text,
  native_language text,
  long_term_goal text,
  learner_current_role text,
  target_role text,
  target_domain text,
  target_contexts text[] not null default '{}',
  target_skills text[] not null default '{}',
  learner_stage text,
  roadmap_stage text,
  preferences jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 5. Lexical relations (for Build From What You Know)
create table if not exists public.review_word_relations (
  id uuid primary key default gen_random_uuid(),
  source_word_id uuid not null references public.review_words(id) on delete cascade,
  target_word_id uuid not null references public.review_words(id) on delete cascade,
  relation_type text not null,
  strength numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint review_word_relations_type_check
    check (
      relation_type in (
        'synonym','near_synonym','collocation','derivation',
        'register_upgrade','topic_neighbor','next_step'
      )
    ),
  unique(source_word_id, target_word_id, relation_type)
);

-- 6. User feedback on smart suggestions
create table if not exists public.review_suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_key text not null references public.review_bank_definitions(key) on delete cascade,
  word_id uuid not null references public.review_words(id) on delete cascade,
  action text not null,
  feedback_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint review_suggestion_feedback_action_check
    check (
      action in (
        'accepted','dismissed','promoted_to_yours',
        'not_relevant','already_known','save_for_later'
      )
    )
);

-- 7. Indexes (IF NOT EXISTS via DO blocks)
create index if not exists idx_review_words_first_seen_at
  on public.review_words(user_id, first_seen_at desc);

create index if not exists idx_review_words_saved_origin
  on public.review_words(user_id, saved_origin);

create index if not exists idx_review_words_final_recommendation
  on public.review_words(user_id, final_recommendation_score desc);

create index if not exists idx_review_words_personal_frequency
  on public.review_words(user_id, personal_frequency desc);

create index if not exists idx_review_bank_words_user_bank_rank
  on public.review_bank_words(user_id, bank_key, rank_score desc);

create index if not exists idx_review_bank_words_status
  on public.review_bank_words(user_id, bank_key, status);

create index if not exists idx_review_user_learning_profile_domain
  on public.review_user_learning_profile(target_domain);

create index if not exists idx_review_word_relations_source
  on public.review_word_relations(source_word_id, relation_type);

create index if not exists idx_review_suggestion_feedback_user
  on public.review_suggestion_feedback(user_id, bank_key, created_at desc);

commit;
