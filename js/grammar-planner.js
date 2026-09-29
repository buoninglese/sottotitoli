/* ═══ Grammar Planner — intake → learner profile → presentation plan ═══
 * Deterministic in-browser scoring engine (clean-room port of the enrichment
 * layer's intake.py + plan.py). Reads the three databank globals:
 *
 *   window.SOTTOTITOLI_PROFILE  (questionnaire, placement, dimensions,
 *                                archetypes, l1_transfer, dimension_behavior)
 *   window.SOTTOTITOLI_JOURNEY  (concepts: stepping stones, frequency,
 *                                accessible_from, duration_blocks)
 *   window.SOTTOTITOLI_GRAMMAR  (concepts + drills — used by the UI, not here)
 *
 * Exposes window.SottotitoliGrammarPlanner:
 *   .score(answers, placementAnswers, l1)  → learner-profile.json shape
 *   .present(profile)                      → { treatments, report_fragments,
 *                                             concept_order, theory_first,
 *                                             modality_priority }
 *   .ordering(profile)                     → ordered concept ids
 *
 * No backend call, no build step. Pure function of the globals.
 */
(function (w) {
  'use strict';

  var PROFILE = w.SOTTOTITOLI_PROFILE;
  var JOURNEY = w.SOTTOTITOLI_JOURNEY;

  if (!PROFILE) { if (w.console) w.console.warn('GrammarPlanner: js/grammar-profile.js not loaded'); }
  if (!JOURNEY) { if (w.console) w.console.warn('GrammarPlanner: js/grammar-journey.js not loaded'); }

  /* ── Constants (mirrors intake.py) ── */
  var MOTIVATION_OBJECTIVES = {
    instrumental: ['neutral-presentation', 'formal-report', 'job-interview',
                   'work-experience', 'polite-request', 'obligation-talk'],
    integrative: ['socialise', 'travel-talk', 'past-stories', 'describe-people',
                  'describe-place', 'small-talk'],
    intrinsic: ['academic-writing', 'narrative-advanced', 'opinions',
                'hypotheses', 'summarise-talk']
  };

  var MODALITY_WEIGHTS = {
    oral:     { oral: 0.65, typed: 0.25, reading: 0.10 },
    typed:    { oral: 0.15, typed: 0.70, reading: 0.15 },
    reading:  { oral: 0.10, typed: 0.20, reading: 0.70 },
    balanced: { oral: 0.34, typed: 0.33, reading: 0.33 }
  };

  var CEFR_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

  /* ── Questionnaire walker (mirrors intake.score_questionnaire) ──
   * Walks the branching graph: each question has `next`, and a selected option
   * may carry a single `follow_up` question id inserted before resuming the
   * main chain. Scalar dimensions average their `signal`; categorical dimensions
   * take the most common `category`. */
  function scoreQuestionnaire(answers) {
    if (!PROFILE || !PROFILE.questionnaire) return { dims: {}, context: {} };
    var qs = PROFILE.questionnaire.questions || [];
    var qmap = {};
    qs.forEach(function (q) { qmap[q.id] = q; });

    var scalars = {}, categories = {}, context = {}, visited = {};
    var queue = [PROFILE.questionnaire.start];
    while (queue.length) {
      var qid = queue.shift();
      if (visited[qid] || !qmap[qid]) continue;
      visited[qid] = true;
      var q = qmap[qid];
      var chosen = answers && answers[qid];
      var opt = null;
      (q.options || []).forEach(function (o) { if (o.label === chosen) opt = o; });
      if (!opt) { if (q.next) queue.push(q.next); continue; }
      if (typeof opt.signal !== 'undefined' && opt.signal !== null) {
        (scalars[q.dimension] = scalars[q.dimension] || []).push(opt.signal);
      } else if (typeof opt.category !== 'undefined' && opt.category !== null) {
        (categories[q.dimension] = categories[q.dimension] || []).push(opt.category);
      }
      if (q.context && typeof opt.context_value !== 'undefined' && opt.context_value !== null) {
        context[q.context] = opt.context_value;
      }
      if (opt.follow_up) queue.unshift(opt.follow_up);
      if (q.next) queue.push(q.next);
    }

    var dims = {};
    Object.keys(scalars).forEach(function (d) {
      var arr = scalars[d], sum = 0;
      arr.forEach(function (v) { sum += v; });
      dims[d] = pyRound2(sum / arr.length);
    });
    Object.keys(categories).forEach(function (d) {
      dims[d] = mostCommon(categories[d]);
    });
    return { dims: dims, context: context };
  }

  /* Round-half-to-even at 2 decimals, matching Python's round(x, 2) so the
   * port produces byte-identical dimension values to intake.py (e.g. the
   * 0.35+0.5 → 0.425 → 0.42 tie, where JS Math.round would give 0.43). */
  function pyRound2(x) {
    var scaled = x * 100;
    var f = Math.floor(scaled);
    var d = scaled - f;
    if (d < 0.5) return f / 100;
    if (d > 0.5) return (f + 1) / 100;
    return ((f % 2 === 0) ? f : f + 1) / 100;
  }

  function mostCommon(arr) {
    var counts = {};
    arr.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var best = null, bestN = -1;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    return best;
  }

  /* ── Placement scorer (mirrors intake.score_placement) ──
   * Returns [estimatedCefr, missed[]]. `missed` is the observed-diagnostic
   * signal: every item answered wrong, with concept + error category.
   *
   * Level is accuracy-based, not "highest item answered correctly": a single
   * lucky C1 answer while A1/A2/B1 have misses must NOT yield C1. The estimate is
   * the highest level where this level AND every lower level are ≥70% correct.
   * Missed items are sorted basic-first (A1/A2/B1) so the "revise first" queue
   * leads with the fundamentals people slip on at any level. */
  function scorePlacement(answers) {
    var missed = [];
    if (!PROFILE || !PROFILE.placement) return { level: 'A1', missed: missed };

    var perLevel = {};
    (PROFILE.placement.items || []).forEach(function (item) {
      var chosen = answers && answers[item.id];
      var lv = item.level;
      perLevel[lv] = perLevel[lv] || { correct: 0, total: 0 };
      perLevel[lv].total++;
      if (chosen === item.answer) {
        perLevel[lv].correct++;
      } else {
        missed.push({
          item_id: item.id,
          level: lv,
          concept_id: item.concept_id,
          error_category: item.error_category,
          chosen: chosen,
          answer: item.answer
        });
      }
    });

    var THRESHOLD = 0.7;
    var levels = Object.keys(CEFR_ORDER).sort(function (a, b) { return CEFR_ORDER[a] - CEFR_ORDER[b]; });
    var estimated = 'A1';
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var s = perLevel[lv];
      if (!s || s.total === 0) break;
      if (s.correct / s.total < THRESHOLD) break;
      estimated = lv;
    }

    // Basic-level mistakes first — the fundamentals worth revising before anything.
    missed.sort(function (a, b) {
      return (CEFR_ORDER[a.level] || 99) - (CEFR_ORDER[b.level] || 99);
    });

    return { level: estimated, missed: missed };
  }

  /* ── Error focus: observed vs predicted, kept SEPARATE (mirrors intake) ── */
  function resolveErrorFocus(dims, l1, missed) {
    var observed = [];
    (missed || []).forEach(function (m) {
      if (m.error_category && observed.indexOf(m.error_category) === -1) {
        observed.push(m.error_category);
      }
    });
    var predicted = [];
    if (l1 && PROFILE && PROFILE.l1_transfer && PROFILE.l1_transfer[l1]) {
      predicted = (PROFILE.l1_transfer[l1].transfer_errors || []).slice();
    }
    return { observed_missed: observed, predicted_l1: predicted };
  }

  /* ── Archetype: first whose conditions match (mirrors intake.resolve_archetype) ── */
  function resolveArchetype(dims) {
    var archetypes = (PROFILE && PROFILE.archetypes) || [];
    var fallback = (PROFILE && PROFILE.archetype_fallback) || {
      id: 'balanced-learner', label: 'Balanced Learner',
      strategy: { session_length: 'medium', repetition: 'normal', pace: 'normal', theory_first: false, error_handling: 'normal' }
    };
    function matches(cond) {
      for (var dim in cond) {
        var c = cond[dim], v = dims[dim];
        if (v === undefined || v === null) return false;
        if (typeof c.min !== 'undefined' && v < c.min) return false;
        if (typeof c.max !== 'undefined' && v > c.max) return false;
        if (typeof c.eq !== 'undefined' && v !== c.eq) return false;
      }
      return true;
    }
    for (var i = 0; i < archetypes.length; i++) {
      var a = archetypes[i];
      if (matches(a.conditions)) {
        return { id: a.id, label: a.label, strategy: a.strategy };
      }
    }
    return { id: fallback.id, label: fallback.label, strategy: fallback.strategy };
  }

  function derive(dims, estimatedCefr, l1, missed) {
    var motivation = dims.motivation || 'integrative';
    var objectives = MOTIVATION_OBJECTIVES[motivation] || [];
    var errorFocus = resolveErrorFocus(dims, l1, missed);
    var modality = dims.modality || 'balanced';
    var weights = MODALITY_WEIGHTS[modality] || MODALITY_WEIGHTS.balanced;
    var archetype = resolveArchetype(dims);
    var strat = archetype.strategy || {};
    return {
      estimated_cefr: estimatedCefr,
      objectives: objectives,
      error_focus: errorFocus,
      modality_weights: weights,
      plan_params: {
        session_length: strat.session_length || 'medium',
        repetition: strat.repetition || 'normal',
        pace: strat.pace || 'normal',
        theory_first: !!strat.theory_first,
        error_handling: strat.error_handling || 'normal'
      },
      archetype: archetype
    };
  }

  /* ── Top-level score() — mirrors intake.score ── */
  function score(answers, placementAnswers, l1) {
    var qr = scoreQuestionnaire(answers);
    var pr = scorePlacement(placementAnswers);
    var derived = derive(qr.dims, pr.level, l1, pr.missed);
    var profile = {
      dimensions: qr.dims,
      context: qr.context,
      placement: { missed: pr.missed },
      derived: derived,
      provenance: {
        confidence: 'derived-from-questionnaire',
        estimated_cefr: 'derived-from-placement-test',
        archetype: 'derived-from-dimensions',
        error_focus: 'observed-from-placement-misses + predicted-from-l1'
      }
    };
    if (l1) profile.dimensions.l1 = l1;
    return profile;
  }

  /* ── Presentation plan (mirrors plan.py) ── */

  function behavior() { return (PROFILE && PROFILE.dimension_behavior) || {}; }
  function journeyConcepts() { return (JOURNEY && JOURNEY.concepts) || {}; }

  function bandFor(dim, value) {
    if (dim.type === 'scalar') {
      var bands = dim.bands || {};
      for (var name in bands) {
        var b = bands[name];
        if (typeof b.min !== 'undefined' && typeof b.max !== 'undefined') {
          if (b.min <= value && value <= b.max) return { name: name, cfg: b };
        } else if (typeof b.min !== 'undefined') {
          if (value >= b.min) return { name: name, cfg: b };
        } else if (typeof b.max !== 'undefined') {
          if (value <= b.max) return { name: name, cfg: b };
        }
      }
      return { name: null, cfg: null };
    }
    var cat = (dim.categories || {})[value];
    return cat ? { name: value, cfg: cat } : { name: null, cfg: null };
  }

  function treatmentFor(profile) {
    var beh = behavior(), out = {};
    var dims = (profile && profile.dimensions) || {};
    for (var key in beh) {
      var v = dims[key];
      if (v === undefined || v === null) continue;
      var r = bandFor(beh[key], v);
      if (r.cfg && r.cfg.treatment) out[key] = r.cfg.treatment;
    }
    return out;
  }

  function reportFragments(profile) {
    var beh = behavior(), frags = [];
    var dims = (profile && profile.dimensions) || {};
    for (var key in beh) {
      var v = dims[key];
      if (v === undefined || v === null) continue;
      var r = bandFor(beh[key], v);
      if (r.cfg && r.cfg.report_fragment) frags.push(r.cfg.report_fragment);
    }
    return frags;
  }

  function ordering(profile) {
    var journey = journeyConcepts();
    var derived = (profile && profile.derived) || {};
    var level = derived.estimated_cefr || 'A1';
    var usr = CEFR_ORDER[level] || 1;

    function conceptScore(c) {
      var acc = CEFR_ORDER[c.accessible_from || 'A1'] || 1;
      var s = 0.0;
      s -= Math.abs(usr - acc) * 1.5;
      s += (c.frequency || 0.5) * 3;
      return s;
    }

    var ranked = Object.keys(journey).map(function (cid) {
      return { id: cid, s: conceptScore(journey[cid]) };
    });
    ranked.sort(function (a, b) { return b.s - a.s; });
    return ranked.map(function (r) { return r.id; });
  }

  function theoryFirst(profile) {
    var dims = (profile && profile.dimensions) || {};
    return dims.learning_style === 'deductive';
  }

  function modalityPriority(profile) {
    var dims = (profile && profile.dimensions) || {};
    var modality = dims.modality || 'balanced';
    var order = {
      oral:     ['oral', 'typed', 'reading'],
      typed:    ['typed', 'oral', 'reading'],
      reading:  ['reading', 'typed', 'oral'],
      balanced: ['oral', 'typed', 'reading']
    };
    return order[modality] || order.balanced;
  }

  function present(profile) {
    return {
      treatments: treatmentFor(profile),
      report_fragments: reportFragments(profile),
      concept_order: ordering(profile),
      theory_first: theoryFirst(profile),
      modality_priority: modalityPriority(profile)
    };
  }

  w.SottotitoliGrammarPlanner = {
    score: score,
    present: present,
    ordering: ordering,
    scoreQuestionnaire: scoreQuestionnaire,
    scorePlacement: scorePlacement,
    resolveArchetype: resolveArchetype
  };
})(window);
