-- ============================================================================
-- 20260925270000_signup_bonus_server_side.sql
--
-- The one-time free allowance was granted by the BROWSER: js/auth.js ->
-- initUserCredits() inserted the user_credits row on the first page load after
-- sign-in. That made it best-effort and silent:
--
--   * it only ran on a page that loaded auth.js, with a restored session;
--   * it never retried, and the INSERT logged ONLY on success
--     (`if (!ins.error) console.log(...)`) — so a failed grant told nobody, and
--     the user simply saw "0 min" on an unusable account;
--   * it left no trace in credit_transactions. `type = 'signup_bonus'` is allowed
--     by the CHECK constraint and had been written **zero times in the entire
--     history of the table**, so the ledger could not explain a balance — the same
--     dead-branch shape that hid the refund bug for months;
--   * `lifetime_seconds` stayed 0 for bonus-only users, and older users show 15
--     minutes where the code now says 25, i.e. the amount depended on whichever
--     auth.js their browser happened to have cached.
--
-- It worked for all six accounts that existed, which is exactly why it was worth
-- fixing before it silently failed on a real customer.
--
-- This migration grants it at signup, in the same transaction that creates the
-- user, and records it in the ledger. The client path stays as an idempotent
-- fallback for any account that somehow lacks a row.
--
-- NOTE ON THE GUARD: handle_new_user() is SECURITY DEFINER owned by postgres, so
-- current_user inside it is privileged and tg_guard_user_credits() returns early
-- without applying its 120-minute ceiling. The clamp below is therefore explicit
-- rather than inherited — do not assume the trigger is protecting this path.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  -- Keep in step with js/auth.js initUserCredits() and the ceiling comment in
  -- tg_guard_user_credits (signup 25 + referral 15 = 40 < 120).
  c_bonus_minutes constant integer := 25;
  c_bonus_seconds constant integer := 1500;
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

  if c_bonus_minutes > 0 and c_bonus_seconds > 0 then
    insert into public.user_credits (
      user_id, balance_minutes, balance_seconds, lifetime_seconds,
      last_weekly_topup, created_at, updated_at
    )
    values (
      new.id, c_bonus_minutes, c_bonus_seconds, 0, now(), now(), now()
    )
    on conflict (user_id) do nothing;

    -- FOUND is false when ON CONFLICT DO NOTHING skipped the insert, so the ledger
    -- entry is written exactly once even if this function ever runs twice for a user.
    if found then
      insert into public.credit_transactions (
        user_id, type, amount_seconds, balance_after, reference
      )
      values (
        new.id, 'signup_bonus', c_bonus_seconds, c_bonus_seconds,
        'signup_bonus:' || new.id::text
      );
    end if;
  end if;

  return new;
end;
$fn$;
-- Trigger-only function: nobody calls it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Verify after applying — the trigger must still be attached:
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--   -- expect on_auth_user_created;
