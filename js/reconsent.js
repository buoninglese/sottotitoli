// ═══ One-off re-consent prompt ═══
//
// WHY THIS EXISTS
// `terms_consent` and `terms_consent_at` are real columns on onboarding_responses.
// The columns always worked — the WRITE never happened. The onboarding upsert sent
// seven column names that did not exist, PostgREST rejects such a payload with a
// 400 and writes NOTHING, and the error was swallowed. So no consent has ever been
// recorded for any user.
//
// Going forward the row saves, and it now carries the terms VERSION, so a record
// proves WHICH text was accepted rather than only when a box was ticked. This
// module covers the two groups who still have no usable record:
//
//   * users with no consent timestamp at all — the silent loss; and
//   * users whose consent predates versioning, so we cannot say what they agreed to.
//
// ⚠️ Historical consent is NOT back-filled. Writing a timestamp that cannot be
// evidenced is a fabricated record, which is worse than an honest gap.
//
// Deliberately a separate file rather than inline in panoramica.html: this is new
// behaviour layered onto an existing page, so it can be disabled by removing one
// <script> tag, and it cannot break the page's inline code.
(function(){
  'use strict';

  // Single source of truth is config.js — duplicating the version string here and
  // in onboarding.html is exactly the kind of drift that caused the bug above.
  var VERSION = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.termsVersion) || null;

  var prompted = false;

  function check() {
    if (prompted) return;
    var sb = window.sottotitoliSupabase;
    if (!sb || !sb.auth) return;
    if (!VERSION) { console.warn('reconsent: config.termsVersion missing — skipping'); return; }

    sb.auth.getSession().then(function(r){
      var session = r && r.data && r.data.session;
      if (!session || prompted) return;

      sb.from('onboarding_responses')
        .select('terms_consent_at,terms_version')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(function(res){
          if (prompted) return;
          var row = (res && res.data) || null;
          var hasConsent = !!(row && row.terms_consent_at);
          var matchesVersion = !!(row && row.terms_version === VERSION);
          // Nothing to do only when consent exists AND we know which terms it was.
          if (hasConsent && matchesVersion) return;
          prompted = true;
          show(res && res.error);
        })
        .catch(function(e){ console.warn('reconsent: could not read consent state:', e && e.message); });
    }).catch(function(){ /* not signed in — nothing to ask */ });
  }

  function show(readError) {
    // If we cannot read the state we must not block: a broken read would lock every
    // user out of the app. Warn and leave the page usable.
    if (readError) {
      console.warn('reconsent: consent state unreadable, not prompting:', readError.message);
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'reconsentOverlay';
    overlay.setAttribute('style',
      'position:fixed;inset:0;z-index:100000;background:rgba(15,17,21,.72);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;' +
      'font-family:Inter,system-ui,-apple-system,sans-serif');

    var card = document.createElement('div');
    card.setAttribute('style',
      'max-width:520px;width:100%;background:var(--bg,#fff);color:var(--text,#111);' +
      'border:1px solid var(--line,rgba(0,0,0,.12));border-radius:16px;padding:28px;' +
      'box-shadow:0 18px 60px rgba(0,0,0,.35)');

    // Built with textContent, not innerHTML — no untrusted string is ever parsed as
    // markup here, so this cannot introduce an injection point.
    var h = document.createElement('h2');
    h.textContent = 'Conferma i Termini di Servizio';
    h.setAttribute('style','margin:0 0 12px;font-size:19px;font-weight:700');
    card.appendChild(h);

    var p1 = document.createElement('p');
    p1.textContent = 'Abbiamo bisogno che tu confermi i Termini di Servizio per continuare a usare Sottotitoli. Questo è richiesto una sola volta.';
    p1.setAttribute('style','margin:0 0 12px;font-size:14px;line-height:1.6');
    card.appendChild(p1);

    var p2 = document.createElement('p');
    p2.textContent = 'Confermando, registriamo la data e la versione dei termini accettati (versione ' + VERSION + ').';
    p2.setAttribute('style','margin:0 0 20px;font-size:13px;line-height:1.6;opacity:.75');
    card.appendChild(p2);

    var link = document.createElement('a');
    link.href = 'termini.html';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Leggi i Termini →';
    link.setAttribute('style','display:inline-block;margin-bottom:20px;font-size:13px;color:var(--cyan,#0891b2)');
    card.appendChild(link);

    var row = document.createElement('div');
    row.setAttribute('style','display:flex;gap:10px;align-items:center;flex-wrap:wrap');

    var accept = document.createElement('button');
    accept.textContent = 'Accetto i Termini';
    accept.setAttribute('style',
      'padding:12px 22px;background:var(--cyan,#0891b2);color:#fff;border:0;' +
      'border-radius:10px;font-size:14px;font-weight:600;cursor:pointer');
    row.appendChild(accept);

    var decline = document.createElement('button');
    decline.textContent = 'Esci';
    decline.setAttribute('style',
      'padding:12px 18px;background:none;color:var(--text,#111);border:1px solid var(--line,rgba(0,0,0,.15));' +
      'border-radius:10px;font-size:14px;cursor:pointer');
    row.appendChild(decline);

    card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var status = document.createElement('p');
    status.setAttribute('style','margin:14px 0 0;font-size:13px;min-height:18px');
    card.appendChild(status);

    accept.addEventListener('click', function(){
      accept.disabled = true; decline.disabled = true;
      status.textContent = 'Salvataggio…';
      var sb = window.sottotitoliSupabase;
      sb.auth.getSession().then(function(r){
        var session = r && r.data && r.data.session;
        if (!session) { status.textContent = 'Sessione scaduta. Ricarica la pagina.'; accept.disabled = false; decline.disabled = false; return; }
        return sb.from('onboarding_responses').upsert({
          user_id: session.user.id,
          terms_consent: true,
          terms_consent_at: new Date().toISOString(),
          terms_version: VERSION,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(function(res){
          // supabase-js returns { error } instead of throwing — check it, or a
          // failed consent write would silently look accepted.
          if (res && res.error) {
            console.error('reconsent: consent NOT saved:', res.error.message);
            status.textContent = 'Non è stato possibile registrare il consenso. Riprova.';
            accept.disabled = false; decline.disabled = false;
            return;
          }
          overlay.remove();
        });
      }).catch(function(e){
        status.textContent = 'Errore: ' + (e && e.message ? e.message : 'sconosciuto');
        accept.disabled = false; decline.disabled = false;
      });
    });

    decline.addEventListener('click', function(){
      var sb = window.sottotitoliSupabase;
      if (sb && sb.auth && sb.auth.signOut) sb.auth.signOut().finally(function(){ location.reload(); });
      else location.reload();
    });
  }

  function boot() {
    check();
    var sb = window.sottotitoliSupabase;
    // auth.js resolves the session asynchronously, so also react to the first
    // auth event. Guarded by `prompted` so the modal can never appear twice.
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      try {
        sb.auth.onAuthStateChange(function(_event, session){ if (session) check(); });
      } catch(e) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
