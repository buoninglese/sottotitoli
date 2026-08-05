begin;

alter table public.review_words enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_attempts enable row level security;
alter table public.review_custom_queues enable row level security;
alter table public.review_ai_queues enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_words' and policyname = 'review_words_select_own'
  ) then
    create policy review_words_select_own
    on public.review_words for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_words' and policyname = 'review_words_insert_own'
  ) then
    create policy review_words_insert_own
    on public.review_words for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_words' and policyname = 'review_words_update_own'
  ) then
    create policy review_words_update_own
    on public.review_words for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_words' and policyname = 'review_words_delete_own'
  ) then
    create policy review_words_delete_own
    on public.review_words for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_sessions' and policyname = 'review_sessions_select_own'
  ) then
    create policy review_sessions_select_own
    on public.review_sessions for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_sessions' and policyname = 'review_sessions_insert_own'
  ) then
    create policy review_sessions_insert_own
    on public.review_sessions for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_sessions' and policyname = 'review_sessions_update_own'
  ) then
    create policy review_sessions_update_own
    on public.review_sessions for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_sessions' and policyname = 'review_sessions_delete_own'
  ) then
    create policy review_sessions_delete_own
    on public.review_sessions for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_attempts' and policyname = 'review_attempts_select_own'
  ) then
    create policy review_attempts_select_own
    on public.review_attempts for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_attempts' and policyname = 'review_attempts_insert_own'
  ) then
    create policy review_attempts_insert_own
    on public.review_attempts for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_attempts' and policyname = 'review_attempts_update_own'
  ) then
    create policy review_attempts_update_own
    on public.review_attempts for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_attempts' and policyname = 'review_attempts_delete_own'
  ) then
    create policy review_attempts_delete_own
    on public.review_attempts for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_custom_queues' and policyname = 'review_custom_queues_select_own'
  ) then
    create policy review_custom_queues_select_own
    on public.review_custom_queues for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_custom_queues' and policyname = 'review_custom_queues_insert_own'
  ) then
    create policy review_custom_queues_insert_own
    on public.review_custom_queues for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_custom_queues' and policyname = 'review_custom_queues_update_own'
  ) then
    create policy review_custom_queues_update_own
    on public.review_custom_queues for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_custom_queues' and policyname = 'review_custom_queues_delete_own'
  ) then
    create policy review_custom_queues_delete_own
    on public.review_custom_queues for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_ai_queues' and policyname = 'review_ai_queues_select_own'
  ) then
    create policy review_ai_queues_select_own
    on public.review_ai_queues for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_ai_queues' and policyname = 'review_ai_queues_insert_own'
  ) then
    create policy review_ai_queues_insert_own
    on public.review_ai_queues for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_ai_queues' and policyname = 'review_ai_queues_update_own'
  ) then
    create policy review_ai_queues_update_own
    on public.review_ai_queues for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'review_ai_queues' and policyname = 'review_ai_queues_delete_own'
  ) then
    create policy review_ai_queues_delete_own
    on public.review_ai_queues for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

commit;
