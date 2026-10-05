-- Build A: the anonymous session-metrics pipeline that `anonymous_sharing` gates.
--
-- ══ WHY THIS EXISTS ═══════════════════════════════════════════════════════════
-- `user_preferences.anonymous_sharing` is a real boolean with DEFAULT false, and
-- `i18n.js` carries copy describing it exactly:
--
--   "Se attivo, dati anonimi sulle tue sessioni (mai il contenuto delle
--    trascrizioni) possono essere usati per migliorare i modelli di analisi.
--    Nessun dato personale viene mai condiviso."
--
-- The column existed, the copy existed, and NOTHING collected anything — no markup
-- rendered the toggle and no pipeline read it. A privacy switch that controls
-- nothing is worse than no switch, because it invites a user to make a decision on
-- false information. This migration builds the thing the copy describes.
--
-- ══ WHAT IS STORED, AND THE HONEST LIMIT OF "ANONYMOUS" ═══════════════════════
-- One row per session, containing derived SPEECH MEASUREMENTS only:
-- a coarse week, duration, counts and scores. No transcript text, no room name, no
-- topic, no user id, no foreign key to users, and no precise timestamp.
--
-- ⚠️ This is DE-IDENTIFIED, NOT PROVABLY ANONYMOUS. Anyone holding the database can
-- in principle correlate a week plus a distinctive metric combination with a
-- specific session. Under the GDPR that still counts as personal data, so the
-- notice must NOT claim "no personal data is ever shared" — it should say the rows
-- carry no identifier and no transcript content. The i18n string above needs that
-- correction; it is wrong as written.
--
-- `recorded_week` is deliberately the Monday of the ISO week rather than a
-- timestamp: a precise time plus these metrics would identify a session on its own.
--
-- ══ WHY A TRIGGER AND NOT APPLICATION CODE ═══════════════════════════════════
-- The session ends in several code paths (timer, explicit end, abandonment). One
-- trigger on the ended_at transition covers all of them, and it mirrors the shape
-- of the existing `charge_session_on_end` trigger.
--
-- The trigger function SWALLOWS ITS OWN ERRORS on purpose. It runs in the same
-- transaction as billing, so an exception here would roll back the charge — turning
-- a non-critical analytics insert into lost revenue. It reports a warning instead.

create table if not exists public.session_metrics_anonymous (
  id                 bigserial primary key,
  recorded_week      date    not null,
  duration_seconds   integer not null check (duration_seconds > 0),
  words_count        integer,
  unique_words_count integer,
  wpm                numeric,
  lexical_diversity  numeric,
  vocabulary_score   numeric,
  grammar_score      numeric,
  fluency_score      numeric,
  cefr_band          text,
  language_pair      text,
  session_type       text
);
comment on table public.session_metrics_anonymous is
  'De-identified per-session speech measurements, written only when the session owner has anonymous_sharing = true. Carries no user identifier, no transcript content and no precise timestamp. It is de-identified rather than provably anonymous.';
-- The summary is read by week, and the retention job deletes by week.
create index if not exists session_metrics_anonymous_week_idx
  on public.session_metrics_anonymous (recorded_week);
alter table public.session_metrics_anonymous enable row level security;
-- Nothing but the SECURITY DEFINER function below touches this table. The default
-- Supabase ACL would otherwise hand anon/authenticated read AND write access.
revoke all on public.session_metrics_anonymous from anon, authenticated, public;
-- ── Capture ──────────────────────────────────────────────────────────────────
create or replace function public.capture_anonymous_session_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opt_in boolean;
  v_band   text;
begin
  -- Opt-in is checked HERE rather than in the trigger's WHEN clause, so the gate
  -- lives next to the write it protects and stays visible to anyone reading this.
  select coalesce(anonymous_sharing, false) into v_opt_in
    from public.user_preferences
   where user_id = new.user_id;

  if v_opt_in is not true then
    return new;
  end if;

  if coalesce(new.duration_seconds, 0) <= 0 then
    return new;
  end if;

  v_band := (
    select t.b
      from (values
        ('A1', coalesce(new.cefr_a1_count, 0)),
        ('A2', coalesce(new.cefr_a2_count, 0)),
        ('B1', coalesce(new.cefr_b1_count, 0)),
        ('B2', coalesce(new.cefr_b2_count, 0)),
        ('C1', coalesce(new.cefr_c1_count, 0)),
        ('C2', coalesce(new.cefr_c2_count, 0))
      ) as t(b, c)
     where t.c > 0
     order by t.c desc
     limit 1
  );

  insert into public.session_metrics_anonymous (
    recorded_week, duration_seconds, words_count, unique_words_count, wpm,
    lexical_diversity, vocabulary_score, grammar_score, fluency_score,
    cefr_band, language_pair, session_type
  ) values (
    date_trunc('week', new.ended_at)::date,
    new.duration_seconds,
    new.words_count,
    new.unique_words_count,
    new.wpm,
    new.lexical_diversity,
    new.vocabulary_score,
    new.grammar_score,
    new.fluency_score,
    v_band,
    new.language_pair,
    new.session_type
  );

  return new;

exception
  when others then
    -- Never break the session-ending transaction; billing shares it.
    raise warning 'capture_anonymous_session_metrics skipped session %: %', new.id, sqlerrm;
    return new;
end;
$$;
revoke all on function public.capture_anonymous_session_metrics() from anon, authenticated, public;
-- Fires on the same transition as the billing trigger: ended_at going from null to
-- a value, which happens exactly once per session, so this needs no dedup key.
drop trigger if exists capture_anonymous_metrics_on_end on public.sessions;
create trigger capture_anonymous_metrics_on_end
  after update on public.sessions
  for each row
  when (old.ended_at is null and new.ended_at is not null)
  execute function public.capture_anonymous_session_metrics();
-- ── The consumer: what actually reads the collection ─────────────────────────
-- A reading side, so this is a pipeline rather than a dead table. It rolls the
-- measurements up by week, band and session type — the shape you would look at to
-- see whether a difficulty is common across learners at a level.
--
-- ⚠️ Nothing tunes the model prompts from this automatically. That is deliberate:
-- an automatic feedback loop that silently rewrites prompts is not something to
-- invent, and the honest position is that the data is now collected for that
-- purpose and is readable. Feeding it into prompts is a separate decision.
create or replace view public.anonymous_metrics_summary as
select
  recorded_week,
  cefr_band,
  session_type,
  count(*)                                  as sessions,
  round(avg(duration_seconds) / 60.0, 1)     as avg_minutes,
  round(avg(wpm), 1)                         as avg_wpm,
  round(avg(lexical_diversity), 3)           as avg_lexical_diversity,
  round(avg(vocabulary_score), 1)            as avg_vocabulary_score,
  round(avg(grammar_score), 1)               as avg_grammar_score,
  round(avg(fluency_score), 1)               as avg_fluency_score,
  round(avg(unique_words_count), 0)          as avg_unique_words
from public.session_metrics_anonymous
group by recorded_week, cefr_band, session_type;
revoke all on public.anonymous_metrics_summary from anon, authenticated, public;
-- ── Retention ────────────────────────────────────────────────────────────────
-- 24 months. These rows are not attached to a person by any column, but they are
-- still personal data and must not be kept forever by accident — the same mistake
-- transcription_usage made.
create or replace function public.cleanup_anonymous_metrics()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.session_metrics_anonymous
     where recorded_week < (current_date - interval '24 months')::date
    returning id
  )
  select count(*) into deleted_count from deleted;

  raise notice 'cleanup_anonymous_metrics: deleted % rows older than 24 months', deleted_count;
  return deleted_count;
end;
$$;
revoke all on function public.cleanup_anonymous_metrics() from anon, authenticated, public;
-- 04:20, after the two other cleanup jobs, so the deletes never contend.
select cron.schedule(
  'cleanup-anonymous-metrics',
  '20 4 * * *',
  'SELECT cleanup_anonymous_metrics();'
);
-- Verify after applying:
--   select jobname, schedule, active from cron.job
--    where jobname = 'cleanup-anonymous-metrics';               -- one row, active
--   select tgname from pg_trigger
--    where tgrelid = 'public.sessions'::regclass and not tgisinternal;
--                                                  -- 3 rows: billing + notify + this
--   select has_function_privilege('authenticated',
--          'public.capture_anonymous_session_metrics()', 'EXECUTE');  -- false
--
-- Does the gate actually gate? Flip it for one account and end a session:
--   update public.user_preferences set anonymous_sharing = true  where user_id = '<uuid>';
--   -- end a session in the app, then:
--   select count(*) from public.session_metrics_anonymous;      -- increments
--   update public.user_preferences set anonymous_sharing = false where user_id = '<uuid>';
--   -- end another session; the count must NOT move.;
