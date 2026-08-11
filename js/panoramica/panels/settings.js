// js/panoramica/panels/settings.js — Impostazioni panel
var container = null;
var initialized = false;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
<div class="content-panel" id="pnl-impostazioni">\
  <section class="panel-head" style="border-bottom:2px solid var(--line-strong);padding-bottom:24px;margin-bottom:40px"><h2 data-i18n="settings">Impostazioni</h2><p style="font-size:15px;color:var(--text-soft);margin:6px 0 0;max-width:600px;line-height:1.5" data-i18n="settings_desc">Personalizza il tuo ambiente di apprendimento e l\'aspetto dell\'app.</p></section>\
  <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">\
    <div class="set-grid" style="display:grid;gap:32px">\
      <div><h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em" data-i18n="settings_lang_captions">Lingua e captions</h3><p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Configura la lingua dell\'interfaccia e le impostazioni predefinite per caption e traduzione.</p></div>\
      <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;overflow:hidden">\
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);flex-wrap:wrap">\
          <div><label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_site_lang">Lingua sito</label><p style="font-size:11px;color:var(--text-soft);margin:0">La lingua dell\'interfaccia utente.</p></div>\
          <select id="settingsUiLang" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:160px;text-align:right"><option value="it">Italiano</option><option value="en">English</option></select>\
        </div>\
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);flex-wrap:wrap">\
          <div><label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_cap_lang">Lingua caption</label><p style="font-size:11px;color:var(--text-soft);margin:0">Lingua predefinita per i sottotitoli.</p></div>\
          <select id="settingsDefaultCapLang" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:160px;text-align:right"><option value="">—</option><option value="en-US">English</option><option value="it-IT">Italiano</option><option value="nl-NL">Nederlands</option><option value="fr-FR">Francais</option><option value="de-DE">Deutsch</option><option value="es-ES">Espanol</option><option value="pt-PT">Portugues</option><option value="pl-PL">Polski</option></select>\
        </div>\
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">\
          <div><label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_def_trans">Traduzione predefinita</label><p style="font-size:11px;color:var(--text-soft);margin:0">Coppia di lingue predefinita per la traduzione.</p></div>\
          <select id="settingsDefaultTrPair" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:200px;text-align:right"><option value="">—</option><option value="en-it">English - Italiano</option><option value="it-en">Italiano - English</option><option value="nl-it">Nederlands - Italiano</option><option value="fr-it">Francais - Italiano</option><option value="de-it">Deutsch - Italiano</option><option value="es-it">Espanol - Italiano</option></select>\
        </div>\
      </div>\
    </div>\
  </section>\
  <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">\
    <div class="set-grid" style="display:grid;gap:32px">\
      <div><h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em" data-i18n="appearance">Aspetto</h3><p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Scegli tra tema chiaro, scuro o automatico in base alle preferenze di sistema.</p></div>\
      <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:28px">\
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" id="settingsThemeCards">\
          <label style="cursor:pointer" data-theme="light"><input type="radio" name="theme-choice" value="light" style="display:none" checked><div style="border:2px solid var(--cyan);border-radius:14px;padding:18px;transition:all .2s;background:rgba(6,182,212,.03)"><div style="height:80px;background:#fff;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;padding:8px"><div style="height:4px;width:66%;background:var(--line);border-radius:2px"></div><div style="height:4px;width:50%;background:var(--line);border-radius:2px"></div><div style="margin-top:auto;height:12px;width:32px;background:var(--cyan);border-radius:3px"></div></div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600;color:var(--text)">Light Mode</span><span class="material-symbols-outlined set-check" style="color:var(--cyan);font-size:18px">check_circle</span></div></div></label>\
          <label style="cursor:pointer" data-theme="dark"><input type="radio" name="theme-choice" value="dark" style="display:none"><div style="border:2px solid var(--line);border-radius:14px;padding:18px;transition:all .2s"><div style="height:80px;background:#0f1117;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;padding:8px"><div style="height:4px;width:66%;background:rgba(255,255,255,.1);border-radius:2px"></div><div style="height:4px;width:50%;background:rgba(255,255,255,.1);border-radius:2px"></div><div style="margin-top:auto;height:12px;width:32px;background:var(--cyan);border-radius:3px"></div></div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600;color:var(--text)">Dark Mode</span><span class="material-symbols-outlined set-check" style="color:var(--text-soft);font-size:18px;opacity:0">check_circle</span></div></div></label>\
          <label style="cursor:pointer" data-theme="system"><input type="radio" name="theme-choice" value="system" style="display:none"><div style="border:2px solid var(--line);border-radius:14px;padding:18px;transition:all .2s"><div style="height:80px;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);overflow:hidden;display:flex"><div style="flex:1;background:#fff;padding:8px;display:flex;flex-direction:column;gap:6px"><div style="height:4px;width:66%;background:var(--line);border-radius:2px"></div></div><div style="flex:1;background:#0f1117;padding:8px;display:flex;flex-direction:column;gap:6px"><div style="height:4px;width:66%;background:rgba(255,255,255,.1);border-radius:2px"></div></div></div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600;color:var(--text)">System</span><span class="material-symbols-outlined set-check" style="color:var(--text-soft);font-size:18px;opacity:0">check_circle</span></div></div></label>\
        </div>\
        <select id="settingsTheme" style="display:none"><option value="system">Automatico</option><option value="light" selected>Chiaro</option><option value="dark">Scuro</option></select>\
      </div>\
    </div>\
  </section>\
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:16px">\
    <span id="settingsSavedMsg" style="display:none;font-size:12px;color:var(--teal);font-weight:600" data-i18n="saved_check">&check; Salvato</span>\
    <button id="saveSettingsBtn" style="display:inline-flex;align-items:center;gap:8px;padding:14px 36px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;font-family:\"Manrope\",sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 2px 12px rgba(6,182,212,.2)">\
      <span class="material-symbols-outlined" style="font-size:18px">save</span>\
      <span data-i18n="save_settings">Salva Impostazioni</span>\
    </button>\
  </div>\
</div>';
}

export async function init() {
  if (initialized) return;
  initialized = true;

  // Load saved preferences
  var prefs = window._settingsData || window._sottotitoliPrefs || {};
  var uiLang = document.getElementById('settingsUiLang');
  if (uiLang && prefs.ui_language) uiLang.value = prefs.ui_language;
  var themeSel = document.getElementById('settingsTheme');
  if (themeSel && prefs.theme) themeSel.value = prefs.theme;
  var capLang = document.getElementById('settingsDefaultCapLang');
  if (capLang && prefs.default_caption_lang) capLang.value = prefs.default_caption_lang;
  var trPair = document.getElementById('settingsDefaultTrPair');
  if (trPair && prefs.default_translation_pair) trPair.value = prefs.default_translation_pair;

  // Theme card click handler
  var cards = document.getElementById('settingsThemeCards');
  if (cards) {
    cards.addEventListener('click', function(e) {
      var label = e.target.closest('label[data-theme]');
      if (!label) return;
      var theme = label.getAttribute('data-theme');
      var select = document.getElementById('settingsTheme');
      if (select) select.value = theme;

      cards.querySelectorAll('label[data-theme]').forEach(function(l) {
        var border = l.querySelector('div:first-child');
        var check = l.querySelector('.set-check');
        if (l === label) {
          if (border) { border.style.borderColor = 'var(--cyan)'; border.style.background = 'rgba(6,182,212,.03)'; }
          if (check) { check.style.color = 'var(--cyan)'; check.style.opacity = '1'; }
          l.querySelector('input[type=radio]').checked = true;
        } else {
          if (border) { border.style.borderColor = 'var(--line)'; border.style.background = ''; }
          if (check) { check.style.color = 'var(--text-soft)'; check.style.opacity = '0'; }
          l.querySelector('input[type=radio]').checked = false;
        }
      });
    });

    // Set initial active card
    var curTheme = prefs.theme || 'light';
    var target = cards.querySelector('label[data-theme="' + curTheme + '"]');
    if (target) target.click();
  }

  // Theme select: apply immediately on change
  if (themeSel) {
    themeSel.addEventListener('change', function() {
      if (typeof applyTheme === 'function') applyTheme(this.value);
    });
  }

  // Save button handler
  var saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      var settings = {};
      var uiEl = document.getElementById('settingsUiLang');
      if (uiEl) settings.ui_language = uiEl.value;
      var themeEl = document.getElementById('settingsTheme');
      if (themeEl) settings.theme = themeEl.value;
      var dclEl = document.getElementById('settingsDefaultCapLang');
      if (dclEl && dclEl.value) settings.default_caption_lang = dclEl.value;
      var dtpEl = document.getElementById('settingsDefaultTrPair');
      if (dtpEl && dtpEl.value) settings.default_translation_pair = dtpEl.value;

      var origBg = saveBtn.style.background;
      saveBtn.style.background = 'var(--green, #059669)';
      saveBtn.style.transition = 'background 0.15s ease';
      setTimeout(function() { saveBtn.style.background = origBg; }, 800);

      var result = { ok: false, errors: ['Nessuna connessione'] };
      try {
        if (typeof SottotitoliData !== 'undefined' && SottotitoliData.saveSettings) {
          result = await SottotitoliData.saveSettings(settings);
        }
      } catch(e) { result = { ok: false, errors: [e.message] }; }

      var toast = document.getElementById('toastMsg');
      if (toast) {
        if (result.ok) {
          toast.textContent = 'Salvato su Supabase';
          toast.style.background = 'var(--green, #059669)';
        } else {
          toast.textContent = 'Salvato in locale (accedi per sync)';
          toast.style.background = 'var(--amber, #d97706)';
        }
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); toast.style.background = ''; }, 3500);
      }

      if (settings.ui_language && typeof I18n !== 'undefined' && I18n.setLang) {
        I18n.setLang(settings.ui_language);
        if (window._settingsData) window._settingsData.ui_language = settings.ui_language;
      }

      window._sottotitoliPrefs = Object.assign(window._sottotitoliPrefs || {}, settings);
    });
  }
}

export function destroy() {
  initialized = false;
  container = null;
}
