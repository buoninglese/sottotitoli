-- Schools: organisations, roles, and POOLED minute balances.
--
-- ══ MODEL ═════════════════════════════════════════════════════════════════════
-- A school ("organisation") buys minutes into ONE pool. Its members draw from
-- that pool. That is what schools actually want to manage, and it avoids
-- month-end reconciliation across dozens of personal balances.
--
--   organisations ──< organisation_members  (role: owner | teacher | student)
--        │                     │
--        │                     └─ student rows also point at their teacher
--        └── organisation_credits (the POOLED balance — 1 row per org)
--
--   platform_admins  — who may create orgs and assign people to them
--
-- Enforcement rule for consumption: a user who is an ACTIVE member of an org
-- spends from that org's pool; everyone else spends from their personal
-- user_credits balance. That keeps consume_session_minutes() the single entry
-- point, so the existing client call site needed no change at all.
--
-- Note on scope: one active org per user for now (current_org_id() takes the
-- first). A person belonging to two schools at once is a later problem, and this
-- design does not block it.
--
-- ══ WHY THE GRANTS BELOW ARE EXPLICIT ═════════════════════════════════════════
-- Supabase's default table ACL hands `anon` and `authenticated` a very broad
-- privilege set. That is how `user_credits` ended up writable by every signed-in
-- user (see 20260924120000). Here the privileges are stated deliberately, and
-- every write path is additionally gated by an is_platform_admin() policy — so a
-- broad GRANT is not on its own sufficient to write anything.
--
-- ⚠️ platform_admins is the exception: it gets NO grants to anon/authenticated at
-- all. Promotion to platform admin is a deliberate service-role/psql act, never
-- something a user can do to themselves.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.organisation_credits (
  org_id          uuid primary key references public.organisations(id) on delete cascade,
  balance_minutes integer not null default 0 check (balance_minutes >= 0),
  balance_seconds integer not null default 0 check (balance_seconds >= 0),
  updated_at      timestamptz not null default now()
);
create table if not exists public.organisation_members (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner','teacher','student')),
  -- For students: the teacher who owns this enrolment. Null for owner/teacher.
  teacher_user_id uuid references auth.users(id) on delete set null,
  status          text not null default 'active' check (status in ('active','invited','removed')),
  created_at      timestamptz not null default now(),
  unique (org_id, user_id)
);
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists organisation_members_org_idx     on public.organisation_members (org_id, role);
create index if not exists organisation_members_user_idx    on public.organisation_members (user_id) where status = 'active';
create index if not exists organisation_members_teacher_idx on public.organisation_members (teacher_user_id) where role = 'student';
drop trigger if exists trg_organisations_updated_at on public.organisations;
create trigger trg_organisations_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
-- ── Helpers ──────────────────────────────────────────────────────────────────
-- ⚠️ SECURITY DEFINER on purpose. These are consulted from RLS policies, and a
-- policy that queries the table it is protecting re-enters itself. The rooms
-- feature already hit exactly that ("infinite recursion detected in policy for
-- relation rooms"); going through a DEFINER helper is the fix.

create or replace function public.is_platform_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where org_id = p_org and user_id = auth.uid() and status = 'active'
  );
$$;
-- Owner or teacher — i.e. may see the whole roster.
create or replace function public.is_org_staff(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where org_id = p_org and user_id = auth.uid()
      and status = 'active' and role in ('owner','teacher')
  );
$$;
-- The caller's active org, if any. Drives which pool pays for a session.
create or replace function public.current_org_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select org_id from public.organisation_members
  where user_id = auth.uid() and status = 'active'
  order by case role when 'owner' then 0 when 'teacher' then 1 else 2 end
  limit 1;
$$;
revoke all on function public.is_platform_admin()      from public, anon;
revoke all on function public.is_org_member(uuid)      from public, anon;
revoke all on function public.is_org_staff(uuid)       from public, anon;
revoke all on function public.current_org_id()         from public, anon;
grant execute on function public.is_platform_admin()   to authenticated;
grant execute on function public.is_org_member(uuid)   to authenticated;
grant execute on function public.is_org_staff(uuid)    to authenticated;
grant execute on function public.current_org_id()      to authenticated;
-- ── Privileges ───────────────────────────────────────────────────────────────
revoke all on public.organisations, public.organisation_credits,
              public.organisation_members, public.platform_admins from anon;
revoke all on public.platform_admins from authenticated;
-- promote via service role only

grant select, insert, update, delete on public.organisations       to authenticated;
grant select, insert, update, delete on public.organisation_credits to authenticated;
grant select, insert, update, delete on public.organisation_members to authenticated;
-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.organisations        enable row level security;
alter table public.organisation_credits enable row level security;
alter table public.organisation_members enable row level security;
alter table public.platform_admins      enable row level security;
drop policy if exists organisations_select on public.organisations;
create policy organisations_select on public.organisations
  for select using (public.is_platform_admin() or public.is_org_member(id));
drop policy if exists organisations_admin_write on public.organisations;
create policy organisations_admin_write on public.organisations
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
-- The pool balance is visible to the org (students should see why they are
-- blocked), but only an admin may change it.
drop policy if exists organisation_credits_select on public.organisation_credits;
create policy organisation_credits_select on public.organisation_credits
  for select using (public.is_platform_admin() or public.is_org_member(org_id));
drop policy if exists organisation_credits_admin_write on public.organisation_credits;
create policy organisation_credits_admin_write on public.organisation_credits
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
-- A member sees their own row; staff see the whole roster; admin sees everything.
drop policy if exists organisation_members_select on public.organisation_members;
create policy organisation_members_select on public.organisation_members
  for select using (
    public.is_platform_admin()
    or user_id = auth.uid()
    or public.is_org_staff(org_id)
  );
drop policy if exists organisation_members_admin_write on public.organisation_members;
create policy organisation_members_admin_write on public.organisation_members
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
-- Read-only, admin-only. No INSERT/UPDATE/DELETE policy exists on purpose, so
-- nobody can grant themselves admin from a browser session.
drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins
  for select using (public.is_platform_admin());
-- ── Guard the pooled balance ─────────────────────────────────────────────────
-- Same shape as the user_credits guard, but the privileged set includes platform
-- admins, because topping up a pool is exactly what an admin does from the
-- admin page (as the `authenticated` role, not service_role).
create or replace function public.tg_guard_org_credits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres','service_role','supabase_admin')
     or public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.balance_minutes > 0 or new.balance_seconds > 0 then
      raise exception using
        errcode = '42501',
        message = 'organisation_credits: only a platform admin may set the starting pool';
    end if;
    return new;
  end if;

  if new.balance_minutes > old.balance_minutes or new.balance_seconds > old.balance_seconds then
    raise exception using
      errcode = '42501',
      message = 'organisation_credits: the pool may only be increased by a platform admin';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_org_credits on public.organisation_credits;
create trigger guard_org_credits
  before insert or update on public.organisation_credits
  for each row execute function public.tg_guard_org_credits();
-- ── Route session minutes through the pool ───────────────────────────────────
-- Replaces the previous version. Behaviour for a user with no org is unchanged;
-- for an org member the minutes come out of the SCHOOL pool instead.
--
-- ⚠️ Kept the corrected signature from 20260924120000: the OUT parameter must not
-- be called `balance_minutes` (it makes the UPDATE ambiguous, error 42702), and
-- the ledger type must be one of the allowed CHECK values.
drop function if exists public.consume_session_minutes(integer);
create or replace function public.consume_session_minutes(p_seconds integer)
returns table(ok boolean, new_balance_minutes integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_minutes integer;
  v_new     integer;
  v_ref     text;
begin
  if v_uid is null then
    return query select false, null::integer, 'not authenticated'::text;
    return;
  end if;

  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    return query select false, null::integer, 'invalid duration'::text;
    return;
  end if;

  v_minutes := ceil(p_seconds / 60.0)::integer;
  v_org     := public.current_org_id();

  -- 1) Pooled school balance takes precedence, when the org has a pool row.
  if v_org is not null then
    update public.organisation_credits oc
       set balance_minutes = greatest(0, oc.balance_minutes - v_minutes),
           balance_seconds = greatest(0, oc.balance_seconds - p_seconds),
           updated_at      = now()
     where oc.org_id = v_org
    returning oc.balance_minutes into v_new;

    if v_new is not null then
      v_ref := 'org_pool:' || v_org::text;
      insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
      values (v_uid, 'session_usage', -p_seconds, v_new * 60, v_ref);

      return query select true, v_new, 'ok (org pool)'::text;
      return;
    end if;
    -- No pool row yet: fall through to the personal balance.
  end if;

  -- 2) Personal balance.
  update public.user_credits uc
     set balance_minutes = greatest(0, uc.balance_minutes - v_minutes),
         balance_seconds = greatest(0, uc.balance_seconds - p_seconds),
         updated_at      = now()
   where uc.user_id = v_uid
  returning uc.balance_minutes into v_new;

  if v_new is null then
    return query select false, null::integer, 'no credits row'::text;
    return;
  end if;

  insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
  values (v_uid, 'session_usage', -p_seconds, v_new * 60, 'consume_session_minutes');

  return query select true, v_new, 'ok'::text;
end;
$$;
revoke all on function public.consume_session_minutes(integer) from public, anon;
grant execute on function public.consume_session_minutes(integer) to authenticated;
-- ══ BOOTSTRAP: make yourself the platform admin (run ONCE, by hand) ══════════
-- Deliberately not part of this migration — granting admin is a deliberate act,
-- and a migration that guessed a user id could grant it to the wrong person.
-- Run with the target email:
--
--   insert into public.platform_admins (user_id, note)
--   select id, 'owner' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;
--
-- Then open admin.html and sign in with that Google account.
--
-- Verify:
--   select * from public.is_platform_admin();          -- as that user: true
--   select * from public.current_org_id();             -- null until they join an org
--   select * from public.consume_session_minutes(60);  -- draws from the pool if in an org;
