-- Migration: Atomic invite join RPC + target-language feed function

-- 1. Atomic join_room_with_invite RPC (eliminates race condition)
create or replace function public.join_room_with_invite(
  p_token_hash text,
  p_display_name text,
  p_source_language text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.room_invites;
  v_member public.room_members;
  v_room public.rooms;
  v_members jsonb;
  v_segments jsonb;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Lock the invite row to prevent concurrent use-count races
  select *
  into v_invite
  from public.room_invites
  where token_hash = p_token_hash
  for update;

  if v_invite.id is null
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= now()
     or v_invite.uses >= v_invite.max_uses then
    raise exception 'invalid_invite';
  end if;

  -- Verify room is available
  select *
  into v_room
  from public.rooms
  where id = v_invite.room_id
  for share;

  -- Check if user already has a membership row
  select *
  into v_member
  from public.room_members
  where room_id = v_invite.room_id
    and user_id = v_user_id
  for update;

  if v_member.id is null then
    -- New member
    insert into public.room_members (
      room_id, user_id, role, display_name, source_language, color
    )
    values (
      v_invite.room_id,
      v_user_id,
      v_invite.role,
      coalesce(nullif(trim(p_display_name), ''), 'Partecipante'),
      p_source_language,
      '#7c3aed'
    )
    returning * into v_member;

    update public.room_invites
    set uses = uses + 1
    where id = v_invite.id;

  elsif v_member.left_at is not null then
    -- Re-activate previous member
    update public.room_members
    set left_at = null,
        joined_at = now(),
        role = v_invite.role
    where id = v_member.id
    returning * into v_member;

    update public.room_invites
    set uses = uses + 1
    where id = v_invite.id;
  end if;

  -- Gather active members
  select coalesce(jsonb_agg(to_jsonb(rm)), '[]'::jsonb)
  into v_members
  from public.room_members rm
  where rm.room_id = v_invite.room_id
    and rm.left_at is null;

  -- Gather existing segments with speaker + translation
  select coalesce(jsonb_agg(to_jsonb(f) order by f.sequence), '[]'::jsonb)
  into v_segments
  from public.room_segment_feed f
  where f.room_id = v_invite.room_id;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'membership', to_jsonb(v_member),
    'members', v_members,
    'segments', v_segments
  );
end;
$$;

-- 2. Target-language-specific feed function
create or replace function public.get_room_segment_feed(
  p_room_id uuid,
  p_target_language text
)
returns table (
  id uuid,
  room_id uuid,
  client_id uuid,
  sequence bigint,
  source_text text,
  source_language text,
  speaker_member_id bigint,
  speaker_name text,
  speaker_language text,
  speaker_color text,
  translation_text text,
  translation_status text,
  translation_error_code text,
  target_language text,
  created_at timestamptz
)
language sql
security invoker
as $$
  select
    s.id,
    s.room_id,
    s.client_id,
    s.sequence,
    s.source_text,
    s.source_language,
    m.id,
    m.display_name,
    m.source_language,
    m.color,
    t.translated_text,
    t.status,
    t.error_code,
    t.target_language,
    s.started_at
  from public.transcript_segments s
  join public.room_members m on m.id = s.speaker_member_id
  left join public.segment_translations t
    on t.segment_id = s.id
   and t.target_language = p_target_language
  where s.room_id = p_room_id
  order by s.sequence;
$$;
