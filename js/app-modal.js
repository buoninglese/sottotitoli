/* Generic styled modal — replaces native alert() / confirm() / prompt().
 *
 * Lifted out of the Word-banks init IIFE in panoramica.js, where it used to live. That IIFE
 * only runs the first time the Word banks / Vocabulary Builder panel is rendered, so
 * window.appConfirm did not exist for any flow that reached a different panel first — for
 * example a fresh page load going Dashboard -> Vocabulary Trainer -> Allena, which is
 * precisely when the learner needs to ask "leave now and lose this session?". Callers that
 * checked with typeof fell back to a native confirm(); callers that did not would have thrown.
 *
 * Loaded from the page head scripts (before i18n.js / learner.js / panoramica.js) so it is
 * available from page load. It drives the static markup in the HTML (#appModalOverlay and
 * friends), so it needs no DOM construction of its own; every lookup is guarded, which makes
 * it a harmless no-op on pages that do not include that markup.
 *
 * Contract:
 *   appAlert(msg, title, icon)
 *   appConfirm(msg, onYes, title, icon, okLabel, danger)   okLabel/danger are optional
 *   appPrompt(msg, onOk, title, icon, placeholder, value)
 *   appModalClose() / appModalOk()   — wired to the Cancel / OK buttons in the markup
 *   window._appModal                 — { mode, cb }, the slot appModalOk() reads
 */
(function () {
  window._appModal = { mode: null, cb: null };

  function appModalOpen(opts) {
    opts = opts || {};
    window._appModal = { mode: opts.mode || 'alert', cb: opts.onOk || opts.onYes || null };
    var t = document.getElementById('appModalTitle'); if (t) t.textContent = opts.title || 'Sottotitoli';
    var m = document.getElementById('appModalMsg'); if (m) m.textContent = opts.msg || '';
    var i = document.getElementById('appModalIcon'); if (i) i.textContent = opts.icon || 'ℹ️';
    var inputWrap = document.getElementById('appModalInputWrap');
    var input = document.getElementById('appModalInput');
    var cancel = document.getElementById('appModalCancel');
    var okBtn = document.getElementById('appModalOkBtn');
    if (inputWrap) inputWrap.style.display = opts.mode === 'prompt' ? 'block' : 'none';
    if (input) { input.value = opts.value || ''; if (opts.placeholder) input.placeholder = opts.placeholder; }
    if (cancel) cancel.style.display = opts.mode === 'alert' ? 'none' : '';
    if (okBtn) {
      okBtn.textContent = opts.okLabel || (opts.mode === 'confirm' ? 'Conferma' : 'OK');
      if (opts.danger) { okBtn.style.background = '#ef4444'; okBtn.style.color = '#fff'; }
      else { okBtn.style.background = 'var(--cyan)'; okBtn.style.color = 'var(--chip-active-text,#fff)'; }
    }
    var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'flex';
    if (opts.mode === 'prompt' && input) setTimeout(function(){ input.focus(); input.select(); }, 30);
  }
  window.appModalOpen = appModalOpen;
  window.appAlert = function(msg, title, icon) { appModalOpen({ mode: 'alert', msg: msg, title: title || 'Sottotitoli', icon: icon || 'ℹ️', okLabel: 'OK' }); };
  window.appConfirm = function(msg, onYes, title, icon, okLabel, danger) { appModalOpen({ mode: 'confirm', msg: msg, onYes: onYes, title: title || 'Conferma', icon: icon || '❓', okLabel: okLabel || 'Conferma', danger: !!danger }); };
  window.appPrompt = function(msg, onOk, title, icon, placeholder, value) { appModalOpen({ mode: 'prompt', msg: msg, onOk: onOk, title: title || 'Input', icon: icon || '✏️', okLabel: 'OK', placeholder: placeholder || '', value: value || '' }); };
  window.appModalClose = function() {
    var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'none';
    window._appModal = { mode: null, cb: null };
  };
  window.appModalOk = function() {
    var m = window._appModal; var cb = m.cb;
    var val = '';
    if (m.mode === 'prompt') val = (document.getElementById('appModalInput') || {}).value || '';
    var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'none';
    window._appModal = { mode: null, cb: null };
    if (cb) { if (m.mode === 'prompt') cb(val); else cb(); }
  };
  // Esc closes the modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { var o = document.getElementById('appModalOverlay'); if (o && o.style.display === 'flex') appModalClose(); }
  });
})();
