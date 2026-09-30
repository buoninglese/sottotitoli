/* ═══ Grammar Errors — the error-analysis loop ═══
 * Renders the "Errori" subtab of the Grammatica panel. This is the "Error
 * Analysis Engine" as a closed loop rather than a list:
 *
 *   detect (placement misses + live caption errors) → pattern-map (category →
 *   concept via GRAMMAR.error_map) → drill (grammar-drill.js) → review (SM-2-lite
 *   SRS via SottotitoliGrammarProfileStore.recordGrammarReview).
 *
 * It shows recurring error categories with their linked concepts, each drillable
 * and tracked for mastery + next review. The live-caption source (grammar_errors)
 * stores coarse Italian categories, so a small bridge maps them onto the
 * enrichment error-category ids that the databank uses.
 */
(function (w) {
  'use strict';

  var GRAMMAR = w.SOTTOTITOLI_GRAMMAR;
  var store = w.SottotitoliGrammarProfileStore;
  var drill = w.SottotitoliGrammarDrill;

  if (!GRAMMAR || !store) {
    if (w.console) w.console.warn('GrammarErrors: databank/store missing — bailing.');
    return;
  }

  /* Bridge: the live-caption save path keeps only a coarse Italian category,
   * not the enrichment id. This maps it onto the databank's vocabulary. */
  var LIVE_CATEGORY_BRIDGE = {
    'Preposizioni': 'preposition-choice',
    'Tempi verbali': 'tense-choice',
    'Articoli': 'article-use',
    'Ordine parole': 'word-order',
    'Ortografia': 'spelling'
  };

  var _profile = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function humanize(cid) {
    return String(cid || '').split('-').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ');
  }

  function label(cat) {
    return (GRAMMAR.category_labels && GRAMMAR.category_labels[cat]) || humanize(cat);
  }

  function deriveItalian(explanation) {
    if (!explanation) return null;
    var ex = String(explanation).toLowerCase();
    if (ex.indexOf('preposizion') !== -1 || ex.indexOf('preposition') !== -1) return 'Preposizioni';
    if (ex.indexOf('verbo') !== -1 || ex.indexOf('tempo') !== -1 || ex.indexOf('tense') !== -1 || ex.indexOf('verb') !== -1) return 'Tempi verbali';
    if (ex.indexOf('articolo') !== -1 || ex.indexOf('article') !== -1) return 'Articoli';
    if (ex.indexOf('ordine') !== -1 || ex.indexOf('word order') !== -1) return 'Ordine parole';
    if (ex.indexOf('ortograf') !== -1 || ex.indexOf('spelling') !== -1) return 'Ortografia';
    return null;
  }

  /* A live error row → enrichment category id, or null if unmappable. */
  function bridgeError(e) {
    var c = e.error_category || e.error_type;
    if (c) {
      if (GRAMMAR.error_map && GRAMMAR.error_map[c]) return c;          // already an id
      if (LIVE_CATEGORY_BRIDGE[c]) return LIVE_CATEGORY_BRIDGE[c];      // Italian label
    }
    return LIVE_CATEGORY_BRIDGE[deriveItalian(e.explanation)] || null;
  }

  /* Rank the error categories for a profile. `profile` is explicit so a caller
   * outside this panel (the Wrapped recap) can borrow this exact mapping instead
   * of re-implementing the bridge and drifting away from it. */
  function collect(liveErrors, profile) {
    var prof = profile || _profile || {};
    var cats = {};
    function bump(cat) { if (cat) cats[cat] = (cats[cat] || 0) + 1; }

    // Placement misses carry the enrichment id directly.
    ((prof.placement || {}).missed || []).forEach(function (m) { bump(m.error_category); });
    // Live caption errors, bridged.
    (liveErrors || []).forEach(function (e) { bump(bridgeError(e)); });

    // Attach the drill concepts for each category, and the concept's SRS state.
    var review = store.getGrammarReview(prof);
    var out = Object.keys(cats).map(function (cat) {
      var concepts = ((GRAMMAR.error_map && GRAMMAR.error_map[cat]) || []).map(function (cid) {
        return { cid: cid, state: review[cid] || null, due: store.isDue(review[cid]) };
      });
      return { cat: cat, label: label(cat), count: cats[cat], concepts: concepts };
    });
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  function conceptBadge(concept) {
    var s = concept.state;
    if (!s) return '<span class="gx-cefr gx-new">nuovo</span>';
    if (concept.due) return '<span class="gx-cefr gx-due">ripassa</span>';
    return '<span class="gx-cefr gx-mastered">' + (s.mastery || 0) + '%</span>';
  }

  function render(container) {
    store.load().then(function (profile) {
      _profile = profile || {};
      if (!_profile.derived) {
        container.innerHTML = '<div class="gi-card gi-center"><div class="gi-kicker">Errori</div><h2 class="gi-title">Completa prima il test</h2><p class="gi-sub">Rispondi alle domande e poi qui vedrai i tuoi errori ricorrenti.</p></div>';
        return;
      }

      // Live caption errors — optional, never blocks the placement-only view.
      var livePromise = Promise.resolve([]);
      try {
        var sb = w.sottotitoliSupabase;
        if (sb) {
          livePromise = sb.auth.getSession().then(function (r) {
            var uid = (r && r.data && r.data.session) ? r.data.session.user.id : null;
            if (!uid) return [];
            // select('*') on purpose: error_category/error_type are columns the
            // live save path never fills, and naming a missing column would fail
            // the whole query — indistinguishable from "no errors". Reading the
            // full row and bridging whatever is present is immune to that.
            return sb.from('grammar_errors').select('*').eq('user_id', uid).then(function (res) {
              return (res.error || !res.data) ? [] : res.data;
            });
          }).catch(function () { return []; });
        }
      } catch (e) { livePromise = Promise.resolve([]); }

      livePromise.then(function (liveErrors) {
        var cats = collect(liveErrors);
        var review = store.getGrammarReview(_profile);
        var dueConcepts = Object.keys(review).filter(function (cid) { return store.isDue(review[cid]); });

        var rows = cats.map(function (c) {
          var concepts = c.concepts.map(function (concept) {
            return '<div class="gx-err-concept">' +
              '<span class="gx-err-cid">' + esc(humanize(concept.cid)) + '</span>' +
              conceptBadge(concept) +
              '<button class="gi-btn gi-btn-ghost gx-go" data-act="err-drill" data-concept="' + esc(concept.cid) + '">Esercitati</button>' +
            '</div>';
          }).join('');
          if (!concepts) concepts = '<span class="gx-empty">nessun concetto mappato</span>';
          return '<div class="gx-err-row">' +
            '<div class="gx-err-head"><span class="gx-err-cat">' + esc(c.label) + '</span><span class="gx-err-count">× ' + c.count + '</span></div>' +
            '<div class="gx-err-concepts">' + concepts + '</div>' +
          '</div>';
        }).join('');

        var due = dueConcepts.map(function (cid) {
          return '<div class="gx-err-concept"><span class="gx-err-cid">' + esc(humanize(cid)) + '</span>' +
            '<button class="gi-btn gi-btn-ghost gx-go" data-act="err-drill" data-concept="' + esc(cid) + '">Ripassa</button></div>';
        }).join('');

        container.innerHTML =
          '<div class="gx-wrap">' +
            '<div class="gx-section">' +
              '<h3 class="gx-h">I tuoi errori ricorrenti</h3>' +
              '<p class="gx-sub">Dal test e dalle tue sessioni live, raggruppati per categoria e collegati ai concetti da allenare.</p>' +
              (rows || '<p class="gx-empty">Nessun errore registrato finora.</p>') +
            '</div>' +
            (due ?
              '<div class="gx-section"><h3 class="gx-h">Da ripassare oggi (' + dueConcepts.length + ')</h3>' + due + '</div>' : '') +
          '</div>';
      });
    }).catch(function () {
      container.innerHTML = '<p class="gx-empty">Impossibile caricare il profilo.</p>';
    });
  }

  function startDrill(cid) {
    if (!drill) return;
    var c = document.getElementById('giErrors');
    drill.start(cid, c, function (summary) {
      store.recordGrammarReview(_profile, cid, summary.correct, summary.total).then(function (updated) {
        _profile = updated;
        render(c);
      });
    });
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act="err-drill"]') : null;
    if (!t) return;
    startDrill(t.getAttribute('data-concept'));
  }

  function init() {
    var c = document.getElementById('giErrors');
    if (!c) return;
    c.addEventListener('click', onClick);
    render(c);

    var pane = document.getElementById('sub-grammatica-errori');
    if (pane) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.target.id === 'sub-grammatica-errori' && m.target.classList.contains('active')) render(c);
        });
      });
      observer.observe(pane, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* Exposed for the Wrapped recap, which needs the same "what do my errors
   * mean" vocabulary this panel uses. Duplicating the bridge would let the two
   * diverge, so it is shared instead. Returns [] when there is nothing to say. */
  w.SottotitoliGrammarErrors = {
    bridgeError: bridgeError,
    label: label,
    humanize: humanize,
    collect: collect
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
