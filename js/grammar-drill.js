/* ═══ Grammar Drill — theory + interactive drills for a concept ═══
 * Renders a concept's explanation and runs its drills in the four databank
 * types (fill-blank, transform, error-correction, mcq), grading each against
 * the stored answer. Exposes window.SottotitoliGrammarDrill.start(cid, container,
 * onExit): draws into `container` and calls onExit(summary) when the learner
 * leaves. Click handling is delegated on document (data-act^="gd-"), so it works
 * regardless of which element hosts the drill. Does not persist.
 */
(function (w) {
  'use strict';

  var GRAMMAR = w.SOTTOTITOLI_GRAMMAR;
  if (!GRAMMAR) { if (w.console) w.console.warn('GrammarDrill: js/grammar-bank.js not loaded'); return; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
  }

  function shuffle(a) {
    var out = a.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  var TYPE_LABEL = { 'fill-blank': 'Completa', 'transform': 'Trasforma', 'error-correction': 'Correggi', 'mcq': 'Scegli' };

  var state = null;

  function start(cid, container, onExit) {
    var concept = (GRAMMAR.concepts || {})[cid] || {};
    var drills = (GRAMMAR.drills || {})[cid] || [];
    state = {
      cid: cid, concept: concept, drills: drills,
      idx: 0, correct: 0, mcqOptions: null, lastResult: null,
      container: container, onExit: onExit || null
    };
    render();
  }

  function render() {
    if (!state) return;
    if (state.idx >= state.drills.length) { renderSummary(); return; }
    var d = state.drills[state.idx];
    if (d.type === 'mcq' && !state.mcqOptions) {
      state.mcqOptions = shuffle([d.answer].concat(d.distractors || []));
    }
    state.container.innerHTML =
      '<div class="gd-wrap">' +
        '<button class="gd-back" data-act="gd-exit"><i class="fa-solid fa-arrow-left"></i> Torna al piano</button>' +
        '<div class="gd-card gd-theory">' +
          '<div class="gd-head"><span class="gd-kicker">Grammatica</span><span class="gd-badge">' + esc(state.cid) + '</span><span class="gd-cefr">' + esc(state.concept.cefr || '') + '</span></div>' +
          '<div class="gd-explanation">' + esc(state.concept.explanation || '') + '</div>' +
        '</div>' +
        '<div class="gd-progress">' +
          '<div class="gd-progress-bar"><div style="width:' + Math.round(state.idx / state.drills.length * 100) + '%"></div></div>' +
          '<span>' + (state.idx + 1) + '/' + state.drills.length + '</span>' +
        '</div>' +
        '<div class="gd-card">' + drillBody(d) + '</div>' +
      '</div>';
  }

  function drillBody(d) {
    var prompt =
      '<div class="gd-prompt"><span class="gd-prompt-label">' + (TYPE_LABEL[d.type] || 'Esercizio') + '</span>' +
      '<div class="gd-prompt-text">' + esc(d.prompt) + '</div></div>';

    if (d.type === 'mcq') {
      var opts = state.mcqOptions.map(function (o) {
        var cls = 'gd-opt';
        if (state.lastResult) {
          if (o === d.answer) cls += ' gd-opt-correct';
          else if (o === state.lastResult.chosen) cls += ' gd-opt-wrong';
        }
        return '<button class="' + cls + '" data-act="gd-mcq" data-opt="' + esc(o) + '" ' + (state.lastResult ? 'disabled' : '') + '>' + esc(o) + '</button>';
      }).join('');
      return prompt + '<div class="gd-opts">' + opts + '</div>' + afterGraded(d);
    }

    var val = state.lastResult ? esc(state.lastResult.chosen || '') : '';
    return prompt +
      '<div class="gd-input-row">' +
        '<input class="gd-input" id="gdAnswer" type="text" autocomplete="off" spellcheck="false" placeholder="Scrivi qui…" value="' + val + '" ' + (state.lastResult ? 'disabled' : '') + '>' +
        (state.lastResult ? '' : '<button class="gd-btn gd-btn-primary" data-act="gd-check">Verifica</button>') +
      '</div>' +
      afterGraded(d);
  }

  function afterGraded(d) {
    if (!state.lastResult) return '';
    var ok = state.lastResult.ok;
    var fb = ok
      ? '<div class="gd-feedback gd-ok"><i class="fa-solid fa-circle-check"></i> Giusto!</div>'
      : '<div class="gd-feedback gd-no"><i class="fa-solid fa-circle-xmark"></i> La risposta era: <b>' + esc(d.answer) + '</b></div>';
    var isLast = state.idx >= state.drills.length - 1;
    return fb + '<div class="gd-nav"><button class="gd-btn gd-btn-primary" data-act="gd-next">' + (isLast ? 'Vedi il riepilogo' : 'Avanti') + '</button></div>';
  }

  function renderSummary() {
    var total = state.drills.length;
    var pct = total ? Math.round(state.correct / total * 100) : 0;
    state.container.innerHTML =
      '<div class="gd-wrap">' +
        '<div class="gd-card gd-summary">' +
          '<div class="gd-kicker">Esercizio completato</div>' +
          '<h2 class="gd-title">' + esc(state.cid) + '</h2>' +
          '<div class="gd-score">' + state.correct + ' su ' + total + ' corrette</div>' +
          '<div class="gd-meter"><div style="width:' + pct + '%"></div></div>' +
          '<div class="gd-nav">' +
            '<button class="gd-btn gd-btn-ghost" data-act="gd-retry">Riprova</button>' +
            '<button class="gd-btn gd-btn-primary" data-act="gd-done">Fatto</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function gradeText() {
    var input = state.container.querySelector && state.container.querySelector('#gdAnswer');
    var val = input ? input.value : '';
    finishGrade(val);
  }

  function finishGrade(chosen) {
    var d = state.drills[state.idx];
    var ok = norm(chosen) === norm(d.answer);
    if (ok) state.correct++;
    state.lastResult = { ok: ok, chosen: chosen };
    render();
  }

  function next() {
    state.idx++;
    state.lastResult = null;
    state.mcqOptions = null;
    render();
  }

  function exit() {
    var summary = { cid: state.cid, correct: state.correct, total: state.drills.length };
    var cb = state.onExit;
    state = null;
    if (cb) cb(summary);
  }

  function retry() {
    state.idx = 0; state.correct = 0; state.lastResult = null; state.mcqOptions = null;
    render();
  }

  function handle(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act^="gd-"]') : null;
    if (!t || !state) return;
    var act = t.getAttribute('data-act');
    if (act === 'gd-exit') exit();
    else if (act === 'gd-check') gradeText();
    else if (act === 'gd-mcq') finishGrade(t.getAttribute('data-opt'));
    else if (act === 'gd-next') next();
    else if (act === 'gd-done') exit();
    else if (act === 'gd-retry') retry();
  }

  document.addEventListener('click', handle);

  w.SottotitoliGrammarDrill = { start: start };
})(window);
