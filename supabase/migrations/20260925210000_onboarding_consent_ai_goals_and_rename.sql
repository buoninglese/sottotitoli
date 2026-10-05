-- ════════════════════════════════════════════════════════════════════════════
--  Onboarding: record WHICH terms were accepted, keep the AI's objectives, and
--  remove a column-name mismatch that caused a two-month silent data loss.
-- ════════════════════════════════════════════════════════════════════════════
--  Three related changes to one table. Kept in one migration because they are one
--  concern — making the onboarding row trustworthy — and each section is
--  independently reversible.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. TERMS VERSION ───────────────────────────────────────────────────────
-- `terms_consent` and `terms_consent_at` are real columns, but the whole upsert
-- was being rejected for two months (see section 3), so there is currently NO
-- CONSENT RECORD for any user. From now on the row saves, so consent is recorded
-- going forward.
--
-- A timestamp alone proves acceptance but not WHAT was accepted. Storing the
-- version closes that: it must match the "In vigore dal" date in termini.html.
--
-- ⚠️ Historical consents are NOT back-filled. Writing a consent timestamp that
-- cannot be evidenced is worse than having none — it is a fabricated record.
-- Existing users are asked to re-consent instead (js/reconsent.js).
alter table public.onboarding_responses
  add column if not exists terms_version text;
comment on column public.onboarding_responses.terms_version is
  'Terms version accepted at sign-up, matching the "In vigore dal" date in termini.html (e.g. 2026-06-24). NULL for consents recorded before versioning existed.';
-- ─── 2. THE AI'S OWN OBJECTIVES ─────────────────────────────────────────────
-- The starter report returns structured objectives (short_term, long_term) and
-- focus_areas alongside the prose. Those were previously either discarded or —
-- worse — written over the user's OWN answers, because there was only one column
-- for each concept:
--
--     short_term_goal  / long_term_goal   ← the user's words
--     profiles.learning_profile           ← the user's `difficulties`
--
-- The dead saveAiInsightsToSupabase would have overwritten both with AI output.
-- Giving the AI its own columns means the profile can show "what you said" and
-- "what the AI suggests" without one silently replacing the other.
alter table public.onboarding_responses
  add column if not exists ai_short_term_goal text,
  add column if not exists ai_long_term_goal  text,
  add column if not exists ai_focus_areas     jsonb;
comment on column public.onboarding_responses.ai_short_term_goal is
  'AI-generated SMART short-term objective from the starter report. Kept separate from short_term_goal, which holds what the user wrote.';
-- ─── 3. RENAME: interested_languages → spoken_languages ─────────────────────
-- The name mismatch IS the bug this whole change exists to prevent.
-- saveToSupabase sent `spoken_languages`; the column was `interested_languages`;
-- PostgREST rejects a payload with an unknown column with a 400 and writes
-- NOTHING, so every onboarding answer was lost while the separate profiles
-- upsert kept succeeding.
--
-- Renaming the column to the name the form already uses removes the disagreement
-- permanently, instead of leaving a mapping in the code that a future edit can
-- silently break. Verified before renaming that nothing else reads either column:
-- the only references in the whole codebase were the writer and one reader.
--
-- `interested_languages` was also actively misleading — it held the answer to
-- "which languages do you already speak", not "which are you interested in".
-- `improve_languages` (what you want to improve) is a separate column and is
-- unaffected.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'onboarding_responses'
       and column_name = 'interested_languages'
  ) then
    alter table public.onboarding_responses
      rename column interested_languages to spoken_languages;
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'onboarding_responses'
       and column_name = 'interested_languages_other'
  ) then
    alter table public.onboarding_responses
      rename column interested_languages_other to spoken_languages_other;
  end if;
end $$;
-- Positive control for this migration: it should return ZERO rows.
--   select column_name from information_schema.columns
--    where table_name = 'onboarding_responses'
--      and column_name in ('interested_languages','interested_languages_other');;
