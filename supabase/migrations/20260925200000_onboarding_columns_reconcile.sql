-- ════════════════════════════════════════════════════════════════════════════
--  Reconcile onboarding_responses with what the onboarding form actually sends
-- ════════════════════════════════════════════════════════════════════════════
--  ══ THE BUG ═════════════════════════════════════════════════════════════════
--  onboarding.html → saveToSupabase() upserts onboarding_responses with SEVEN
--  column names that do not exist on the table:
--
--      spoken_languages, spoken_languages_other,
--      improve_languages, improve_languages_other,
--      ui_language, longterm_transcript, shortterm_transcript
--
--  PostgREST rejects a payload containing unknown columns with a 400 and writes
--  NOTHING — the whole row is refused, not just the bad fields. The caller
--  swallows it:
--
--      if (_r.error) {
--        console.warn('onboarding_responses upsert warning:', _r.error.message);
--        // Table might not exist yet — that's ok during development
--      }
--
--  That comment turned a hard failure into an accepted one, so every onboarding
--  since the schema drifted has silently persisted NOTHING to this table while
--  the SEPARATE profiles upsert (same function, further down) succeeded. That is
--  why a profile can look complete while the onboarding record is untouched:
--  confirmed live, profiles.updated_at = 2026-09-25 while the newest
--  onboarding_responses row was 2026-07-28.
--
--  ══ THE FIX: THREE CHOICES, DELIBERATELY DIFFERENT ══════════════════════════
--  1. RENAMED COLUMNS — mapped in the frontend, not duplicated here:
--       spoken_languages        → interested_languages
--       spoken_languages_other  → interested_languages_other
--       longterm_transcript     → ai_objectives_conversation_transcript
--       intake_transcript       → intake_conversation_transcript (already matched)
--  2. NO HOME AT ALL — added below, because the answer is worth keeping:
--       improve_languages, improve_languages_other   (a DIFFERENT question from
--       spoken_languages: "which languages do you want to improve")
--       shortterm_transcript                          (the table held only one
--       free-form transcript slot, and the long-term one already had a home)
--  3. WRONG TABLE ENTIRELY — dropped in the frontend, not added here:
--       ui_language — its proper home is user_preferences.ui_language, which the
--       settings panel already writes. Storing a second copy here would create
--       two sources of truth for one setting.
--
--  ⚠️ `interested_languages` is a MISLEADING NAME for "languages you speak" —
--  it now holds the spoken-languages answer. Left as-is rather than renamed,
--  because a rename is a wider change than this bug needs; noted for cleanup.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.onboarding_responses
  add column if not exists improve_languages        text[],
  add column if not exists improve_languages_other  text,
  add column if not exists shortterm_transcript     text;
comment on column public.onboarding_responses.improve_languages is
  'Languages the user wants to improve (distinct from interested_languages, which holds the languages they already speak).';
comment on column public.onboarding_responses.shortterm_transcript is
  'Free-form short-term goal conversation transcript. The long-term equivalent lives in ai_objectives_conversation_transcript.';
