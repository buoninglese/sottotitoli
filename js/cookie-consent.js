// ═══ Cookie / analytics consent ═══
//
// WHY THIS EXISTS
// PostHog sets a cookie (`ph_<key>_posthog`) and matching localStorage keys.
// Under the ePrivacy Directive those are NOT "strictly necessary", so they may
// only be set AFTER the visitor has consented. Before this file existed,
// panoramica.html called `posthog.init()` unconditionally on load, and
// privacy.html claimed "no tracking cookies" — neither statement was true.
//
// DESIGN DECISIONS (each one deliberate)
//  * Nothing non-essential is loaded before a choice. `posthog.init()` is
//    deferred until consent, so a refusal genuinely means no analytics cookie
//    is ever written rather than "written and then ignored".
//  * "Rifiuta" is exactly as prominent as "Accetta". The Garante requires
//    refusing to be no harder than accepting; a hidden or greyed-out reject
//    button invalidates the consent it collects.
//  * No cookie wall. Refusing leaves the app completely usable — the banner
//    never blocks content.
//  * The choice is stored with a VERSION and a timestamp, mirroring the terms
//    consent model: a record of what was agreed to, and when the wording changed.
//  * Re-openable at any time — `window.SottotitoliConsent.open()` or `?consent=1`.
//    Withdrawal must be as easy as giving consent (Art. 7(3)).
//
// ⚠️ THIS FILE ONLY RUNS ON PAGES THAT LOAD POSTHOG. Today that is panoramica.html
// alone. If PostHog is ever added to another page, load this file there too and
// add the same script tag — see docs/legal/cookie-consent.md.
(function () {
  'use strict';

  var KEY = 'sottotitoli-consent';
  var VERSION = '1'; // bump when the categories or the wording change

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || v.version !== VERSION) return null; // stale wording = ask again
      return v;
    } catch (e) { return null; }
  }

  function write(analytics) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        analytics: !!analytics,
        version: VERSION,
        at: new Date().toISOString()
      }));
    } catch (e) { /* private mode — the choice just will not persist */ }
  }

  // ── Applying the choice ────────────────────────────────────────────────────
  function enableAnalytics() {
    if (typeof window.SottotitoliPosthogInit === 'function') {
      // Initialise only now. Until this runs, no PostHog cookie exists at all.
      if (!window.__posthogStarted) {
        window.__posthogStarted = true;
        try { window.SottotitoliPosthogInit(); } catch (e) { console.warn('posthog init failed:', e.message); }
      } else if (window.posthog && window.posthog.opt_in_capturing) {
        window.posthog.opt_in_capturing();
      }
    }
  }

  function disableAnalytics() {
    try {
      if (window.posthog && window.posthog.opt_out_capturing) window.posthog.opt_out_capturing();
      if (window.posthog && window.posthog.reset) window.posthog.reset();
    } catch (e) {}

    // Actually remove what was stored, rather than only recording a refusal.
    // Consent that is withdrawn should leave nothing behind.
    try {
      document.cookie.split(';').forEach(function (c) {
        var name = c.split('=')[0].trim();
        if (name.indexOf('ph_') === 0) {
          document.cookie = name + '=; Max-Age=0; path=/';
          document.cookie = name + '=; Max-Age=0; path=/; domain=.sottotitoli.pro';
        }
      });
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf('ph_') === 0 || k.indexOf('posthog') !== -1) localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function apply(analytics) {
    if (analytics) enableAnalytics(); else disableAnalytics();
  }

  function analyticsAllowed() {
    var v = read();
    return !!(v && v.analytics);
  }

  // ── The banner ─────────────────────────────────────────────────────────────
  function ui() {
    if (document.getElementById('consentBar')) return;

    var bar = document.createElement('div');
    bar.id = 'consentBar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Consenso cookie');
    bar.setAttribute('style',
      'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:0 auto;' +
      'background:var(--bg,#fff);color:var(--text,#111);border:1px solid var(--line,rgba(0,0,0,.15));' +
      'border-radius:14px;padding:18px 20px;box-shadow:0 14px 44px rgba(0,0,0,.28);' +
      'font-family:Inter,system-ui,-apple-system,sans-serif');

    // Built with textContent — no untrusted string is ever parsed as markup here.
    var txt = document.createElement('p');
    txt.setAttribute('style', 'margin:0 0 14px;font-size:13px;line-height:1.6');
    txt.textContent = 'Usiamo un cookie di statistica (PostHog) per capire quali funzioni vengono usate. Non è necessario al funzionamento: l\u2019app resta completa se lo rifiuti. Non usiamo cookie pubblicitari e non vendiamo dati.';
    bar.appendChild(txt);

    var row = document.createElement('div');
    row.setAttribute('style', 'display:flex;gap:10px;flex-wrap:wrap;align-items:center');

    var btnStyle = 'padding:10px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit';

    // Both buttons share the same visual weight on purpose — refusing must be
    // as easy as accepting.
    var accept = document.createElement('button');
    accept.type = 'button';
    accept.textContent = 'Accetta';
    accept.setAttribute('style', btnStyle + ';background:var(--cyan,#0891b2);color:#fff;border:1px solid var(--cyan,#0891b2)');
    row.appendChild(accept);

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.textContent = 'Rifiuta';
    reject.setAttribute('style', btnStyle + ';background:transparent;color:var(--text,#111);border:1px solid var(--line,rgba(0,0,0,.25))');
    row.appendChild(reject);

    var more = document.createElement('a');
    more.href = 'privacy.html';
    more.textContent = 'Informativa';
    more.setAttribute('style', 'font-size:13px;color:var(--cyan,#0891b2);margin-left:4px');
    row.appendChild(more);

    bar.appendChild(row);
    document.body.appendChild(bar);

    function done(analytics) {
      write(analytics);
      apply(analytics);
      var el = document.getElementById('consentBar');
      if (el) el.remove();
    }

    accept.addEventListener('click', function () { done(true); });
    reject.addEventListener('click', function () { done(false); });
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  var stored = read();
  if (stored) {
    // Already decided: apply silently, no banner.
    apply(stored.analytics);
  } else {
    // Undecided: show the banner. Nothing non-essential has loaded, because
    // posthog.init() is waiting for SottotitoliPosthogInit to be called.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui);
    else ui();
  }

  // Re-open when asked to, so a visitor can change their mind at any time.
  try {
    if (/[?&]consent(=1)?(&|$)/.test(location.search)) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui);
      else ui();
    }
  } catch (e) {}

  window.SottotitoliConsent = {
    analytics: analyticsAllowed,
    open: ui,
    set: function (analytics) { write(analytics); apply(analytics); },
    version: VERSION
  };
})();
