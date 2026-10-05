-- ============================================================================
-- 20260925280000_signup_bonus_tokens.sql
--
-- Two changes, one idea: the welcome allowance is decided in exactly one place.
--
-- 1. New accounts get 2 report credits (not 3), granted at signup alongside the
--    25 minutes, and recorded in token_transactions.
--
-- 2. There were THREE writers of the number 3, and they did not agree:
--      * js/auth.js initUserTokens()  -> balance 3, lifetime_tokens 3
--      * get_token_balance()          -> balance 3, lifetime_tokens 0   (self-heal)
--      * the migrations that created those functions
--    That is the same drift that gave some users 15 minutes and others 25: the
--    amount was whatever the calling code happened to say. Now there is one
--    function, and the other two call it.
--
-- Ledger: token_transactions.type has always allowed 'signup_bonus' and, like
-- credit_transactions, it had never been written — so a balance could not be
-- explained by its own history. That is the "keep track" half of the request.
--
-- NOTE ON THE GUARD: grant_signup_bonus() is SECURITY DEFINER owned by postgres,
-- so current_user inside it is privileged and tg_guard_user_tokens() (ceiling 50)
-- returns early. The values below are the check — do not assume the trigger is
-- protecting this path. Same applies to tg_guard_user_credits for the minutes.
-- ============================================================================

-- ── The single source of truth for what a new account is given ───────────────
create or replace function public.grant_signup_bonus(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c_minutes constant integer := 25;      -- once, not weekly (see js/auth.js)
  c_seconds constant integer := 1500;    -- 25 min, the unit the credits ledger uses
  c_reports constant integer := 2;       -- AI report credits
begin
  if p_user_id is null then
    return;
  end if;

  -- ── minutes ──
  if c_minutes > 0 then
    insert into public.user_credits (
      user_id, balance_minutes, balance_seconds, lifetime_seconds,
      last_weekly_topup, created_at, updated_at
    ) values (
      p_user_id, c_minutes, c_seconds, 0, now(), now(), now()
    )
    on conflict (user_id) do nothing;

    -- FOUND is false when ON CONFLICT DO NOTHING skipped the insert, so the ledger
    -- entry is written exactly once per user no matter how often this is called.
    if found then
      insert into public.credit_transactions (
        user_id, type, amount_seconds, balance_after, reference
      ) values (
        p_user_id, 'signup_bonus', c_seconds, c_seconds,
        'signup_bonus:' || p_user_id::text
      );
    end if;
  end if;

  -- ── report credits ──
  if c_reports > 0 then
    insert into public.user_tokens (
      user_id, balance, lifetime_tokens, created_at, updated_at
    ) values (
      p_user_id, c_reports, c_reports, now(), now()
    )
    on conflict (user_id) do nothing;

    if found then
      insert into public.token_transactions (
        user_id, amount, type, reference, balance_after, description, created_at
      ) values (
        p_user_id, c_reports, 'signup_bonus',
        'signup_bonus:' || p_user_id::text, c_reports,
        'Bonus di benvenuto: ' || c_reports || ' report gratuiti', now()
      );
    end if;
  end if;
end;
$fn$;
-- Nobody calls this from a client: it hands out credits. Only the two functions
-- below, which run as their owner, may reach it.
revoke execute on function public.grant_signup_bonus(uuid) from public, anon, authenticated;
-- ── Signup: create the profile, then grant the allowance ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, full_name, avatar_url, created_at, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- Minutes AND report credits, in the same transaction that creates the account.
  perform public.grant_signup_bonus(new.id);

  return new;
end;
$fn$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- ── The self-healing read used by js/panoramica-reportai.js ──────────────────
-- Behaviour is unchanged (returns the balance, refuses another user's id) except
-- that it now heals through the same helper instead of hard-coding its own 3.
create or replace function public.get_token_balance(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_balance integer;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  select balance into v_balance from public.user_tokens where user_id = p_user_id;

  if not found then
    perform public.grant_signup_bonus(p_user_id);
    select balance into v_balance from public.user_tokens where user_id = p_user_id;
  end if;

  return coalesce(v_balance, 0);
end;
$fn$;
-- Replacing a function preserves its ACL, but state it so the grant cannot be lost
-- by accident. This one IS called from the browser.
grant execute on function public.get_token_balance(uuid) to authenticated;
-- Verify after applying:
--   select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
--   -- expect on_auth_user_created
--   select has_function_privilege('authenticated','public.grant_signup_bonus(uuid)','execute');
--   -- expect false;
