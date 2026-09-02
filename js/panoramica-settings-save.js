(function(){
  'use strict';
  var btn = document.getElementById('saveSettingsBtn');
  if (!btn) return;

  // ── Load email when settings panel opens ──
  function loadEmail() {
    var emailEl = document.getElementById('settingsEmail');
    if (!emailEl || emailEl.textContent.trim() !== '—') return;
    try {
      if (window.sottotitoliSupabase) {
        window.sottotitoliSupabase.auth.getSession().then(function(r){
          var email = r.data?.session?.user?.email;
          if (email && emailEl) emailEl.textContent = email.replace(/(.{2}).*(@.*)/, '$1****$2');
        });
      }
    } catch(e) {}
  }
  var impNav = document.querySelector('[data-panel="impostazioni"]');
  if (impNav) impNav.addEventListener('click', function(){ setTimeout(loadEmail, 200); });
  loadEmail();

  // ── Theme select: apply immediately on change ──
  var themeSel = document.getElementById('settingsTheme');
  if (themeSel) themeSel.addEventListener('change', function(){ applyTheme(this.value); });

  // ── Save handler (only one!) ──
  btn.addEventListener('click', async function(){
    var settings = {};
    var uiEl = document.getElementById('settingsUiLang');
    if (uiEl) settings.ui_language = uiEl.value;
    var themeEl = document.getElementById('settingsTheme');
    if (themeEl) settings.theme = themeEl.value;
    var dclEl = document.getElementById('settingsDefaultCapLang');
    if (dclEl && dclEl.value) settings.default_caption_lang = dclEl.value;
    var dtpEl = document.getElementById('settingsDefaultTrPair');
    if (dtpEl && dtpEl.value) settings.default_translation_pair = dtpEl.value;

    // Green flash
    var origBg = btn.style.background;
    btn.style.background = 'var(--green, #059669)';
    btn.style.transition = 'background 0.15s ease';
    setTimeout(function(){ btn.style.background = origBg; }, 800);

    // Save via unified API → returns { ok, errors }
    var result = { ok: false, errors: ['Nessuna connessione'] };
    if (typeof window.showToast === 'function') { window.showToast('Salvataggio…', 'loading'); }
    try {
      if (typeof SottotitoliData !== 'undefined' && SottotitoliData.saveSettings) {
        result = await SottotitoliData.saveSettings(settings);
      }
    } catch(e) { result = { ok: false, errors: [e.message] }; }

    // Toast with clear feedback (Apple-style pill via js/toast.js)
    if (typeof window.showToast === 'function') {
      if (result.ok) {
        window.showToast('✓ Salvato su Supabase', 'success');
      } else if (result.errors && result.errors[0] && result.errors[0].indexOf('locally') !== -1) {
        window.showToast('⚠️ Salvato in locale (accedi per sync)', 'warning');
      } else {
        window.showToast('⚠️ ' + (result.errors ? result.errors[0] : 'Errore sconosciuto'), 'error');
      }
    }

    // Update hero + dropdown name
    if (settings.display_name) {
      var heroEm = document.querySelector('.hero-content h2 em');
      if (heroEm) heroEm.textContent = settings.display_name;
      var ddName = document.getElementById('ddName');
      if (ddName) ddName.textContent = settings.display_name;
    }

    // Switch UI language if changed
    if (settings.ui_language && typeof I18n !== 'undefined' && I18n.setLang) {
      I18n.setLang(settings.ui_language);
      // Update cached settings so renderHero picks up new language
      if (window._settingsData) window._settingsData.ui_language = settings.ui_language;
      // Re-render hero with new language
      renderHero(window._settingsData && window._settingsData.display_name);
      renderHeroCards();
    }

    // Update local caches
    var profile = window._sottotitoliProfile;
    if (profile) {
      if (settings.display_name) profile.display_name = settings.display_name;
    }

  });

})();
