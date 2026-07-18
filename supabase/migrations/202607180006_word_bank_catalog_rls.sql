-- 202607180006_word_bank_catalog_rls.sql
-- Row-Level Security for new bank catalog tables

begin;

-- Enable RLS
alter table public.review_bank_definitions enable row level security;
alter table public.review_bank_words enable row level security;
alter table public.review_user_learning_profile enable row level security;
alter table public.review_word_relations enable row level security;
alter table public.review_suggestion_feedback enable row level security;

-- bank_definitions: readable by all authenticated users
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'review_bank_definitions'
      and policyname = 'review_bank_definitions_select_all'
  ) then
    create policy review_bank_definitions_select_all
    on public.review_bank_definitions
    for select
    to authenticated
    using (true);
  end if;
end $$;

-- bank_words: per-user CRUD
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_bank_words'
      and policyname = 'review_bank_words_select_own'
  ) then
    create policy review_bank_words_select_own
    on public.review_bank_words for select to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_bank_words'
      and policyname = 'review_bank_words_insert_own'
  ) then
    create policy review_bank_words_insert_own
    on public.review_bank_words for insert to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_bank_words'
      and policyname = 'review_bank_words_update_own'
  ) then
    create policy review_bank_words_update_own
    on public.review_bank_words for update to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_bank_words'
      and policyname = 'review_bank_words_delete_own'
  ) then
    create policy review_bank_words_delete_own
    on public.review_bank_words for delete to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- user_learning_profile: per-user
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_user_learning_profile'
      and policyname = 'review_user_learning_profile_select_own'
  ) then
    create policy review_user_learning_profile_select_own
    on public.review_user_learning_profile for select to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_user_learning_profile'
      and policyname = 'review_user_learning_profile_insert_own'
  ) then
    create policy review_user_learning_profile_insert_own
    on public.review_user_learning_profile for insert to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_user_learning_profile'
      and policyname = 'review_user_learning_profile_update_own'
  ) then
    create policy review_user_learning_profile_update_own
    on public.review_user_learning_profile for update to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_user_learning_profile'
      and policyname = 'review_user_learning_profile_delete_own'
  ) then
    create policy review_user_learning_profile_delete_own
    on public.review_user_learning_profile for delete to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- word_relations: readable by all authenticated
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_word_relations'
      and policyname = 'review_word_relations_select_all'
  ) then
    create policy review_word_relations_select_all
    on public.review_word_relations for select to authenticated
    using (true);
  end if;
end $$;

-- suggestion_feedback: per-user
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_suggestion_feedback'
      and policyname = 'review_suggestion_feedback_select_own'
  ) then
    create policy review_suggestion_feedback_select_own
    on public.review_suggestion_feedback for select to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_suggestion_feedback'
      and policyname = 'review_suggestion_feedback_insert_own'
  ) then
    create policy review_suggestion_feedback_insert_own
    on public.review_suggestion_feedback for insert to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

commit;
