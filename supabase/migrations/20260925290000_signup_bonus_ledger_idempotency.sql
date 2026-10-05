-- ============================================================================
-- 20260925290000_signup_bonus_ledger_idempotency.sql
--
-- Follow-up to 20260925280000. The probe found a books-keeping flaw in it.
--
-- In 280000 the ledger write was guarded by `if found` — "did my INSERT create the
-- balance row?". Delete the balance row and call the self-heal, and the row is
-- created a second time, so a second 'signup_bonus' entry is written: the ledger
-- then claims +4 report credits for a user who holds 2. The balance and its own
-- history disagreed, which is exactly the property this work was meant to give.
--
-- Two changes:
--
-- 1. The ledger is now the idempotency key: a 'signup_bonus' entry is written only
--    if one does not already exist for that user. At most one, ever, per ledger.
--
-- 2. A missing balance row is rebuilt from the ledger — coalesce(sum(amount), bonus)
--    — instead of from a constant. That makes token_transactions the source of truth:
--    a user who never spent the welcome credits is repaired to 2, and a user who
--    spent them is repaired to 0 rather than being handed a fresh 2.
--
-- Only reached when a balance row is absent, which the signup trigger makes
-- impossible for new accounts: this is repair for legacy rows, not a normal path.
-- ============================================================================

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
  v_tokens  integer;
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

    -- Guarded by the ledger, not by whether the row above was created.
    insert into public.credit_transactions (
      user_id, type, amount_seconds, balance_after, reference
    )
    select p_user_id, 'signup_bonus', c_seconds, c_seconds,
           'signup_bonus:' || p_user_id::text
     where not exists (
       select 1 from public.credit_transactions
        where user_id = p_user_id and type = 'signup_bonus'
     );
  end if;

  -- ── report credits ──
  if c_reports > 0 then
    -- What this user was ever given, minus what they spent. Falls back to the full
    -- welcome amount only when there is no history at all.
    select coalesce(sum(amount), c_reports) into v_tokens
      from public.token_transactions
     where user_id = p_user_id;
    if v_tokens < 0 then
      v_tokens := 0;
    end if;

    insert into public.user_tokens (
      user_id, balance, lifetime_tokens, created_at, updated_at
    ) values (
      p_user_id, v_tokens, v_tokens, now(), now()
    )
    on conflict (user_id) do nothing;

    insert into public.token_transactions (
      user_id, amount, type, reference, balance_after, description, created_at
    )
    select p_user_id, c_reports, 'signup_bonus',
           'signup_bonus:' || p_user_id::text, c_reports,
           'Bonus di benvenuto: ' || c_reports || ' report gratuiti', now()
     where not exists (
       select 1 from public.token_transactions
        where user_id = p_user_id and type = 'signup_bonus'
     );
  end if;
end;
$fn$;
revoke execute on function public.grant_signup_bonus(uuid) from public, anon, authenticated;
-- get_token_balance is unchanged — it still delegates here — but restate it so this
-- migration fully describes the function the database is running.
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
grant execute on function public.get_token_balance(uuid) to authenticated;
