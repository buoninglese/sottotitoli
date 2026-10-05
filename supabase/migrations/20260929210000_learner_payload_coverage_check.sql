-- coverage and payload must agree.
--
-- Every consumer branches on `coverage` alone: a `none` report says "we have no
-- picture of you", a `thin` one hedges, a `substantial` one commits. So if the
-- label and the payload ever disagree, the report lies in one direction or the
-- other — and it lies silently, because nothing downstream re-reads the payload
-- to check.
--
-- extract-learner-profile/shapePayload() already forces agreement in code:
--   * an empty payload becomes 'none', whatever the model called it
--   * 'none' cannot coexist with extracted facts (seen in the wild) — becomes 'thin'
--
-- That is correct but only holds while that one function is the only writer.
-- This constraint makes the disagreement unrepresentable instead of merely
-- unwritten, and it fails loudly at insert time if the two ever drift apart.
--
-- The predicate deliberately mirrors payloadIsEmpty() field for field — if you
-- change one, change the other. A mismatch shows up here as a rejected write,
-- which is the point.

create or replace function public.learner_payload_is_empty(payload jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    -- Lists: any non-empty one means there is something to say.
    (case when jsonb_typeof(payload #> '{goals,short_term}') = 'array'
          then jsonb_array_length(payload #> '{goals,short_term}') else 0 end)
  + (case when jsonb_typeof(payload #> '{goals,long_term}') = 'array'
          then jsonb_array_length(payload #> '{goals,long_term}') else 0 end)
  + (case when jsonb_typeof(payload -> 'difficulties') = 'array'
          then jsonb_array_length(payload -> 'difficulties') else 0 end)
  + (case when jsonb_typeof(payload -> 'contexts') = 'array'
          then jsonb_array_length(payload -> 'contexts') else 0 end)
  + (case when jsonb_typeof(payload -> 'motivation') = 'array'
          then jsonb_array_length(payload -> 'motivation') else 0 end)
  + (case when jsonb_typeof(payload -> 'constraints') = 'array'
          then jsonb_array_length(payload -> 'constraints') else 0 end)
  = 0
  -- Scalars: JS truthiness, so '' counts as absent — it carries no information
  -- and treating it as present would let a blank field imply a real finding.
  and coalesce(payload ->> 'cefr_self_assessed', '') = ''
  and coalesce(payload ->> 'profession_field', '') = '';
$$;
comment on function public.learner_payload_is_empty(jsonb) is
  'True when an extraction payload carries no fact at all. Mirrors payloadIsEmpty() in extract-learner-profile/index.ts; the coverage/payload CHECK constraint depends on that agreement.';
alter table public.learner_profile_extractions
  add constraint learner_profile_extractions_coverage_payload_check
  check ((coverage = 'none') = public.learner_payload_is_empty(payload));
comment on constraint learner_profile_extractions_coverage_payload_check
  on public.learner_profile_extractions is
  'A claim of no data must coincide with an empty payload, and any data must be labelled thin or substantial. Prevents a report from asserting a picture it does not have, or discarding one it does.';
