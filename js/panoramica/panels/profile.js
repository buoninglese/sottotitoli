// js/panoramica/panels/profile.js — pnl-profilo panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-profilo">
          <section class="panel-head" style="border-bottom:2px solid var(--line-strong);padding-bottom:24px;margin-bottom:40px"><h2 data-i18n="profilo">Profilo</h2><p style="font-size:15px;color:var(--text-soft);margin:6px 0 0;max-width:600px;line-height:1.5">Gestisci le tue informazioni personali, le preferenze di apprendimento e il tuo referral.</p></section>

          <!-- Section: Profile Identity -->
          <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
            <div style="display:grid;grid-template-columns:1fr;gap:32px">
              <!-- Desktop: 3-col grid -->
              <style>
                @media(min-width:1024px){
                  #pnl-profilo .prof-grid{grid-template-columns:1fr 2fr}
                  #pnl-profilo .prof-label{text-align:left}
                }
              </style>
              <div class="prof-grid" style="display:grid;gap:32px">
                <!-- Left: Title -->
                <div class="prof-label">
                  <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Identità</h3>
                  <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Avatar, nome e dettagli anagrafici visibili sul tuo profilo pubblico.</p>
                </div>
                <!-- Right: Avatar + Details -->
                <div style="display:flex;flex-direction:column;gap:24px">
                  <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
                    <div style="position:relative;flex-shrink:0">
                      <img id="profileAvatar" src="" alt="Avatar" style="width:120px;height:120px;border-radius:16px;object-fit:contain;border:3px solid var(--line);background:var(--card)" onerror="this.style.display='none'">
                      <div id="profileAvatarPlaceholder" style="width:120px;height:120px;border-radius:16px;background:var(--card);border:3px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:48px">👤</div>
                      <label for="avatarUpload" style="position:absolute;bottom:4px;right:4px;width:30px;height:30px;border-radius:50%;background:var(--cyan);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .15s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"><span class="material-symbols-outlined" style="font-size:15px">edit</span></label>
                      <input type="file" id="avatarUpload" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadAvatar(this)">
                    </div>
                    <div style="flex:1;min-width:200px">
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                        <span style="font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em" id="profileDisplayName">—</span>
                        <span id="profilePlanPill" style="font-size:9px;font-weight:700;font-family:'Manrope',sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:3px 10px;border-radius:99px;display:none"></span>
                        <button id="btnEditName" onclick="editProfileName()" title="Modifica nome" data-i18n-title="prof_edit_name" style="background:none;border:1px solid var(--line);border-radius:8px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-soft);font-size:11px;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text-soft)'"><i class="fa-solid fa-pen"></i></button>
                      </div>
                      <p style="font-size:13px;color:var(--text-soft);margin:0 0 16px;font-family:'JetBrains Mono',monospace;opacity:.7" id="profileEmail">—</p>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:340px">
                        <div>
                          <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:'Manrope',sans-serif;display:block;margin-bottom:2px" data-i18n="prof_madrelingua">Madrelingua</span>
                          <span style="font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px" id="profileNativeLang">—</span>
                        </div>
                        <div>
                          <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:'Manrope',sans-serif;display:block;margin-bottom:2px" data-i18n="prof_user_id">User ID</span>
                          <span style="font-size:11px;font-weight:500;color:var(--text-soft);font-family:'JetBrains Mono',monospace;opacity:.6" id="profileUserId">—</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Learning Profile -->
          <section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
            <div class="prof-grid" style="display:grid;gap:32px">
              <div class="prof-label">
                <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Profilo di apprendimento</h3>
                <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Professione, motivazione e abitudini di studio aiutano l'AI a personalizzare i consigli.</p>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <!-- Identity Card -->
                <div style="background:var(--card);border:2px solid var(--line-strong);border-radius:16px;padding:24px 28px">
                  <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 18px;font-size:15px;font-weight:600"><span class="material-symbols-outlined" style="color:var(--cyan)">fingerprint</span> Identità</h3>
                  <div style="display:flex;flex-direction:column;gap:12px">
                    <div><label style="display:block;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:'Manrope',sans-serif;margin-bottom:4px" data-i18n="prof_profession">Professione</label><span style="font-size:14px;font-weight:600;color:var(--text)" id="insightsProfession">—</span></div>
                    <div><label style="display:block;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:'Manrope',sans-serif;margin-bottom:4px" data-i18n="prof_why_study">Perché studio</label><span style="font-size:14px;font-weight:600;color:var(--text)" id="insightsWhyEnglish">—</span></div>
                    <div><label style="display:block;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:'Manrope',sans-serif;margin-bottom:4px" data-i18n="prof_other_langs">Altre lingue</label><div id="insightsSecondLangs" style="font-size:13px;color:var(--text-faint)" data-i18n="prof_complete_onboarding">Completa l'onboarding.</div></div>
                  </div>
                </div>
                <!-- Habits Card -->
                <div style="background:var(--card);border:2px solid var(--line);border-radius:16px;padding:24px 28px">
                  <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 18px;font-size:15px;font-weight:600"><span class="material-symbols-outlined" style="color:var(--cyan)">trending_up</span> Abitudini</h3>
                  <div style="display:flex;flex-direction:column;gap:10px">
                    <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsAvgDaily">—</span><span style="color:var(--text-faint)" data-i18n="prof_daily_avg">Media giornaliera</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsFascia">—</span><span style="color:var(--text-faint)" data-i18n="prof_pref_time">Fascia preferita</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:13px"><span id="insightsGiorni">—</span><span style="color:var(--text-faint)" data-i18n="prof_active_days">Giorni più attivi</span></div>
                  </div>
                  <div id="insightsOverviewPatterns" class="habit-chips" style="margin-top:12px"></div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section: Invite -->
          <section style="padding:0 0 48px">
            <div class="prof-grid" style="display:grid;gap:32px">
              <div class="prof-label">
                <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Invita amici</h3>
                <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Condividi la tua passione per le lingue e guadagna crediti per ogni amico che si iscrive.</p>
              </div>
              <div style="max-width:440px">
                <div style="background:var(--card);border:2px solid var(--line-strong);border-radius:16px;padding:24px 28px">
                  <p style="font-size:13px;color:var(--text-soft);margin:0 0 20px;line-height:1.5">Guadagni <strong style="color:var(--accent-green)">15 minuti</strong> per ogni amico che si iscrive. Guadagnati: <strong style="color:var(--accent-green)" id="profileRefEarned">+0</strong></p>
                  <div style="margin-bottom:20px">
                    <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;display:block;margin-bottom:6px">Referral Link</span>
                    <div style="display:flex;gap:6px">
                      <span style="flex:1;padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg)" id="profileRefLink">Caricamento…</span>
                      <button id="profileCopyRefBtn" onclick="copyProfileRef()" style="padding:10px 14px;border:none;border-radius:10px;background:var(--cyan);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''"><span class="material-symbols-outlined" style="font-size:18px">content_copy</span></button>
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <button onclick="shareRefWhatsApp()" style="width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)'"><i class="fa-brands fa-whatsapp" style="color:#25D366;font-size:16px"></i> Condividi su WhatsApp</button>
                    <button onclick="shareRefEmail()" style="width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)'"><span class="material-symbols-outlined" style="color:var(--cyan);font-size:16px">mail</span> Invia tramite Email</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
`;
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

  var profEl = document.getElementById('insightsProfession');
  if (profEl) profEl.textContent = profile.profession || profile.learning_goal || '—';
  var whyEl = document.getElementById('insightsWhyEnglish');
  if (whyEl) whyEl.textContent = profile.learning_goal || profile.motivation || '—';

  // Plan pill
  var pill = document.getElementById('profilePlanPill');
  if (pill && profile.plan) { pill.textContent = profile.plan.toUpperCase(); pill.style.display = 'inline'; }

  // Referral link
  var refLink = document.getElementById('profileRefLink');
  if (refLink && profile.id) refLink.textContent = 'https://sottotitoli.pro?ref=' + profile.id.slice(0, 8);
  var refEarned = document.getElementById('profileRefEarned');
  if (refEarned && window.refs) refEarned.textContent = '+' + (window.refs.total_earned_minutes || 0);
}

export function destroy() { container = null; }
