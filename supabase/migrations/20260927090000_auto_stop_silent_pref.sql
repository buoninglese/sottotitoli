-- Failsafe: end the session when nothing has been transcribed for a while.
--
-- WHY THIS EXISTS
-- Charging is per segment, so balance is spent WHILE the app listens. A session left
-- running with a muted or broken mic, in a silent room, or where recognition simply
-- fails burns minutes and produces nothing. The course/learner never has this problem
-- because it does not meter; the caption session does.
--
-- WHO ENFORCES IT
-- The client, not the database: caption-s8t.html `_enforceSilenceStop()` counts seconds
-- since the last committed sentence and drives the normal stop path (save + stopped UI),
-- showing "Nessuna trascrizione". Same shape as the credits auto-stop.
--
-- This column therefore only RECORDS the preference, exactly like save_sessions and
-- anonymous_sharing. If the switch is ever removed from Settings, remove the client-side
-- enforcement with it rather than leaving a promise behind.
--
-- DEFAULT TRUE on purpose: it is a failsafe, so it must protect the people who never
-- open Settings. ADD COLUMN ... DEFAULT backfills existing rows, so the 2 current rows
-- get it too — no separate UPDATE.
alter table public.user_preferences
  add column if not exists auto_stop_silent boolean not null default true;
comment on column public.user_preferences.auto_stop_silent is
  'Failsafe preference: when true, the caption client ends a session after 5 minutes with no transcribed word. Default true. Enforced in the client (caption-s8t.html -> _enforceSilenceStop), not by a trigger.';
