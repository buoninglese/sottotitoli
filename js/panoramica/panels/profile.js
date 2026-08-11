// js/panoramica/panels/profile.js — Profilo panel
import { getSupabase } from '../shared/supabase.js';

var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
    <div class="content-panel" id="pnl-profilo">\
      <section class="panel-head" style="border-bottom:2px solid var(--line-strong);padding-bottom:24px;margin-bottom:40px"><h2 data-i18n="profilo">Profilo</h2><p style="font-size:15px;color:var(--text-soft);margin:6px 0 0;max-width:600px;line-height:1.5">Gestisci le tue informazioni personali, le preferenze di apprendimento e il tuo referral.</p></section>\
      <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">\
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">\
          <div style="position:relative;flex-shrink:0">\
            <div id="profileAvatarPlaceholder" style="width:120px;height:120px;border-radius:16px;background:var(--card);border:3px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:48px">&#x1F464;</div>\
          </div>\
          <div style="flex:1;min-width:200px">\
            <span style="font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em" id="profileDisplayName">—</span>\
            <p style="font-size:13px;color:var(--text-soft);margin:4px 0 16px;font-family:\"JetBrains Mono\",monospace;opacity:.7" id="profileEmail">—</p>\
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:340px">\
              <div><span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\"Manrope\",sans-serif;display:block;margin-bottom:2px" data-i18n="prof_madrelingua">Madrelingua</span><span style="font-size:13px;font-weight:600;color:var(--text)" id="profileNativeLang">—</span></div>\
              <div><span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\"Manrope\",sans-serif;display:block;margin-bottom:2px" data-i18n="prof_user_id">User ID</span><span style="font-size:11px;font-family:\"JetBrains Mono\",monospace;opacity:.6;color:var(--text-soft)" id="profileUserId">—</span></div>\
            </div>\
          </div>\
        </div>\
      </section>\
      <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">\
        <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px">Profilo di apprendimento</h3>\
        <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0 0 20px">Professione, motivazione e abitudini di studio aiutano l\'AI a personalizzare i consigli.</p>\
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">\
          <div style="background:var(--card);border:2px solid var(--line-strong);border-radius:16px;padding:24px 28px">\
            <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 18px;font-size:15px;font-weight:600"><span class="material-symbols-outlined" style="color:var(--cyan)">fingerprint</span> Identit&agrave;</h3>\
            <div style="display:flex;flex-direction:column;gap:12px">\
              <div><label style="display:block;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\"Manrope\",sans-serif;margin-bottom:4px" data-i18n="prof_profession">Professione</label><span style="font-size:14px;font-weight:600;color:var(--text)" id="insightsProfession">—</span></div>\
              <div><label style="display:block;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\"Manrope\",sans-serif;margin-bottom:4px" data-i18n="prof_why_study">Perch&eacute; studio</label><span style="font-size:14px;font-weight:600;color:var(--text)" id="insightsWhyEnglish">—</span></div>\
            </div>\
          </div>\
          <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:24px 28px">\
            <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 18px;font-size:15px;font-weight:600"><span class="material-symbols-outlined" style="color:var(--cyan)">trending_up</span> Abitudini</h3>\
            <div style="display:flex;flex-direction:column;gap:10px">\
              <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsAvgDaily">—</span><span style="color:var(--text-faint)" data-i18n="prof_daily_avg">Media giornaliera</span></div>\
              <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsFascia">—</span><span style="color:var(--text-faint)" data-i18n="prof_pref_time">Fascia preferita</span></div>\
              <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsGiorni">—</span><span style="color:var(--text-faint)" data-i18n="prof_active_days">Giorni pi&ugrave; attivi</span></div>\
            </div>\
          </div>\
        </div>\
      </section>\
      <section style="padding:0 0 48px">\
        <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px">Invita amici</h3>\
        <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0 0 20px">Condividi la tua passione per le lingue e guadagna crediti per ogni amico che si iscrive.</p>\
        <div style="background:var(--card);border:2px solid var(--line-strong);border-radius:16px;padding:24px 28px;max-width:440px">\
          <p style="font-size:13px;color:var(--text-soft);margin:0 0 20px;line-height:1.5">Guadagni <strong style="color:var(--accent-green)">15 minuti</strong> per ogni amico che si iscrive. Guadagnati: <strong style="color:var(--accent-green)" id="profileRefEarned">+0</strong></p>\
          <div style="margin-bottom:20px"><span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:\"Manrope\",sans-serif;display:block;margin-bottom:6px">Referral Link</span>\
            <div style="display:flex;gap:6px"><span style="flex:1;padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:11px;font-family:\"JetBrains Mono\",monospace;color:var(--text-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg)" id="profileRefLink">Caricamento…</span></div>\
          </div>\
        </div>\
      </section>\
    </div>';
}

export async function init() {
  var profile = window._sottotitoliProfile || window.profile;
  if (!profile) return;
  var dn = document.getElementById('profileDisplayName');
  if (dn) dn.textContent = profile.display_name || profile.full_name || 'Utente';
  var em = document.getElementById('profileEmail');
  if (em && profile.email) em.textContent = profile.email;
  var uid = document.getElementById('profileUserId');
  if (uid && profile.id) uid.textContent = profile.id.slice(0, 8) + '...';
  var nat = document.getElementById('profileNativeLang');
  if (nat && profile.native_language) nat.textContent = profile.native_language;
}

export function destroy() { container = null; }
