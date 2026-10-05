-- ═══════════════════════════════════════════════════════════════════════════
-- learner_profile_extractions — interpret the learner once, then send facts
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHY
--
-- Onboarding collects a lot of free prose: a spoken self-introduction, spoken
-- goals, written goals, a free-text difficulties box, and several `*_other`
-- fields. Two consumers needed it and were handling it in opposite ways:
--
--   * process-ai-reports  used an ALLOW-LIST and sent no prose at all
--   * starter-report      used a DENYLIST and sent the prose deliberately,
--                         commenting "the transcripts stay: they are the richest
--                         signal in the payload" — which is true
--
-- Both were right about their own constraint and the pair was incoherent. The
-- denylist existed because the prose really is the best signal; the allow-list
-- existed because sending prose to a processor outside the EU is hard to
-- justify. Interpretation dissolves the trade-off instead of picking a side:
-- reports then reason over structured facts, and the prose never has to leave
-- the building at all.
--
-- It also lets the product be honest about a learner who wrote almost nothing.
-- `coverage = 'none'` is a first-class outcome, and the extractor does not call
-- the model at all in that case, so nothing is invented and nothing is billed.
--
-- WHAT IS STORED
--
-- Non-identifying facts: goals, difficulty areas, usage contexts, motivation
-- type, self-assessed level, professional field, stated constraints. No names,
-- no locations, no transcripts, no quotations. The prose stays in
-- onboarding_responses, where the learner can purge it (purge_learner_input).

create table if not exists public.learner_profile_extractions (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  schema_version text not null default '1',
  -- The structured facts. The shape is documented in the extractor's prompt; the
  -- only hard requirement here is that every list may be empty and every scalar
  -- may be null, so that "we do not know" is always representable.
  payload        jsonb not null,
  -- How much there was to work with. 'none' means: do not personalise from this.
  coverage       text not null,
  confidence     numeric,
  -- Size of the source text, so a later prompt change can tell whose extraction
  -- was built from almost nothing.
  input_chars    integer not null default 0,
  -- Hash of the source text AND the prompt version. Re-extraction is skipped
  -- when unchanged, which makes the call idempotent, and it re-runs automatically
  -- for everyone when the prompt improves.
  source_hash    text not null,
  model          text,
  prompt_version text,
  -- A failed extraction is recorded, never swallowed: silence here would look
  -- identical to "the learner wrote nothing", and those need opposite handling.
  error_message  text,
  extracted_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint learner_profile_extractions_coverage_check
    check (coverage in ('none', 'thin', 'substantial')),
  constraint learner_profile_extractions_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);
comment on table public.learner_profile_extractions is
  'Structured, non-identifying interpretation of a learner''s onboarding input. Reports read this instead of free prose. Written only by the service role.';
comment on column public.learner_profile_extractions.coverage is
  'none = too little input to personalise from; thin = a little; substantial = enough. Never infer from none.';
comment on column public.learner_profile_extractions.source_hash is
  'Hash of the source prose + prompt_version. Unchanged hash means no re-extraction.';
-- ── RLS ──────────────────────────────────────────────────────────────────
-- Read and delete own. Deliberately NO insert and NO update policy: only the
-- service role writes, so a client cannot fabricate or edit the facts that every
-- report is then built from.
alter table public.learner_profile_extractions enable row level security;
drop policy if exists "Users read own extraction" on public.learner_profile_extractions;
create policy "Users read own extraction"
  on public.learner_profile_extractions
  for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users delete own extraction" on public.learner_profile_extractions;
create policy "Users delete own extraction"
  on public.learner_profile_extractions
  for delete to authenticated
  using (auth.uid() = user_id);
create index if not exists learner_profile_extractions_coverage_idx
  on public.learner_profile_extractions (coverage, extracted_at desc);
-- Index for the backfill sweep: users who completed onboarding but have no
-- extraction, or whose extraction is stale.
create index if not exists learner_profile_extractions_extracted_at_idx
  on public.learner_profile_extractions (extracted_at);
-- ═══════════════════════════════════════════════════════════════════════════
-- purge_learner_input — the learner's own eraser
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The raw prose is kept by default because re-extraction needs it and it is the
-- learner's own record. Keeping it is only defensible if the learner can be rid
-- of it, so this is that control.
--
-- It purges BOTH halves. Deleting the extraction alone would be theatre: the
-- extractor would simply rebuild it from the prose on the next call.
--
-- SECURITY DEFINER, so the ownership guard is the whole of the security. It reads
-- auth.uid() and takes no user argument, which is the point — there is no
-- parameter to substitute in order to erase someone else's data. (The refund bug
-- earlier in this codebase was the same shape: a definer function that asked
-- WHOSE row but never HOW MUCH.)
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

  return jsonb_build_object(
    'success', true,
    'extractions_deleted', v_ext,
    'onboarding_rows_cleared', v_onboard,
    'profile_rows_cleared', v_profiles
  );
end;
$$;
comment on function public.purge_learner_input() is
  'Erases the calling learner''s onboarding prose and its extracted interpretation. Idempotent; takes no user argument by design.';
revoke all on function public.purge_learner_input() from public;
-- Supabase grants EXECUTE to anon/authenticated/service_role by default, and
-- revoking from PUBLIC does not remove those. Anon cannot do anything here
-- (auth.uid() is null, so it returns 'not authenticated'), but leaving the grant
-- means the function looks callable by anyone to whoever reads the ACL next.
revoke all on function public.purge_learner_input() from anon;
grant execute on function public.purge_learner_input() to authenticated;
