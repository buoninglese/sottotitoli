begin;

create or replace function public.get_review_dashboard()
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_scheduled_today integer := 0;
  v_overdue integer := 0;
  v_reviewed_today integer := 0;
  v_mastered integer := 0;
  v_in_queue_now integer := 0;
  v_unstable_new integer := 0;
  v_fragile integer := 0;
  v_estimated_minutes_today integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into v_scheduled_today
  from public.review_words
  where user_id = v_user_id
    and next_review_at is not null
    and next_review_at::date = v_now::date;

  select count(*) into v_overdue
  from public.review_words
  where user_id = v_user_id
    and next_review_at is not null
    and next_review_at < v_now;

  select count(*) into v_reviewed_today
  from public.review_attempts
  where user_id = v_user_id
    and created_at::date = v_now::date;

  select count(*) into v_mastered
  from public.review_words
  where user_id = v_user_id
    and review_state = 'mastered';

  select count(*) into v_in_queue_now
  from public.review_words
  where user_id = v_user_id
    and next_review_at is not null
    and next_review_at <= v_now;

  select count(*) into v_unstable_new
  from public.review_words
  where user_id = v_user_id
    and is_new = true;

  select count(*) into v_fragile
  from public.review_words
  where user_id = v_user_id
    and mastery_score < 40;

  v_estimated_minutes_today := ceil(greatest(v_in_queue_now, 0) / 3.0);

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'scheduled_today', v_scheduled_today,
      'overdue', v_overdue,
      'reviewed_today', v_reviewed_today,
      'mastered', v_mastered,
      'in_queue_now', v_in_queue_now,
      'unstable_new', v_unstable_new,
      'fragile', v_fragile,
      'estimated_minutes_today', v_estimated_minutes_today
    )
  );
end;
$$;

create or replace function public.start_review_session(
  p_queue_id text,
  p_queue_type text,
  p_mode text,
  p_total_items integer
)
returns public.review_sessions
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.review_sessions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.review_sessions (
    user_id,
    queue_id,
    queue_type,
    mode,
    total_items
  )
  values (
    v_user_id,
    p_queue_id,
    p_queue_type,
    p_mode,
    coalesce(p_total_items, 0)
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.submit_review_attempt_rpc(
  p_session_id uuid,
  p_word_id uuid,
  p_mode text,
  p_prompt_type text,
  p_user_answer text,
  p_expected_answer text,
  p_is_correct boolean,
  p_grade text,
  p_latency_ms integer,
  p_speech_confidence numeric,
  p_pronunciation_score integer,
  p_transcript_text text,
  p_metadata jsonb,
  p_next_review_at timestamptz,
  p_interval_days integer,
  p_ease_factor numeric,
  p_reps integer,
  p_lapses integer,
  p_mastery_score integer,
  p_recognition_score integer,
  p_production_score integer,
  p_speech_score integer,
  p_typing_score integer,
  p_review_state text,
  p_is_new boolean,
  p_completed_items integer,
  p_failed_items integer,
  p_shaky_items integer,
  p_mastered_items integer
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.review_sessions;
  v_attempt public.review_attempts;
  v_word public.review_words;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_session
  from public.review_sessions
  where id = p_session_id
    and user_id = v_user_id
  limit 1;

  if v_session.id is null then
    raise exception 'Session not found or not owned by current user';
  end if;

  insert into public.review_attempts (
    session_id,
    user_id,
    word_id,
    mode,
    prompt_type,
    user_answer,
    expected_answer,
    is_correct,
    grade,
    latency_ms,
    speech_confidence,
    pronunciation_score,
    transcript_text,
    metadata
  )
  values (
    p_session_id,
    v_user_id,
    p_word_id,
    p_mode,
    p_prompt_type,
    p_user_answer,
    p_expected_answer,
    p_is_correct,
    p_grade,
    p_latency_ms,
    p_speech_confidence,
    p_pronunciation_score,
    p_transcript_text,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_attempt;

  update public.review_words
  set
    last_result = p_grade,
    last_reviewed_at = now(),
    next_review_at = p_next_review_at,
    interval_days = p_interval_days,
    ease_factor = p_ease_factor,
    reps = p_reps,
    lapses = p_lapses,
    mastery_score = p_mastery_score,
    recognition_score = p_recognition_score,
    production_score = p_production_score,
    speech_score = p_speech_score,
    typing_score = p_typing_score,
    review_state = p_review_state,
    is_new = p_is_new
  where id = p_word_id
    and user_id = v_user_id
  returning * into v_word;

  if v_word.id is null then
    raise exception 'Word not found or not owned by current user';
  end if;

  update public.review_sessions
  set
    completed_items = coalesce(p_completed_items, completed_items),
    failed_items = coalesce(p_failed_items, failed_items),
    shaky_items = coalesce(p_shaky_items, shaky_items),
    mastered_items = coalesce(p_mastered_items, mastered_items)
  where id = p_session_id
    and user_id = v_user_id;

  return jsonb_build_object(
    'attempt', row_to_json(v_attempt),
    'word', row_to_json(v_word)
  );
end;
$$;

create or replace function public.complete_review_session(
  p_session_id uuid,
  p_status text,
  p_session_summary jsonb
)
returns public.review_sessions
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.review_sessions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.review_sessions
  set
    status = p_status,
    completed_at = now(),
    session_summary = coalesce(p_session_summary, '{}'::jsonb)
  where id = p_session_id
    and user_id = v_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Session not found or not owned by current user';
  end if;

  return v_row;
end;
$$;

commit;
