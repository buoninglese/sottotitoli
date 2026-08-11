// js/panoramica/panels/settings.js — pnl-impostazioni panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-impostazioni">
  <section class="panel-head" style="border-bottom:2px solid var(--line-strong);padding-bottom:24px;margin-bottom:40px"><h2 data-i18n="settings">Impostazioni</h2><p style="font-size:15px;color:var(--text-soft);margin:6px 0 0;max-width:600px;line-height:1.5" data-i18n="settings_desc">Personalizza il tuo ambiente di apprendimento e l'aspetto dell'app.</p></section>

  <style>
    @media(min-width:1024px){ #pnl-impostazioni .set-grid{grid-template-columns:1fr 2fr} }
  </style>

  <!-- Section: Lingua e captions -->
  <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
    <div class="set-grid" style="display:grid;gap:32px">
      <div>
        <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em" data-i18n="settings_lang_captions">Lingua e captions</h3>
        <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Configura la lingua dell'interfaccia e le impostazioni predefinite per caption e traduzione.</p>
      </div>
      <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;overflow:hidden">
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);flex-wrap:wrap" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
          <div>
            <label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_site_lang">Lingua sito</label>
            <p style="font-size:11px;color:var(--text-soft);margin:0">La lingua dell'interfaccia utente.</p>
          </div>
          <select id="settingsUiLang" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:160px;text-align:right" onfocus="this.style.borderColor='var(--cyan)';this.style.boxShadow='0 0 0 3px rgba(6,182,212,.1)'" onblur="this.style.borderColor='var(--line)';this.style.boxShadow=''">
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);flex-wrap:wrap" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
          <div>
            <label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_cap_lang">Lingua caption</label>
            <p style="font-size:11px;color:var(--text-soft);margin:0">Lingua predefinita per i sottotitoli.</p>
          </div>
          <select id="settingsDefaultCapLang" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:160px;text-align:right" onfocus="this.style.borderColor='var(--cyan)';this.style.boxShadow='0 0 0 3px rgba(6,182,212,.1)'" onblur="this.style.borderColor='var(--line)';this.style.boxShadow=''">
            <option value="">—</option>
            <option value="en-US">English</option>
            <option value="it-IT">Italiano</option>
            <option value="nl-NL">Nederlands</option>
            <option value="fr-FR">Français</option>
            <option value="de-DE">Deutsch</option>
            <option value="es-ES">Español</option>
            <option value="pt-PT">Português</option>
            <option value="pl-PL">Polski</option>
          </select>
        </div>
        <div style="padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
          <div>
            <label style="display:block;font-weight:700;color:var(--text);font-size:15px;margin-bottom:2px" data-i18n="settings_def_trans">Traduzione predefinita</label>
            <p style="font-size:11px;color:var(--text-soft);margin:0">Coppia di lingue predefinita per la traduzione.</p>
          </div>
          <select id="settingsDefaultTrPair" style="padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;min-width:200px;text-align:right" onfocus="this.style.borderColor='var(--cyan)';this.style.boxShadow='0 0 0 3px rgba(6,182,212,.1)'" onblur="this.style.borderColor='var(--line)';this.style.boxShadow=''">
            <option value="">—</option>
            <option value="en-it">🇬🇧 English → 🇮🇹 Italiano</option>
            <option value="it-en">🇮🇹 Italiano → 🇬🇧 English</option>
            <option value="nl-it">🇳🇱 Nederlands → 🇮🇹 Italiano</option>
            <option value="it-nl">🇮🇹 Italiano → 🇳🇱 Nederlands</option>
            <option value="fr-it">🇫🇷 Français → 🇮🇹 Italiano</option>
            <option value="de-it">🇩🇪 Deutsch → 🇮🇹 Italiano</option>
            <option value="es-it">🇪🇸 Español → 🇮🇹 Italiano</option>
            <option value="pt-it">🇵🇹 Português → 🇮🇹 Italiano</option>
            <option value="pl-it">🇵🇱 Polski → 🇮🇹 Italiano</option>
          </select>
        </div>
      </div>
    </div>
  </section>

  <!-- Section: Appearance -->
  <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
    <div class="set-grid" style="display:grid;gap:32px">
      <div>
        <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em" data-i18n="appearance">Aspetto</h3>
        <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Scegli tra tema chiaro, scuro o automatico in base alle preferenze di sistema.</p>
      </div>
      <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:28px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" id="settingsThemeCards">
          <label style="cursor:pointer" onclick="document.getElementById('settingsTheme').value='light'">
            <input type="radio" name="theme-choice" value="light" style="display:none" checked>
            <div style="border:2px solid var(--cyan);border-radius:14px;padding:18px;transition:all .2s;background:rgba(6,182,212,.03)">
              <div style="height:80px;background:#fff;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;padding:8px">
                <div style="height:4px;width:66%;background:var(--line);border-radius:2px"></div>
                <div style="height:4px;width:50%;background:var(--line);border-radius:2px"></div>
                <div style="margin-top:auto;height:12px;width:32px;background:var(--cyan);border-radius:3px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:13px;font-weight:600;color:var(--text)">Light Mode</span>
                <span class="material-symbols-outlined" style="color:var(--cyan);font-size:18px">check_circle</span>
              </div>
            </div>
          </label>
          <label style="cursor:pointer" onclick="document.getElementById('settingsTheme').value='dark'">
            <input type="radio" name="theme-choice" value="dark" style="display:none">
            <div style="border:2px solid var(--line);border-radius:14px;padding:18px;transition:all .2s">
              <div style="height:80px;background:#0f1117;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);display:flex;flex-direction:column;gap:6px;padding:8px">
                <div style="height:4px;width:66%;background:rgba(255,255,255,.1);border-radius:2px"></div>
                <div style="height:4px;width:50%;background:rgba(255,255,255,.1);border-radius:2px"></div>
                <div style="margin-top:auto;height:12px;width:32px;background:var(--cyan);border-radius:3px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:13px;font-weight:600;color:var(--text)">Dark Mode</span>
                <span class="material-symbols-outlined" style="color:var(--text-soft);font-size:18px;opacity:0">check_circle</span>
              </div>
            </div>
          </label>
          <label style="cursor:pointer" onclick="document.getElementById('settingsTheme').value='auto'">
            <input type="radio" name="theme-choice" value="auto" style="display:none">
            <div style="border:2px solid var(--line);border-radius:14px;padding:18px;transition:all .2s">
              <div style="height:80px;border-radius:8px;margin-bottom:10px;border:1px solid var(--line);overflow:hidden;display:flex">
                <div style="flex:1;background:#fff;padding:8px;display:flex;flex-direction:column;gap:6px">
                  <div style="height:4px;width:66%;background:var(--line);border-radius:2px"></div>
                  <div style="height:4px;width:50%;background:var(--line);border-radius:2px"></div>
                </div>
                <div style="flex:1;background:#0f1117;padding:8px;display:flex;flex-direction:column;gap:6px">
                  <div style="height:4px;width:66%;background:rgba(255,255,255,.1);border-radius:2px"></div>
                  <div style="height:4px;width:50%;background:rgba(255,255,255,.1);border-radius:2px"></div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:13px;font-weight:600;color:var(--text)">System</span>
                <span class="material-symbols-outlined" style="color:var(--text-soft);font-size:18px;opacity:0">check_circle</span>
              </div>
            </div>
          </label>
        </div>
        <select id="settingsTheme" style="display:none">
          <option value="auto">Automatico</option>
          <option value="light" selected>Chiaro</option>
          <option value="dark">Scuro</option>
        </select>
        <script>
          (function(){
            var cards=document.getElementById('settingsThemeCards');
            if(!cards) return;
            cards.addEventListener('click',function(e){
              var label=e.target.closest('label');
              if(!label) return;
              cards.querySelectorAll('label').forEach(function(l){
                var border=l.querySelector('div:first-child');
                var check=l.querySelector('.material-symbols-outlined');
                if(l===label){
                  border.style.borderColor='var(--cyan)';
                  border.style.background='rgba(6,182,212,.03)';
                  if(check){check.style.color='var(--cyan)';check.style.opacity='1';}
                  l.querySelector('input[type=radio]').checked=true;
                }else{
                  border.style.borderColor='var(--line)';
                  border.style.background='';
                  if(check){check.style.color='var(--text-soft)';check.style.opacity='0';}
                  l.querySelector('input[type=radio]').checked=false;
                }
              });
            });
            var curTheme=document.getElementById('settingsTheme').value;
            var target=cards.querySelector('input[value="'+curTheme+'"]');
            if(target){ target.closest('label').click(); }
          })();
        </script>
      </div>
    </div>
  </section>

  <!-- Save -->
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:16px">
    <span id="settingsSavedMsg" style="display:none;font-size:12px;color:var(--teal);font-weight:600" data-i18n="saved_check">&check; Salvato</span>
    <button id="saveSettingsBtn" style="display:inline-flex;align-items:center;gap:8px;padding:14px 36px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 2px 12px rgba(6,182,212,.2)" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(6,182,212,.35)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(6,182,212,.2)'">
      <span class="material-symbols-outlined" style="font-size:18px">save</span>
      <span data-i18n="save_settings">Salva Impostazioni</span>
    </button>
  </div>
</div>
`;
}

export async function init() {}
export function destroy() { container = null; }
