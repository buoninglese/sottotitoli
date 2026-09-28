/* ═══ Grammar Intake — questionnaire + placement → profile → plan ═══
 * Drives the Grammatica page (grammatica.html). Walks the branching
 * questionnaire and the 30-item placement, scores via
 * window.SottotitoliGrammarPlanner, persists via
 * window.SottotitoliGrammarProfileStore, and renders the personalised plan:
 *   - the learner's archetype + estimated CEFR
 *   - focus areas (observed placement misses + predicted L1 transfer)
 *   - objectives (from motivation)
 *   - the concept ladder (ordered by plan.ordering)
 *   - the "ripassa" review queue (placement.missed)
 *
 * Adaptive walker mirrors grammar-planner.js scoreQuestionnaire's traversal so
 * the questions shown are exactly the ones the scorer will read back.
 */
(function (w) {
  'use strict';

  var PROFILE = w.SOTTOTITOLI_PROFILE;
  var JOURNEY = w.SOTTOTITOLI_JOURNEY;
  var GRAMMAR = w.SOTTOTITOLI_GRAMMAR;
  var planner = w.SottotitoliGrammarPlanner;
  var store = w.SottotitoliGrammarProfileStore;

  if (!PROFILE || !JOURNEY || !GRAMMAR || !planner || !store) {
    if (w.console) w.console.warn('GrammarIntake: databank/planner/store globals missing — bailing.');
    return;
  }

  /* ── state ── */
  var answers = {};            // qid -> option label
  var placementAnswers = {};   // pid -> chosen option
  var l1 = '';
  var step = 'intro';          // intro | q | p | l1 | result

  var qmap = {};
  (PROFILE.questionnaire.questions || []).forEach(function (q) { qmap[q.id] = q; });

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ── adaptive questionnaire order (mirrors planner traversal) ── */
  function computeOrder() {
    var order = [], visited = {};
    var queue = [PROFILE.questionnaire.start];
    while (queue.length) {
      var qid = queue.shift();
      if (visited[qid] || !qmap[qid]) continue;
      visited[qid] = true;
      order.push(qid);
      var q = qmap[qid];
      var opt = null;
      (q.options || []).forEach(function (o) { if (o.label === answers[qid]) opt = o; });
      if (!opt) { if (q.next) queue.push(q.next); continue; }
      if (opt.follow_up) queue.unshift(opt.follow_up);
      if (q.next) queue.push(q.next);
    }
    return order;
  }

  function nextQuestion() {
    var order = computeOrder();
    for (var i = 0; i < order.length; i++) {
      if (!(order[i] in answers)) return order[i];
    }
    return null;
  }

  function answeredCount() {
    var order = computeOrder();
    var n = 0;
    order.forEach(function (qid) { if (qid in answers) n++; });
    return n;
  }

  /* ── render entry points ── */
  function render() {
    if (step === 'intro') renderIntro();
    else if (step === 'q') renderQuestion();
    else if (step === 'p') renderPlacement();
    else if (step === 'l1') renderL1();
    else if (step === 'result') renderResult();
  }

  function renderIntro() {
    var c = el('giStage');
    c.innerHTML =
      '<div class="gi-card gi-center">' +
        '<div class="gi-kicker">Grammatica · Personalizza il tuo percorso</div>' +
        '<h1 class="gi-title">Conosciamo come impari</h1>' +
        '<p class="gi-sub">Una breve serie di domande (niente voti, niente giudizi) e un rapido test di livello. Alla fine vedrai un piano fatto per te: cosa ripassare, cosa imparare dopo e perché.</p>' +
        '<div class="gi-meta"><span class="gi-chip">' + PROFILE.questionnaire.questions.length + ' domande</span><span class="gi-chip">' + PROFILE.placement.items.length + ' domande di livello</span><span class="gi-chip">~3 minuti</span></div>' +
        '<button class="gi-btn gi-btn-primary" data-act="startQ">Inizia</button>' +
      '</div>';
  }

  function renderQuestion() {
    var qid = nextQuestion();
    if (!qid) { step = 'p'; renderPlacement(); return; }
    var q = qmap[qid];
    var total = computeOrder().length;
    var done = answeredCount();
    var c = el('giStage');
    var opts = (q.options || []).map(function (o) {
      var sel = answers[qid] === o.label ? ' gi-opt-sel' : '';
      return '<button class="gi-opt' + sel + '" data-qopt="' + esc(o.label) + '">' + esc(o.label) + '</button>';
    }).join('');
    c.innerHTML =
      '<div class="gi-progress"><div class="gi-progress-bar"><div style="width:' + Math.round(done / total * 100) + '%"></div></div><span>' + (done + 1) + '/' + total + '</span></div>' +
      '<div class="gi-card">' +
        '<div class="gi-qnum">Domanda ' + (done + 1) + ' di ' + total + '</div>' +
        '<h2 class="gi-qtext">' + esc(q.text) + '</h2>' +
        '<div class="gi-opts">' + opts + '</div>' +
        '<div class="gi-nav">' +
          '<button class="gi-btn gi-btn-ghost" data-act="backQ">Indietro</button>' +
          '<button class="gi-btn gi-btn-primary" data-act="nextQ" ' + (answers[qid] ? '' : 'disabled') + '>Avanti</button>' +
        '</div>' +
      '</div>';
  }

  function renderPlacement() {
    var items = PROFILE.placement.items || [];
    var idx = -1;
    for (var i = 0; i < items.length; i++) { if (!(items[i].id in placementAnswers)) { idx = i; break; } }
    if (idx === -1) { step = 'l1'; renderL1(); return; }
    var p = items[idx];
    var done = Object.keys(placementAnswers).length;
    var c = el('giStage');
    var opts = p.options.map(function (o) {
      var sel = placementAnswers[p.id] === o ? ' gi-opt-sel' : '';
      return '<button class="gi-opt' + sel + '" data-popt="' + esc(o) + '">' + esc(o) + '</button>';
    }).join('');
    c.innerHTML =
      '<div class="gi-progress"><div class="gi-progress-bar"><div style="width:' + Math.round(done / items.length * 100) + '%"></div></div><span>' + done + '/' + items.length + '</span></div>' +
      '<div class="gi-card">' +
        '<div class="gi-kicker">Test di livello · scegli la forma più naturale</div>' +
        '<h2 class="gi-qtext gi-prompt">' + esc(p.prompt) + '</h2>' +
        '<div class="gi-opts">' + opts + '</div>' +
        '<div class="gi-nav">' +
          '<button class="gi-btn gi-btn-ghost" data-act="backP">Indietro</button>' +
          '<button class="gi-btn gi-btn-primary" data-act="nextP" ' + (placementAnswers[p.id] ? '' : 'disabled') + '>Avanti</button>' +
        '</div>' +
      '</div>';
  }

  function renderL1() {
    var opts = [['', 'Preferisco non dirlo'], ['italian', 'Italiano'], ['english', 'English'], ['dutch', 'Nederlands'], ['spanish', 'Español'], ['french', 'Français'], ['german', 'Deutsch'], ['portuguese', 'Português'], ['other', 'Altra lingua']]
      .map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (l1 === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('');
    var c = el('giStage');
    c.innerHTML =
      '<div class="gi-card gi-center">' +
        '<div class="gi-kicker">Ultimo passo</div>' +
        '<h1 class="gi-title">La tua lingua madre</h1>' +
        '<p class="gi-sub">Ci aiuta a prevedere quali errori sono più probabili per chi parla la tua lingua, così il piano li affronta in anticipo.</p>' +
        '<div class="gi-select-wrap"><select id="giL1" class="gi-select">' + opts + '</select></div>' +
        '<button class="gi-btn gi-btn-primary" data-act="compute">Mostra il mio piano</button>' +
      '</div>';
  }

  /* ── result ── */
  var _profile = null, _plan = null;

  function renderResult() {
    var p = _profile, plan = _plan;
    if (!p) return;
    var d = p.derived || {};
    var arch = d.archetype || {};
    var strat = d.plan_params || {};
    var missed = p.placement && p.placement.missed || [];
    var obs = d.error_focus && d.error_focus.observed_missed || [];
    var pred = d.error_focus && d.error_focus.predicted_l1 || [];

    var focusTags = obs.map(function (e) { return '<span class="gi-tag gi-tag-obs">' + esc(e) + '</span>'; }).join('') +
                    pred.map(function (e) { return '<span class="gi-tag gi-tag-pred">' + esc(e) + ' (previsto)</span>'; }).join('');
    if (!focusTags) focusTags = '<span class="gi-tag">nessuna area segnalata</span>';

    var objTags = (d.objectives || []).map(function (o) { return '<span class="gi-tag gi-tag-obj">' + esc(o) + '</span>'; }).join('');

    var ladder = buildLadder();
    var review = buildReview();

    var c = el('giStage');
    c.innerHTML =
      '<div class="gi-result">' +
        '<div class="gi-result-head">' +
          '<div class="gi-kicker">Il tuo piano personalizzato</div>' +
          '<h1 class="gi-title">' + esc(arch.label || 'Learner') + '</h1>' +
          '<div class="gi-badges"><span class="gi-badge">Livello stimato · ' + esc(d.estimated_cefr || 'A1') + '</span></div>' +
        '</div>' +

        '<div class="gi-grid">' +
          '<div class="gi-card">' +
            '<h3 class="gi-h">Come lavori</h3>' +
            '<div class="gi-kv"><span>Durata sessione</span><b>' + esc(strat.session_length) + '</b></div>' +
            '<div class="gi-kv"><span>Ripetizione</span><b>' + esc(strat.repetition) + '</b></div>' +
            '<div class="gi-kv"><span>Ritmo</span><b>' + esc(strat.pace) + '</b></div>' +
            '<div class="gi-kv"><span>Regola prima / esempi prima</span><b>' + (strat.theory_first ? 'Regola prima' : 'Esempi prima') + '</b></div>' +
            '<div class="gi-kv"><span>Correzione</span><b>' + esc(strat.error_handling) + '</b></div>' +
          '</div>' +
          '<div class="gi-card">' +
            '<h3 class="gi-h">Aree di attenzione</h3>' +
            '<div class="gi-tags">' + focusTags + '</div>' +
            '<h3 class="gi-h gi-h-sp">Obiettivi</h3>' +
            '<div class="gi-tags">' + objTags + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="gi-card">' +
          '<h3 class="gi-h">Da ripassare prima (' + missed.length + ')</h3>' +
          '<p class="gi-sub">Questi sono gli errori che hai fatto davvero nel test: il tuo punto di partenza.</p>' +
          review +
        '</div>' +

        '<div class="gi-card">' +
          '<h3 class="gi-h">Il tuo percorso</h3>' +
          '<p class="gi-sub">I concetti ordinati per te, dal più vicino al tuo livello a quelli più lontani.</p>' +
          ladder +
        '</div>' +

        '<div class="gi-nav gi-nav-end">' +
          '<button class="gi-btn gi-btn-ghost" data-act="retake">Rifai il test</button>' +
          '<button class="gi-btn gi-btn-primary" data-act="saved">Fatto</button>' +
        '</div>' +
      '</div>';
  }

  function buildLadder() {
    var order = (_plan && _plan.concept_order) || [];
    var rows = order.slice(0, 20).map(function (cid, i) {
      var j = (JOURNEY.concepts && JOURNEY.concepts[cid]) || {};
      var g = (GRAMMAR.concepts && GRAMMAR.concepts[cid]) || {};
      var stones = (j.stepping_stones || []).map(function (s) { return '<span class="gi-stone">' + esc(s) + '</span>'; }).join('');
      return '<div class="gi-ladder-row">' +
        '<span class="gi-ladder-n">' + (i + 1) + '</span>' +
        '<div class="gi-ladder-body">' +
          '<div class="gi-ladder-head"><span class="gi-ladder-id">' + esc(cid) + '</span><span class="gi-ladder-cefr">' + esc(g.cefr || j.cefr || '') + '</span><span class="gi-ladder-dur">' + esc(j.duration_blocks || '') + '</span></div>' +
          (stones ? '<div class="gi-ladder-stones">' + stones + '</div>' : '') +
        '</div>' +
        '<button class="gi-btn gi-btn-ghost gi-ladder-go" data-act="open-concept" data-concept="' + esc(cid) + '">Esercitati</button>' +
      '</div>';
    }).join('');
    if (!rows) rows = '<p class="gi-sub">Nessun concetto disponibile.</p>';
    return '<div class="gi-ladder">' + rows + '</div>';
  }

  function buildReview() {
    var missed = _profile && _profile.placement && _profile.placement.missed || [];
    if (!missed.length) return '<p class="gi-sub">Nessun errore — ottimo punto di partenza.</p>';
    // group by concept_id to avoid repeating a concept
    var byConcept = {};
    missed.forEach(function (m) {
      var key = m.concept_id || m.error_category || m.item_id;
      (byConcept[key] = byConcept[key] || []).push(m);
    });
    var rows = Object.keys(byConcept).map(function (key) {
      var items = byConcept[key];
      var first = items[0];
      var cid = first.concept_id || key;
      var examples = items.map(function (m) {
        return '<div class="gi-review-item"><span class="gi-review-wrong">' + esc(m.chosen || '—') + '</span><span class="gi-review-arrow">→</span><span class="gi-review-right">' + esc(m.answer || '—') + '</span></div>';
      }).join('');
      return '<div class="gi-review-row">' +
        '<div class="gi-review-head"><span class="gi-ladder-id">' + esc(key) + '</span><span class="gi-tag gi-tag-obs">' + esc(first.error_category || '') + '</span></div>' +
        examples +
        '<button class="gi-btn gi-btn-ghost gi-review-go" data-act="open-concept" data-concept="' + esc(cid) + '">Ripassalo</button>' +
      '</div>';
    }).join('');
    return '<div class="gi-review">' + rows + '</div>';
  }

  /* ── compute: score + persist + render result ── */
  async function compute() {
    var profile = planner.score(answers, placementAnswers, l1 || null);
    var plan = planner.present(profile);
    _profile = profile;
    _plan = plan;
    step = 'result';
    render();
    // Persist (Supabase when authenticated, else localStorage) — non-blocking.
    try { await store.save(profile); } catch (e) { if (w.console) w.console.warn('save failed', e); }
  }

  /* ── event delegation ── */
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-qopt],[data-popt]');
    if (!t) return;
    if (t.hasAttribute('data-qopt')) {
      var qid = nextQuestion();
      if (qid) { answers[qid] = t.getAttribute('data-qopt'); renderQuestion(); }
      return;
    }
    if (t.hasAttribute('data-popt')) {
      var items = PROFILE.placement.items || [];
      var idx = -1;
      for (var i = 0; i < items.length; i++) { if (!(items[i].id in placementAnswers)) { idx = i; break; } }
      if (idx !== -1) { placementAnswers[items[idx].id] = t.getAttribute('data-popt'); renderPlacement(); }
      return;
    }
    var act = t.getAttribute('data-act');
    if (act === 'startQ') { step = 'q'; renderQuestion(); }
    else if (act === 'nextQ') { renderQuestion(); }
    else if (act === 'backQ') { backQuestionnaire(); }
    else if (act === 'nextP') { renderPlacement(); }
    else if (act === 'backP') { backPlacement(); }
    else if (act === 'compute') {
      var sel = el('giL1'); l1 = sel ? sel.value : '';
      compute();
    }
    else if (act === 'retake') { reset(); }
    else if (act === 'saved') { w.location.href = 'panoramica.html'; }
    else if (act === 'open-concept') {
      var cid = t.getAttribute('data-concept');
      var drill = w.SottotitoliGrammarDrill;
      if (drill && cid) {
        drill.start(cid, el('giStage'), function (summary) {
          maybeResolveMiss(cid, summary).then(function () { renderResult(); });
        });
      }
    }
  }

  function backQuestionnaire() {
    var order = computeOrder();
    var answered = order.filter(function (qid) { return qid in answers; });
    if (answered.length) {
      delete answers[answered[answered.length - 1]];
      renderQuestion();
    } else {
      step = 'intro'; renderIntro();
    }
  }

  function backPlacement() {
    var items = PROFILE.placement.items || [];
    var answered = items.map(function (it) { return it.id; }).filter(function (id) { return id in placementAnswers; });
    if (answered.length) {
      delete placementAnswers[answered[answered.length - 1]];
      renderPlacement();
    } else {
      step = 'q'; renderQuestion();
    }
  }

  function reset() {
    answers = {}; placementAnswers = {}; l1 = ''; _profile = null; _plan = null;
    step = 'intro'; renderIntro();
  }

  /* After a drill, drop a missed concept from the review queue once the learner
   * shows mastery (≥80% correct) — the review loop that makes the placement test
   * a living "what I still get wrong" list rather than a one-off gate. */
  function maybeResolveMiss(cid, summary) {
    if (!_profile || !summary || !summary.total) return Promise.resolve();
    var missed = (_profile.placement && _profile.placement.missed) || [];
    var hit = missed.some(function (m) { return m.concept_id === cid; });
    if (!hit) return Promise.resolve();
    var ratio = summary.correct / summary.total;
    if (ratio < 0.8) return Promise.resolve();
    return store.removeMiss(_profile, cid).then(function (updated) { _profile = updated; });
  }

  function init() {
    var stage = el('giStage');
    if (!stage) return;
    stage.addEventListener('click', onClick);
    // If a profile already exists (Supabase when signed in, else localStorage),
    // show the plan directly instead of re-running the intake.
    store.load().then(function (profile) {
      if (profile && profile.derived) {
        _profile = profile;
        _plan = planner.present(profile);
        step = 'result';
        renderResult();
      } else {
        renderIntro();
      }
    }).catch(function () { renderIntro(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
