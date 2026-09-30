/* ═══ Grammar Intake — questionnaire + placement → profile → plan ═══
 * Drives the Grammatica panel (pnl-grammatica in panoramica.html). Walks the
 * branching questionnaire and the 30-item placement, scores via
 * window.SottotitoliGrammarPlanner, persists via
 * window.SottotitoliGrammarProfileStore, and renders the personalised plan:
 *   - the learner's archetype + estimated CEFR
 *   - focus areas (observed placement misses + predicted L1 transfer)
 *   - objectives (from motivation)
 *   - the concept ladder (ordered by plan.ordering)
 *   - the "ripassa" review queue (placement.missed)
 *   - the 2-credit report (delegated to window.SottotitoliGrammarReport)
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

  // ── Report gate ──
  // Kill-switch for the 2-credit report. False hides the report card and blocks
  // generation. Backend module 15 is live; leave true unless it needs to be
  // disabled in an emergency.
  var SYNTHESIS_ENABLED = true;

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

        (SYNTHESIS_ENABLED ?
        '<div class="gi-card gi-report-card">' +
          '<div class="gi-kicker">Il tuo report</div>' +
          '<h3 class="gi-h">Ottieni il report completo</h3>' +
          '<p class="gi-sub">Un report che unisce il tuo onboarding e il questionario, con una panoramica dei tuoi errori e i prossimi passi.</p>' +
          // Point-of-collection disclosure. Must match what grammar-report-context.js
          // actually sends; see the privacy note in that file.
          '<p class="gi-sub" style="font-size:12px;opacity:.85;margin-top:10px" data-i18n="gi_privacy">Scritto da OpenAI (Stati Uniti) a partire dal tuo profilo di apprendimento: obiettivi, difficoltà dichiarate, livello stimato e risultati del test. Non inviamo il tuo nome, la tua posizione o i tuoi contatti. <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Informativa completa</a></p>' +
          '<div class="gi-report-cost">2 crediti</div>' +
          '<button class="gi-btn gi-btn-primary" data-act="gen-report">Genera il report</button>' +
        '</div>' : '') +

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

        signalsHtml() +

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

  /* ── Passive signals: a small line graph of one metric over sessions ── */
  function lineGraph(history, key, color) {
    var vals = history.map(function (h) { return h[key]; });
    var usable = vals.filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    if (usable.length < 2) return '';
    var W = 340, H = 110, P = 14;
    var min = Math.min.apply(null, usable), max = Math.max.apply(null, usable);
    var range = (max - min) || 1;
    function x(i) { return P + (W - 2 * P) * (i / (vals.length - 1)); }
    function y(v) { return H - P - (H - 2 * P) * ((v - min) / range); }
    var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var dots = vals.map(function (v, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.5" fill="' + color + '"/>';
    }).join('');
    return '<svg class="gi-graph" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
    '</svg>';
  }

  /* ── Passive signals card — surfaced only after the composite threshold ── */
  function signalsHtml() {
    var p = _profile && _profile.passive;
    if (!p) {
      return '<div class="gi-card">' +
        '<h3 class="gi-h">I tuoi segnali</h3>' +
        '<p class="gi-sub">Completa qualche sessione di conversazione e qui vedrai la tua fluenza: parole al minuto, esitazioni, pause e varietà lessicale.</p>' +
        '</div>';
    }
    if (!p.reliable) {
      var t = p.thresholds || { sessions: 3, minutes: 10, words: 800 };
      return '<div class="gi-card">' +
        '<h3 class="gi-h">I tuoi segnali</h3>' +
        '<p class="gi-sub">Ancora pochi dati per un quadro affidabile: hai ' + p.sessions_analyzed + ' sessioni, ' + p.total_minutes + ' minuti, ' + p.total_words + ' parole. Servono almeno ' + t.sessions + ' sessioni, ' + t.minutes + ' minuti e ' + t.words + ' parole.</p>' +
        '</div>';
    }
    var m = p.metrics || {};
    function v(x, suffix) { return (x == null) ? '—' : (suffix ? x + suffix : x); }
    var graph = lineGraph(p.history || [], 'wpm', 'var(--accent)');
    return '<div class="gi-card">' +
      '<h3 class="gi-h">I tuoi segnali</h3>' +
      '<p class="gi-sub">Da ' + p.sessions_analyzed + ' sessioni (' + p.total_minutes + ' minuti, ' + p.total_words + ' parole).</p>' +
      '<div class="gi-signals">' +
        '<div class="gi-signal"><span>Fluenza (parole/min)</span><b>' + v(m.wpm) + '</b></div>' +
        '<div class="gi-signal"><span>Esitazioni (per 100 parole)</span><b>' + v(m.hesitation_rate) + '</b></div>' +
        '<div class="gi-signal"><span>Pausa media</span><b>' + v(m.pause_avg_seconds, 's') + '</b></div>' +
        '<div class="gi-signal"><span>Code-switching</span><b>' + (m.code_switch_ratio != null ? Math.round(m.code_switch_ratio * 100) + '%' : '—') + '</b></div>' +
        '<div class="gi-signal"><span>Varietà lessicale</span><b>' + v(m.vocab_diversity) + '</b></div>' +
      '</div>' +
      (graph ? '<div class="gi-graph-label">Fluenza (parole al minuto) nel tempo</div>' + graph : '') +
      '</div>';
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
    else if (act === 'saved') {
      var nav = document.querySelector('[data-panel="panoramica"]');
      if (nav) nav.click();
    }
    else if (act === 'gen-report') { generateReport(); }
    else if (act === 'back-from-report') { renderResult(); }
    else if (act === 'open-concept') {
      var cid = t.getAttribute('data-concept');
      var drill = w.SottotitoliGrammarDrill;
      if (drill && cid) {
        step = 'drill';
        drill.start(cid, el('giStage'), function (summary) {
          step = 'result';
          // Log the attempt (incl. mistakes) as observed context, then resolve
          // the review queue, then re-render. Sequenced so each write lands.
          maybeResolveMiss(cid, summary).then(function () {
            return store.logExercise(_profile, summary);
          }).then(function () { renderResult(); });
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

  /* Generate the 2-credit report (onboarding + questionnaire synthesis) directly
   * in the Grammatica panel via js/grammar-report.js. The profile is already
   * persisted, so the report context can be built from it. */
  function generateReport() {
    if (!SYNTHESIS_ENABLED) return;
    var report = w.SottotitoliGrammarReport;
    if (!report) return;
    report.generate(_profile, el('giStage'));
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

  /* Fold passive signals (WPM, hesitation, pauses, code-switching, observed
   * error categories) from recent live-caption sessions into the profile, so
   * the plan reflects measured behaviour rather than only the intake snapshot.
   * Guarded: only re-renders if the user is still on the result view. */
  function maybeFoldPassive(profile) {
    var ps = w.SottotitoliPassiveSignals;
    if (!ps) return;
    ps.applyFromRecentSessions(profile).then(function (updated) {
      if (updated && updated.passive) {
        _profile = updated;
        _plan = planner.present(updated);
        store.save(updated);
        if (step === 'result') renderResult();
      }
    }).catch(function () {});
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
        maybeFoldPassive(profile);
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
