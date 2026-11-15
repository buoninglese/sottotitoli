/* module-watchdog.js — say something when a script did not load.
 *
 * Why this exists: on 2026-11-12 a production request for
 * /js/grammar-profile-store.js came back 503. That script defines
 * window.SottotitoliGrammarProfileStore, and three modules
 * (grammar-intake, grammar-exercises, grammar-errors) each capture that global
 * once and then `return` from their IIFE when it is missing — after a single
 * console.warn. The visible result was a Grammatica tab where none of the three
 * subtabs rendered anything, with no message and no console error a user would
 * see. The 503 itself was transient and has not recurred; the silence is the
 * defect this closes.
 *
 * Checked at window load, because deferred scripts have all executed by then.
 * Each entry is [global name, human label, script path] and the label is what a
 * person can act on.
 */
(function (w, d) {
  'use strict';

  var REQUIRED = [
    ['SottotitoliGrammarProfileStore', 'profilo di grammatica', 'js/grammar-profile-store.js'],
    ['SottotitoliGrammarPlanner', 'pianificatore', 'js/grammar-planner.js'],
    ['SottotitoliGrammarDrill', 'esercizi', 'js/grammar-drill.js'],
    ['SOTTOTITOLI_GRAMMAR', 'banca dati grammaticale', 'js/grammatica.js'],
    ['SOTTOTITOLI_JOURNEY', 'percorso', 'js/grammar-journey.js'],
    ['SOTTOTITOLI_PROFILE', 'profilo lingua', 'js/grammar-profile.js'],
    ['SottotitoliData', 'servizio dati', 'js/data-service.js'],
    ['I18n', 'traduzioni', 'js/i18n.js']
  ];

  function missing() {
    return REQUIRED.filter(function (r) {
      return typeof w[r[0]] === 'undefined';
    });
  }

  function reloadBusted() {
    try {
      var u = new URL(w.location.href);
      u.searchParams.set('_bust', String(Date.now()));
      w.location.replace(u.toString());
    } catch (e) {
      w.location.reload();
    }
  }

  function show(list) {
    if (d.getElementById('moduleWatchdog')) return;

    var bar = d.createElement('div');
    bar.id = 'moduleWatchdog';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'top:12px', 'transform:translateX(-50%)',
      'z-index:2147483000', 'max-width:min(92vw,520px)',
      'background:#3a1d0b', 'color:#ffd9b8',
      'border:1px solid #fb923c', 'border-radius:10px',
      'padding:10px 12px', 'font:500 13px/1.45 system-ui,-apple-system,sans-serif',
      'box-shadow:0 6px 24px rgba(0,0,0,.35)', 'display:flex',
      'align-items:flex-start', 'gap:10px'
    ].join(';');

    var text = d.createElement('div');
    text.style.cssText = 'flex:1';
    var what = list.map(function (r) { return r[1]; }).join(', ');
    text.textContent = 'Alcune parti non sono state caricate (' + what +
      '). Il resto della pagina funziona.';
    /* The script paths go in the tooltip rather than the message: useful when
       reporting the problem, noise for everyone else. */
    bar.title = list.map(function (r) { return r[2] + ' → ' + r[0]; }).join('\n');

    var btn = d.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Ricarica';
    btn.style.cssText = [
      'flex:0 0 auto', 'background:#fb923c', 'color:#241000', 'border:0',
      'border-radius:8px', 'padding:6px 12px', 'font:700 13px system-ui,sans-serif',
      'cursor:pointer'
    ].join(';');
    btn.addEventListener('click', reloadBusted);

    var close = d.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Chiudi avviso');
    close.textContent = '×';
    close.style.cssText = [
      'flex:0 0 auto', 'background:transparent', 'color:#ffd9b8', 'border:0',
      'font:400 18px/1 system-ui,sans-serif', 'cursor:pointer', 'padding:0 2px'
    ].join(';');
    close.addEventListener('click', function () { bar.remove(); });

    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(close);
    d.body.appendChild(bar);
  }

  /* Exposed so a test can ask the same question the watchdog asks, instead of
     asserting on DOM that only appears when something is broken. */
  w.__moduleWatchdogMissing = function () {
    return missing().map(function (r) { return r[0]; });
  };

  w.addEventListener('load', function () {
    var m = missing();
    if (m.length) {
      if (w.console && w.console.warn) {
        w.console.warn('module-watchdog: missing', m.map(function (r) { return r[0]; }));
      }
      show(m);
    }
  });
})(window, document);
