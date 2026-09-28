/* ═══ Grammar Report Context — assemble the "eternal context" payload ═══
 * In-browser port of enrichment/report_context.py. Builds the single structured
 * object the synthesis-report module (a new ai_report_requests module_key) sends
 * to the LLM. Deterministic, provenance-marked, and flat so it serialises
 * cleanly into the report request's `context` column.
 *
 *   SottotitoliGrammarReportContext.build(profile, onboarding) → payload
 *
 * onboarding: the sottotitoli_onboarding object (native_lang, why_english,
 * difficulties, english_situations, english_level, long_term_goal, short_term_goal).
 * Maps onboarding values into the profiling taxonomies via onboarding-map.yaml.
 */
(function (w) {
  'use strict';

  /* Mirror of enrichment/taxonomy/onboarding-map.yaml. Keep in sync if that
   * taxonomy changes (there is no build step — the databank globals do not yet
   * carry the onboarding map). */
  var ONBOARDING_MAP = {
    difficulties: {
      speaking_fluently: 'collocation',
      listening_native: 'word-order',
      pronunciation: 'spelling',
      vocabulary: 'collocation',
      grammar: 'agreement',
      writing_messages: 'article-use',
      reading_docs: 'word-order',
      understanding_questions: 'question-formation',
      taking_notes: 'word-order'
    },
    english_situations: {
      'Riunioni': 'meeting',
      'Email': 'email',
      'Presentazioni': 'presentation',
      'Conversazioni sociali': 'social',
      'Meetings / Conference calls': 'meeting',
      'Lettura': ''
    },
    why_english: {
      work: 'instrumental',
      study: 'instrumental',
      certification: 'instrumental',
      travel: 'integrative',
      family: 'integrative',
      media: 'intrinsic',
      relocation: 'integrative',
      social_friends: 'integrative'
    },
    english_level: {
      a0: 'A1',
      beginner: 'A1',
      elementary: 'A2',
      intermediate: 'B1',
      'upper-intermediate': 'B2',
      advanced: 'C1'
    }
  };

  function mapOnboarding(onboarding) {
    onboarding = onboarding || {};
    var mapped = { raw: onboarding };
    mapped.difficulties_to_errors = (onboarding.difficulties || [])
      .map(function (d) { return ONBOARDING_MAP.difficulties[d]; })
      .filter(Boolean);
    mapped.situations_to_scenarios = (onboarding.english_situations || [])
      .map(function (s) { return ONBOARDING_MAP.english_situations[s]; })
      .filter(Boolean);
    mapped.why_to_motivation = (onboarding.why_english || [])
      .map(function (v) { return ONBOARDING_MAP.why_english[v]; })
      .filter(Boolean);
    var lvl = onboarding.english_level;
    mapped.self_assessed_cefr = (lvl && ONBOARDING_MAP.english_level[lvl]) || null;
    return mapped;
  }

  function build(profile, onboarding) {
    profile = profile || {};
    var planner = w.SottotitoliGrammarPlanner;
    var plan = planner ? planner.present(profile) : {};
    return {
      report_type: 'synthesis',
      dimensions: profile.dimensions || {},
      context: profile.context || {},
      placement_missed: (profile.placement && profile.placement.missed) || [],
      derived: profile.derived || {},
      plan: {
        treatments: plan.treatments || {},
        report_fragments: plan.report_fragments || [],
        concept_order_head: (plan.concept_order || []).slice(0, 20),
        theory_first: !!plan.theory_first,
        modality_priority: plan.modality_priority || []
      },
      onboarding: mapOnboarding(onboarding),
      provenance: profile.provenance || {}
    };
  }

  w.SottotitoliGrammarReportContext = { build: build, mapOnboarding: mapOnboarding };
})(window);
