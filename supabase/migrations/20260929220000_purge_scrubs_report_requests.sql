-- Make "delete my raw answers" true of the whole pipeline, not of the two tables
-- someone happened to think of first.
--
-- purge_learner_input() erased the prose in onboarding_responses and profiles,
-- plus the interpretation. It did not touch the report-request log, where
-- processSynthesisRequest stores the client's context payload (`context`) and a
-- 2000-character snapshot of it (`input_snapshot`). The client used to include
-- `onboarding.goal` — the learner's own written goal, taken from
-- short_term_goal — in that payload, so both columns are a third and fourth copy
-- of text the learner is being told they can delete.
--
-- At the time of writing this is latent: the table holds one row, no synthesis
-- request has ever completed, and no stored context contains an onboarding key.
-- That is exactly why it is worth fixing now rather than after the first
-- Grammatica report puts a learner's own words in a column nobody is scrubbing.
--
-- Both columns are write-only in practice: the report is written from the
-- payload at processing time, and nothing reads either column afterwards. The
-- report itself (session_ai_reports, ai_report_requests.report_markdown) is
-- untouched — the learner asked to delete their answers, not their reports.
--
-- The predicate is deliberately narrow. `module_key`/`prompt_key` '15' and a
-- top-level `onboarding` key identify the synthesis flow exactly. A text search
-- for the word "goal" would also have matched session transcripts, which belong
-- to the separate session-deletion flow and are explicitly out of scope here.

create or replace function public.purge_learner_input()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_ext      integer := 0;
  v_onboard  integer := 0;
  v_profiles integer := 0;
  v_requests integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not authenticated');
  end if;

  -- 1. The interpretation.
  delete from public.learner_profile_extractions where user_id = v_uid;
  get diagnostics v_ext = row_count;

  -- 2. The prose it was built from. Column names are the real ones — PostgREST
  --    rejects unknown columns wholesale, which is how several of these once
  --    drifted for two months while every onboarding row was silently lost.
  update public.onboarding_responses
     set intake_conversation_transcript       = null,
         ai_objectives_conversation_transcript = null,
         shortterm_transcript                 = null,
         short_term_goal                      = null,
         long_term_goal                       = null,
         difficulties_other                   = null,
         heard_from_other                     = null,
         profession_other                     = null,
         native_lang_other                    = null,
         why_english_other                    = null,
         spoken_languages_other               = null,
         improve_languages_other              = null,
         updated_at                           = now()
   where user_id = v_uid;
  get diagnostics v_onboard = row_count;

  -- 3. Free text on profiles that was written FROM the same prose. Leaving these
  --    behind would purge the source and keep the copy.
  update public.profiles
     set goal_primary = null,
         bio_summary  = null,
         native_goals = null,
         updated_at   = now()
   where id = v_uid;
  get diagnostics v_profiles = row_count;

  -- 4. The report-request log, which is the copy added by the synthesis path.
  update public.ai_report_requests
     set context        = null,
         input_snapshot = null
   where user_id = v_uid
     and ( coalesce(module_key, '') = '15'
        or coalesce(prompt_key, '') = '15'
        or context ? 'onboarding' );
  get diagnostics v_requests = row_count;

  return jsonb_build_object(
    'success', true,
    'extractions_deleted', v_ext,
    'onboarding_rows_cleared', v_onboard,
    'profile_rows_cleared', v_profiles,
    'report_requests_scrubbed', v_requests
  );
end;
$$;
comment on function public.purge_learner_input() is
  'Erases the calling learner''s onboarding prose and its extracted interpretation, everywhere it is stored: onboarding_responses, profiles, learner_profile_extractions and the report-request log. Idempotent; takes no user argument by design.';
revoke all on function public.purge_learner_input() from public;
revoke all on function public.purge_learner_input() from anon;
grant execute on function public.purge_learner_input() to authenticated;
