begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.review_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lemma text not null,
  normalized text,
  translation_primary text,
  translation_variants text[] not null default '{}',
  accepted_answers text[] not null default '{}',
  pos text,
  cefr text,
  topic text,
  source_type text,
  source_ref text,
  is_saved boolean not null default false,
  is_new boolean not null default true,
  review_state text not null default 'new',
  interval_days integer not null default 0,
  ease_factor numeric(4,2) not null default 2.50,
  reps integer not null default 0,
  lapses integer not null default 0,
  mastery_score integer not null default 0,
  recognition_score integer not null default 0,
  production_score integer not null default 0,
  speech_score integer not null default 0,
  typing_score integer not null default 0,
  last_result text,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  ai_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_words_review_state_check check (review_state in ('new','learning','review','relearning','mastered')),
  constraint review_words_last_result_check check (last_result is null or last_result in ('again','hard','good','easy'))
);

create table if not exists public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  queue_id text not null,
  queue_type text not null,
  mode text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active',
  total_items integer not null default 0,
  completed_items integer not null default 0,
  failed_items integer not null default 0,
  shaky_items integer not null default 0,
  mastered_items integer not null default 0,
  session_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_sessions_status_check check (status in ('active','completed','abandoned')),
  constraint review_sessions_mode_check check (mode in ('review','test_typing','test_speaking'))
);

create table if not exists public.review_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.review_words(id) on delete cascade,
  mode text not null,
  prompt_type text not null,
  user_answer text,
  expected_answer text,
  is_correct boolean not null,
  grade text not null,
  latency_ms integer,
  speech_confidence numeric(5,4),
  pronunciation_score integer,
  transcript_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint review_attempts_mode_check check (mode in ('review','test_typing','test_speaking')),
  constraint review_attempts_grade_check check (grade in ('again','hard','good','easy'))
);

create table if not exists public.review_custom_queues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  filter jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_ai_queues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  rationale text not null,
  filter jsonb not null default '{}'::jsonb,
  word_ids uuid[] not null default '{}',
  rank_score numeric(6,2) not null default 0,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, slug)
);

create index if not exists idx_review_words_user_id on public.review_words(user_id);
create index if not exists idx_review_words_user_next_review_at on public.review_words(user_id, next_review_at);
create index if not exists idx_review_words_user_pos on public.review_words(user_id, pos);
create index if not exists idx_review_words_user_state on public.review_words(user_id, review_state);
create index if not exists idx_review_words_user_saved on public.review_words(user_id, is_saved);
create index if not exists idx_review_words_user_new on public.review_words(user_id, is_new);
create index if not exists idx_review_words_ai_tags on public.review_words using gin(ai_tags);
create index if not exists idx_review_words_metadata on public.review_words using gin(metadata);

create index if not exists idx_review_sessions_user_id on public.review_sessions(user_id);
create index if not exists idx_review_sessions_user_status on public.review_sessions(user_id, status);
create index if not exists idx_review_sessions_started_at on public.review_sessions(user_id, started_at desc);

create index if not exists idx_review_attempts_session_id on public.review_attempts(session_id);
create index if not exists idx_review_attempts_user_id on public.review_attempts(user_id);
create index if not exists idx_review_attempts_word_id on public.review_attempts(word_id);
create index if not exists idx_review_attempts_user_created_at on public.review_attempts(user_id, created_at desc);

create index if not exists idx_review_custom_queues_user_id on public.review_custom_queues(user_id);
create index if not exists idx_review_custom_queues_filter on public.review_custom_queues using gin(filter);

create index if not exists idx_review_ai_queues_user_id on public.review_ai_queues(user_id);
create index if not exists idx_review_ai_queues_rank on public.review_ai_queues(user_id, rank_score desc);

drop trigger if exists trg_review_words_updated_at on public.review_words;
create trigger trg_review_words_updated_at
before update on public.review_words
for each row execute function public.set_updated_at();

drop trigger if exists trg_review_sessions_updated_at on public.review_sessions;
create trigger trg_review_sessions_updated_at
before update on public.review_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_review_custom_queues_updated_at on public.review_custom_queues;
create trigger trg_review_custom_queues_updated_at
before update on public.review_custom_queues
for each row execute function public.set_updated_at();

commit;
