/* ═══ Grammar Exercises — suggested concepts + search + to-do list ═══
 * Renders the "Esercizi" subtab of the Grammatica panel (pnl-grammatica):
 *   - 3 suggested concepts (personalised via the plan's concept_order), each in a
 *     box with an objective link and a "what you'll learn" summary,
 *   - a search box over all concepts (results can be added to the to-do list),
 *   - the to-do list itself (concepts the learner queued).
 * Starting a concept opens the drill (js/grammar-drill.js); on completion the
 * attempt (including mistaken answers) is logged to the profile as observed
 * context via SottotitoliGrammarProfileStore.logExercise.
 */
(function (w) {
  'use strict';

  var GRAMMAR = w.SOTTOTITOLI_GRAMMAR;
  var JOURNEY = w.SOTTOTITOLI_JOURNEY;
  var planner = w.SottotitoliGrammarPlanner;
  var store = w.SottotitoliGrammarProfileStore;
  var drill = w.SottotitoliGrammarDrill;

  if (!GRAMMAR || !JOURNEY || !planner || !store) {
    if (w.console) w.console.warn('GrammarExercises: databank/planner/store missing — bailing.');
    return;
  }

  var _profile = null;
  var _query = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function humanize(cid) {
    return String(cid || '').split('-').map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  function vocab(v, id) {
    return (JOURNEY.vocabularies && JOURNEY.vocabularies[v] && JOURNEY.vocabularies[v][id]) || humanize(id);
  }

  function firstSentence(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    var m = t.match(/^.*?[.!?](\s|$)/);
    var s = m ? m[0].trim() : t;
    if (s.length > 140) s = s.slice(0, 137).replace(/\s+\S*$/, '') + '…';
    return s;
  }

  function conceptInfo(cid) {
    var g = (GRAMMAR.concepts || {})[cid] || {};
    var j = (JOURNEY.concepts || {})[cid] || {};
    return {
      cid: cid,
      cefr: g.cefr || j.cefr || '',
      explanation: g.explanation || '',
      functions: j.functions || [],
      scenarios: j.scenarios || [],
      objectives: j.objectives || []
    };
  }

  function userObjectives() {
    return (_profile && _profile.derived && _profile.derived.objectives) || [];
  }

  /* "Why it matters for you": the concept's objectives that match the learner's
   * objectives, humanised. Falls back to the concept's functions. */
  function objectiveLink(info) {
    var mine = userObjectives();
    var matches = (info.objectives || []).filter(function (o) { return mine.indexOf(o) !== -1; });
    var items = matches.length ? matches : (info.functions || []).slice(0, 2);
    return items.map(function (id) { return vocab(matches.length ? 'objectives' : 'functions', id); });
  }

  function boxHtml(info, kind) {
    // kind: 'suggested' | 'search' | 'todo'
    var link = objectiveLink(info);
    var linkLine = link.length
      ? '<div class="gx-link"><span class="gx-link-label">Perché ti serve</span> ' + link.map(esc).join(' · ') + '</div>'
      : '';
    var actions = '';
    if (kind === 'suggested') {
      actions = '<button class="gi-btn gi-btn-primary gx-go" data-act="ex-start" data-concept="' + esc(info.cid) + '">Esercitati</button>';
    } else if (kind === 'search') {
      actions = '<button class="gi-btn gi-btn-ghost gx-go" data-act="ex-add" data-concept="' + esc(info.cid) + '">Aggiungi alla lista</button>';
    } else if (kind === 'todo') {
      actions =
        '<button class="gi-btn gi-btn-primary gx-go" data-act="ex-start" data-concept="' + esc(info.cid) + '">Esercitati</button>' +
        '<button class="gi-btn gi-btn-ghost gx-go" data-act="ex-remove" data-concept="' + esc(info.cid) + '">Rimuovi</button>';
    }
    return '<div class="gx-box">' +
      '<div class="gx-box-head"><span class="gx-box-title">' + esc(humanize(info.cid)) + '</span><span class="gx-cefr">' + esc(info.cefr) + '</span></div>' +
      '<div class="gx-box-summary">' + esc(firstSentence(info.explanation)) + '</div>' +
      linkLine +
      '<div class="gx-box-actions">' + actions + '</div>' +
    '</div>';
  }

  function suggestedHtml() {
    var plan = planner.present(_profile);
    var top = (plan.concept_order || []).slice(0, 3);
    var boxes = top.map(function (cid) { return boxHtml(conceptInfo(cid), 'suggested'); }).join('');
    return '<div class="gx-section">' +
      '<h3 class="gx-h">Suggeriti per te</h3>' +
      '<p class="gx-sub">Tre argomenti scelti per il tuo livello e i tuoi obiettivi.</p>' +
      '<div class="gx-grid">' + (boxes || '<p class="gx-empty">Nessun suggerimento.</p>') + '</div>' +
    '</div>';
  }

  function searchHtml() {
    return '<div class="gx-section">' +
      '<h3 class="gx-h">Cerca un argomento</h3>' +
      '<div class="gx-search-row">' +
        '<input id="gxSearchInput" class="gx-input" type="text" placeholder="Cerca per nome, funzione o obiettivo…" value="' + esc(_query) + '">' +
      '</div>' +
      '<div class="gx-results" id="gxResults">' + resultsHtml() + '</div>' +
    '</div>';
  }

  function allConceptIds() {
    return Object.keys(GRAMMAR.concepts || {});
  }

  function resultsHtml() {
    var q = _query.trim().toLowerCase();
    if (!q) return '<p class="gx-empty">Digita per cercare tra i concetti.</p>';
    var todo = store.getTodo(_profile);
    var hits = allConceptIds().filter(function (cid) {
      if (todo.indexOf(cid) !== -1) return false; // already queued
      var info = conceptInfo(cid);
      var hay = [cid, info.explanation]
        .concat(info.functions.map(function (f) { return vocab('functions', f); }))
        .concat(info.scenarios.map(function (s) { return vocab('scenarios', s); }))
        .concat(info.objectives.map(function (o) { return vocab('objectives', o); }))
        .join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice(0, 6);
    if (!hits.length) return '<p class="gx-empty">Nessun risultato per "' + esc(_query) + '".</p>';
    return '<div class="gx-grid">' + hits.map(function (cid) { return boxHtml(conceptInfo(cid), 'search'); }).join('') + '</div>';
  }

  function todoHtml() {
    var todo = store.getTodo(_profile);
    if (!todo.length) return '<div class="gx-section"><h3 class="gx-h">La tua lista</h3><p class="gx-empty">Ancora vuota — cerca e aggiungi gli argomenti che vuoi ripassare.</p></div>';
    return '<div class="gx-section">' +
      '<h3 class="gx-h">La tua lista (' + todo.length + ')</h3>' +
      '<p class="gx-sub">Gli argomenti che hai scelto di ripassare.</p>' +
      '<div class="gx-grid">' + todo.map(function (cid) { return boxHtml(conceptInfo(cid), 'todo'); }).join('') + '</div>' +
    '</div>';
  }

  function render() {
    var c = document.getElementById('giExercises');
    if (!c) return;
    store.load().then(function (profile) {
      _profile = profile || {};
      if (!_profile.derived) {
        c.innerHTML = '<div class="gi-card gi-center"><div class="gi-kicker">Esercizi</div><h2 class="gi-title">Completa prima il test</h2><p class="gi-sub">Rispondi alle domande per ottenere i tuoi esercizi suggeriti.</p></div>';
        return;
      }
      c.innerHTML = '<div class="gx-wrap">' + suggestedHtml() + searchHtml() + todoHtml() + '</div>';
      bindSearch(c);
    }).catch(function () {
      c.innerHTML = '<p class="gx-empty">Impossibile caricare il profilo.</p>';
    });
  }

  function bindSearch(container) {
    var input = container.querySelector('#gxSearchInput');
    if (!input) return;
    input.addEventListener('input', function () {
      _query = input.value;
      var results = container.querySelector('#gxResults');
      if (results) results.innerHTML = resultsHtml();
    });
  }

  function startDrill(cid) {
    if (!drill) return;
    var c = document.getElementById('giExercises');
    drill.start(cid, c, function (summary) {
      store.logExercise(_profile, summary).then(function () { render(); });
    });
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    var cid = t.getAttribute('data-concept');
    if (act === 'ex-start' && cid) startDrill(cid);
    else if (act === 'ex-add' && cid) {
      store.addTodo(_profile, cid).then(function (updated) { _profile = updated; render(); });
    } else if (act === 'ex-remove' && cid) {
      store.removeTodo(_profile, cid).then(function (updated) { _profile = updated; render(); });
    }
  }

  function init() {
    var c = document.getElementById('giExercises');
    if (!c) return;
    c.addEventListener('click', onClick);
    render();

    // Re-render whenever the Esercizi subtab becomes active, so it always reflects
    // the latest profile (fresh intake, todo edits, exercise log).
    var pane = document.getElementById('sub-grammatica-esercizi');
    if (pane) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.target.id === 'sub-grammatica-esercizi' && m.target.classList.contains('active')) {
            render();
          }
        });
      });
      observer.observe(pane, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
