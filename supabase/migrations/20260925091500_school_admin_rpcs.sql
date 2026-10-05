-- Admin + teacher RPCs for the school console (admin.html).
--
-- The console needs three things the browser cannot do safely on its own:
--   1. look a user up by email (auth.users is not readable by clients),
--   2. add/re-role a member atomically,
--   3. read the roster WITH emails, for admins and for teachers.
--
-- Each is SECURITY DEFINER and refuses to run for a caller who is neither a
-- platform admin nor (for the roster) staff of that organisation. Nothing here
-- accepts a user id from the client for a privileged decision — the client passes
-- an org and an EMAIL, and the server resolves the identity itself.

create or replace function public.admin_find_user_by_email(p_email text)
returns table(user_id uuid, email text, full_name text)
language plpgsql security definer stable
set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'not a platform admin';
  end if;

  return query
    select u.id, u.email::text,
           coalesce(u.raw_user_meta_data->>'full_name', '')::text
      from auth.users u
     where lower(u.email) = lower(trim(p_email))
     limit 1;
end;
$$;
-- Creates or re-roles a member. Passing p_teacher_email links a student to their
-- teacher. Resolves both identities server-side from emails.
create or replace function public.admin_upsert_member(
  p_org uuid,
  p_email text,
  p_role text,
  p_teacher_email text default null
)
returns table(member_id uuid, user_id uuid, role text, was_created boolean)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_uid      uuid;
  v_teacher  uuid;
  v_member   uuid;
  v_created  boolean := false;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'not a platform admin';
  end if;

  if p_role not in ('owner', 'teacher', 'student') then
    raise exception using errcode = '22023', message = 'invalid role';
  end if;

  select u.id into v_uid
    from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_uid is null then
    raise exception using errcode = '23503',
      message = 'No account with that email. They must sign in to Sottotitoli once before you can add them.';
  end if;

  if p_teacher_email is not null and length(trim(p_teacher_email)) > 0 then
    select t.id into v_teacher
      from auth.users t where lower(t.email) = lower(trim(p_teacher_email)) limit 1;
    if v_teacher is null then
      raise exception using errcode = '23503',
        message = 'No account with that teacher email.';
    end if;
  end if;

  select m.id into v_member
    from public.organisation_members m
   where m.org_id = p_org and m.user_id = v_uid;

  if v_member is null then
    insert into public.organisation_members (org_id, user_id, role, teacher_user_id, status)
    values (p_org, v_uid, p_role, v_teacher, 'active')
    returning id into v_member;
    v_created := true;
  else
    update public.organisation_members m
       set role = p_role, teacher_user_id = v_teacher, status = 'active'
     where m.id = v_member;
  end if;

  return query select v_member, v_uid, p_role, v_created;
end;
$$;
create or replace function public.admin_topup_org_pool(p_org uuid, p_minutes integer)
returns table(new_balance_minutes integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'not a platform admin';
  end if;

  -- Bounded so a fat-fingered value cannot create an absurd pool.
  if p_minutes is null or p_minutes <= 0 or p_minutes > 100000 then
    raise exception using errcode = '22023', message = 'top-up must be between 1 and 100000 minutes';
  end if;

  insert into public.organisation_credits (org_id, balance_minutes, balance_seconds)
  values (p_org, p_minutes, p_minutes * 60)
  on conflict (org_id) do update
     set balance_minutes = public.organisation_credits.balance_minutes + p_minutes,
         balance_seconds = public.organisation_credits.balance_seconds + (p_minutes * 60),
         updated_at      = now()
  returning public.organisation_credits.balance_minutes into v_new;

  return query select v_new;
end;
$$;
-- Roster with emails. Usable by a platform admin, or by staff of that org
-- (so a teacher sees their own school without being a platform admin).
create or replace function public.org_roster(p_org uuid)
returns table(user_id uuid, email text, full_name text, role text, status text, teacher_email text)
language plpgsql security definer stable
set search_path = public, auth
as $$
begin
  if not (public.is_platform_admin() or public.is_org_staff(p_org)) then
    raise exception using errcode = '42501', message = 'not allowed for this organisation';
  end if;

  return query
    select m.user_id,
           u.email::text,
           coalesce(u.raw_user_meta_data->>'full_name', '')::text,
           m.role,
           m.status,
           coalesce(t.email::text, '')
      from public.organisation_members m
      join auth.users u on u.id = m.user_id
      left join auth.users t on t.id = m.teacher_user_id
     where m.org_id = p_org
     order by case m.role when 'owner' then 0 when 'teacher' then 1 else 2 end, u.email;
end;
$$;
revoke all on function public.admin_find_user_by_email(text)              from public, anon;
revoke all on function public.admin_upsert_member(uuid, text, text, text) from public, anon;
revoke all on function public.admin_topup_org_pool(uuid, integer)         from public, anon;
revoke all on function public.org_roster(uuid)                           from public, anon;
grant execute on function public.admin_find_user_by_email(text)              to authenticated;
grant execute on function public.admin_upsert_member(uuid, text, text, text) to authenticated;
grant execute on function public.admin_topup_org_pool(uuid, integer)         to authenticated;
grant execute on function public.org_roster(uuid)                           to authenticated;
-- Verify as a non-admin: these must fail with 42501.
--   select * from public.org_roster('<any org>');
--   select * from public.admin_topup_org_pool('<any org>', 100);;
