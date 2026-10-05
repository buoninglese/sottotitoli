-- Harden the balance tables, and add an authoritative minute-deduction RPC.
--
-- ══ THE HOLE ══════════════════════════════════════════════════════════════════
-- `user_credits` and `user_tokens` were granted ALL to `anon` and
-- `authenticated`, with policies:
--     "Users update own credits"   UPDATE  using (auth.uid() = user_id)
--     "Users can insert own credits"        INSERT with check (auth.uid() = user_id)
-- There is NO constraint on the *value*, so any signed-in user could run:
--     update user_credits set balance_minutes = 999999 where user_id = auth.uid();
--     update user_tokens  set balance        = 999999 where user_id = auth.uid();
-- and give themselves unlimited minutes and report credits. That is self-service
-- free usage, and it defeats every other quota control in the product.
--
-- ══ WHY GUARDS INSTEAD OF REVOKING THE GRANTS ═════════════════════════════════
-- The clean end state is GRANT SELECT only, with all writes going through the
-- RPC below. But the shipping client still writes `balance_minutes` directly
-- (js/real-mic.js `_deductSessionMinutes`), and browsers cache JS aggressively.
-- Revoking UPDATE now would make the deduction fail for every client still on
-- the old bundle — silently handing out free sessions until caches turn over.
--
-- So: allow decreases, forbid increases. Non-breaking, and it closes the hole
-- immediately. Revoking UPDATE comes next, once the RPC has been live long
-- enough for caches to expire.
--
-- ⚠️ These trigger functions are deliberately NOT SECURITY DEFINER. Inside a
-- SECURITY DEFINER function `current_user` becomes the function OWNER, which
-- would make the privileged check below always true and silently disable the
-- guard. As invoker-side triggers:
--     direct client UPDATE  -> current_user = 'authenticated'  -> guarded
--     SECURITY DEFINER RPC  -> current_user = 'postgres'       -> allowed
--     service_role client   -> current_user = 'service_role'   -> allowed
-- which is exactly the intended split.

-- ── user_credits ─────────────────────────────────────────────────────────────
create or replace function public.tg_guard_user_credits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_privileged boolean := current_user in ('postgres', 'service_role', 'supabase_admin');
  -- Generous sanity ceilings, well above any legitimate grant (signup 25 +
  -- referral 15 = 40) but far below abuse. Raise them if a real path needs more.
  c_max_minutes  constant integer := 120;
  c_max_seconds  constant integer := 7200;
begin
  if v_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.balance_minutes > c_max_minutes or new.balance_seconds > c_max_seconds then
      raise exception using
        errcode = '42501',
        message = 'user_credits: self-provisioned starting balance exceeds the allowed ceiling';
    end if;
    return new;
  end if;

  -- UPDATE: decreases (and no-ops) are fine; increases are not.
  if new.balance_minutes > old.balance_minutes then
    raise exception using
      errcode = '42501',
      message = 'user_credits: balance_minutes may not be increased by this role';
  end if;
  if new.balance_seconds > old.balance_seconds then
    raise exception using
      errcode = '42501',
      message = 'user_credits: balance_seconds may not be increased by this role';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_user_credits on public.user_credits;
create trigger guard_user_credits
  before insert or update on public.user_credits
  for each row execute function public.tg_guard_user_credits();
-- ── user_tokens (report credits) ─────────────────────────────────────────────
create or replace function public.tg_guard_user_tokens()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_privileged boolean := current_user in ('postgres', 'service_role', 'supabase_admin');
  c_max_balance  constant integer := 50;
begin
  if v_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.balance > c_max_balance then
      raise exception using
        errcode = '42501',
        message = 'user_tokens: self-provisioned starting balance exceeds the allowed ceiling';
    end if;
    return new;
  end if;

  if new.balance > old.balance then
    raise exception using
      errcode = '42501',
      message = 'user_tokens: balance may not be increased by this role';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_user_tokens on public.user_tokens;
create trigger guard_user_tokens
  before insert or update on public.user_tokens
  for each row execute function public.tg_guard_user_tokens();
-- ══ Authoritative minute deduction ════════════════════════════════════════════
-- Replaces the client-computed `balance_minutes` write. SECURITY DEFINER, so it
-- runs as the owner: the client cannot pick its own price, and the trigger above
-- permits the write because current_user is then 'postgres'.
--
-- Idempotency is NOT provided here — this deducts what it is told. Callers must
-- pass the session's own duration once. When the client is switched over, the
-- session row becomes the source of truth for that number.
create or replace function public.consume_session_minutes(p_seconds integer)
returns table(ok boolean, balance_minutes integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_minutes integer;
  v_new     integer;
begin
  if v_uid is null then
    return query select false, null::integer, 'not authenticated'::text;
    return;
  end if;

  -- Guard the input: a client must not be able to send a negative duration
  -- (which would top up) or an absurd one.
  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    return query select false, null::integer, 'invalid duration'::text;
    return;
  end if;

  v_minutes := ceil(p_seconds / 60.0)::integer;

  update public.user_credits
     set balance_minutes = greatest(0, balance_minutes - v_minutes),
         balance_seconds = greatest(0, balance_seconds - p_seconds),
         updated_at      = now()
   where user_id = v_uid
  returning balance_minutes into v_new;

  if v_new is null then
    return query select false, null::integer, 'no credits row'::text;
    return;
  end if;

  insert into public.credit_transactions (user_id, type, amount_seconds, balance_after, reference)
  values (v_uid, 'session', -p_seconds, v_new * 60, 'consume_session_minutes');

  return query select true, v_new, 'ok'::text;
end;
$$;
revoke all on function public.consume_session_minutes(integer) from public, anon;
grant execute on function public.consume_session_minutes(integer) to authenticated;
-- Verify after applying:
--   select tgname from pg_trigger where tgrelid = 'public.user_credits'::regclass;
--   -- as an authenticated user this must FAIL:
--   --   update user_credits set balance_minutes = balance_minutes + 1000;
--   -- and this must SUCCEED:
--   --   select * from consume_session_minutes(120);;
