-- Build B: `save_sessions = false` now actually discards the transcript.
--
-- ══ WHAT THIS PROMISES, AND WHY THE WIRING MATTERS ═══════════════════════════
-- `user_preferences.save_sessions` is a real boolean with DEFAULT true, and the
-- copy the Settings panel shows says:
--
--   "Quando attivo, le tue sessioni ... vengono salvate su Supabase e compaiono
--    nella tab Trascrizioni. Se lo disattivi, la sessione resta registrata per il
--    conteggio dei minuti ma il testo della trascrizione viene eliminato alla fine
--    della sessione."
--
-- Until now the switch did nothing at all: the column was read into the settings
-- object and nothing ever enforced it.
--
-- ══ WHY THE ROW ITSELF MUST SURVIVE ══════════════════════════════════════════
-- "Don't save my sessions" cannot mean "don't create the row". `charge_session_on_end`
-- bills from that row, and the minute ledger is derived from it — discarding it would
-- mean a session that cost money leaves no trace and the balance shifts without a
-- record. So the row, the duration and the metrics stay; only the words go.
--
-- ══ WHY THE CONDITION IS BROADER THAN THE BILLING TRIGGER'S ══════════════════
-- `charge_session_on_end` fires on the null→non-null ended_at transition, because
-- billing happens once. This fires on ANY write where `ended_at` is already set, on
-- both INSERT and UPDATE, deliberately: the transcript is written by the client, and
-- a final flush that lands after the session ended would otherwise slip past a
-- transition-only condition and leave the text in place — the exact thing the switch
-- promises not to do. Re-running on later updates is harmless, since the text is
-- already null by then.
--
-- ══ WHAT IT DOES NOT DO ══════════════════════════════════════════════════════
-- It does not touch transcripts already stored. Turning the switch off stops future
-- retention; it does not erase history. That is a real limitation and is stated
-- plainly in the copy rather than implied. Erasing what is already there is a
-- separate decision with a real consequence — the user loses sessions and any
-- reports attached to them — and it should not happen as a silent side effect of
-- flipping a switch.

create or replace function public.drop_transcript_when_not_saving()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_save boolean;
begin
  -- Absent row = defaults apply, and the column default is true.
  select coalesce(save_sessions, true) into v_save
    from public.user_preferences
   where user_id = new.user_id;

  if v_save is not false then
    return new;
  end if;

  new.transcript_text := null;

  -- Diarised speaker segments are produced from the transcript and can carry its
  -- text, so leaving them would keep a copy of what was just discarded.
  new.speaker_analysis_json := null;

  return new;

exception
  when others then
    -- Never break the write. A session that fails to save because a privacy
    -- preference could not be read is a worse outcome than a late transcript, and
    -- the retention job still removes the row eventually.
    raise warning 'drop_transcript_when_not_saving skipped session %: %', new.id, sqlerrm;
    return new;
end;
$$;
revoke all on function public.drop_transcript_when_not_saving() from anon, authenticated, public;
drop trigger if exists drop_transcript_on_end_upd on public.sessions;
create trigger drop_transcript_on_end_upd
  before update on public.sessions
  for each row
  when (new.ended_at is not null)
  execute function public.drop_transcript_when_not_saving();
drop trigger if exists drop_transcript_on_end_ins on public.sessions;
create trigger drop_transcript_on_end_ins
  before insert on public.sessions
  for each row
  when (new.ended_at is not null)
  execute function public.drop_transcript_when_not_saving();
-- Verify after applying:
--   select tgname from pg_trigger
--    where tgrelid = 'public.sessions'::regclass and not tgisinternal order by tgname;
--                                                       -- 5 rows
--   select has_function_privilege('authenticated',
--          'public.drop_transcript_when_not_saving()', 'EXECUTE');   -- false
--
-- Does the switch actually discard? With save_sessions = false, end a session that
-- has a transcript and the text must be gone while duration_seconds survives:
--   select duration_seconds, transcript_text is null as dropped
--     from public.sessions where id = '<uuid>';;
