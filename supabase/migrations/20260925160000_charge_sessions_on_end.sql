-- Server-side charge when a session ends.
--
-- ══ WHY ═══════════════════════════════════════════════════════════════════════
-- Nothing server-side charged on session finalisation: consume_session_minutes()
-- was only ever invoked by real-mic.js, so a crafted client could simply never
-- call it and take free sessions. This trigger is the backstop — the charge no
-- longer depends on the client choosing to ask for it.
--
-- ══ THE DURATION CHOICE (matters) ═════════════════════════════════════════════
-- The client's duration_seconds EXCLUDES paused time (its timer is cleared on
-- pause), whereas server elapsed (now - created_at) INCLUDES it. Charging server
-- elapsed outright would bill people for thinking. So:
--
--     billable = least(server_elapsed, client_duration  if > 0, else server_elapsed)
--
--   * honest client  → its (pause-excluded) duration, never more → no overcharge;
--   * client that omits it / sends 0 → server elapsed → cannot escape by silence.
-- created_at is server-set, so neither bound can be inflated by the client.
--
-- Everything routes through consume_session_minutes(), so ownership, the elapsed
-- cap, the 'session:<id>' idempotency marker and the per-user daily cap all still
-- apply. Errors are swallowed: a billing failure must never block the save.

create or replace function public.tg_charge_session_on_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_server integer;
  v_client integer;
  v_secs   integer;
begin
  -- Only the user-speaking session types are billable. Unknown (null) types still
  -- charge, so a new type cannot silently become free.
  if new.session_type is not null and new.session_type not in ('caption','solo') then
    return new;
  end if;

  v_server := greatest(0, extract(epoch from (least(new.ended_at, now()) - new.created_at))::integer);
  v_client := coalesce(new.duration_seconds, 0);
  v_secs   := least(v_server, case when v_client > 0 then v_client else v_server end);

  if v_secs > 0 then
    begin
      perform public.consume_session_minutes(v_secs, new.id);
    exception when others then
      raise warning 'charge_session_on_end skipped for %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;
drop trigger if exists charge_session_on_end on public.sessions;
create trigger charge_session_on_end
  after update on public.sessions
  for each row
  when (old.ended_at is null and new.ended_at is not null)
  execute function public.tg_charge_session_on_end();
-- Verify (as an authenticated user, rolled back):
--   update sessions set ended_at = now(), duration_seconds = 0 where id = '<own>';
--   -- -> the balance drops even though consume_session_minutes was never called
--   select * from credit_transactions where reference = 'session:<own>';;
