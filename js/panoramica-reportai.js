            (function(){
              var generateBtn = document.getElementById('generateBtn');
              var loadingOverlay = document.getElementById('loadingOverlay');
              var cancelBtn = document.getElementById('cancelBtn');
              var btnPrice = document.getElementById('btnPrice');
              var selectedDescription = document.getElementById('selectedDescription');
              var metricsList = document.getElementById('metricsList');

              // Peer-checked radio styling
              var styleEl = document.createElement('style');
              styleEl.textContent = '#pnl-report-ai input[name="reportType"]:checked + div { background: var(--cyan) !important; color: #fff !important; border-color: var(--cyan) !important; }' +
                '#pnl-report-ai input[name="reportType"]:checked + div .material-symbols-outlined { color: #fff !important; }' +
                '#pnl-report-ai input[name="reportType"]:checked + div .text-label-mono { color: rgba(255,255,255,.85) !important; }' +
                '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
                '@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }';
              document.head.appendChild(styleEl);

              var reportRadios = document.querySelectorAll('#pnl-report-ai input[name="reportType"]');
              var engineRadios = document.querySelectorAll('#pnl-report-ai input[name="engine"]');

              function updateView() {
                var selectedPreset;
                reportRadios.forEach(function(r){ if(r.checked) selectedPreset = r; });

                // ── "Your choice" confirmation (right column) ──
                function raiT(k, fb){ try { if (typeof I18n !== 'undefined' && I18n.t) { var v = I18n.t(k); if (v && v !== k) return v; } } catch(e){} return fb; }
                var typeNameEl = document.getElementById('raiTypeConfirmName');
                var typeCostEl = document.getElementById('raiTypeConfirmCost');
                var typeIconEl = document.getElementById('raiTypeConfirmIcon');
                var engineNameEl = document.getElementById('raiEngineConfirmName');
                var engineCostEl = document.getElementById('raiEngineConfirmCost');
                if (selectedPreset) {
                  var lbl = selectedPreset.getAttribute('data-label');
                  var cst = parseInt(selectedPreset.getAttribute('data-cost'));
                  var pIconEl = selectedPreset.parentElement.querySelector('.material-symbols-outlined');
                  if (typeNameEl) typeNameEl.textContent = lbl;
                  if (typeCostEl) typeCostEl.textContent = cst + ' CR';
                  if (typeIconEl) typeIconEl.textContent = pIconEl ? pIconEl.textContent : 'auto_graph';
                } else {
                  if (typeNameEl) typeNameEl.textContent = raiT('rai_make_choice', 'Fai prima una scelta');
                  if (typeCostEl) typeCostEl.textContent = '';
                }
                var engineSel = null;
                engineRadios.forEach(function(r){ if (r.checked) engineSel = r; });
                if (engineSel) {
                  if (engineNameEl) engineNameEl.textContent = (engineSel.value === '5') ? raiT('rai_neural', 'Neural Deep Dive') : raiT('rai_standard', 'Standard Synthesis');
                  if (engineCostEl) engineCostEl.textContent = '+' + engineSel.value + ' CR';
                } else {
                  if (engineNameEl) engineNameEl.textContent = raiT('rai_make_choice', 'Fai prima una scelta');
                  if (engineCostEl) engineCostEl.textContent = '';
                }

                if (!selectedPreset) return;
                var label = selectedPreset.getAttribute('data-label');
                var desc = selectedPreset.getAttribute('data-desc');
                var cost = parseInt(selectedPreset.getAttribute('data-cost'));
                var metrics = JSON.parse(selectedPreset.getAttribute('data-metrics'));
                if (selectedDescription) selectedDescription.textContent = desc;
                metricsList.innerHTML = '';
                metrics.forEach(function(m){
                  var li = document.createElement('li');
                  li.className = 'flex gap-sm items-center';
                  li.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px';
                  li.innerHTML = '<span class="material-symbols-outlined text-success-emerald" style="font-size:20px;color:#10B981">check_circle</span><span style="font-size:15px;line-height:22px">' + m + '</span>';
                  metricsList.appendChild(li);
                });
                var engineCost = 0;
                engineRadios.forEach(function(r){ if(r.checked) engineCost = parseInt(r.value); });
                btnPrice.textContent = (cost + engineCost) + ' CR';
              }

              reportRadios.forEach(function(r){ r.addEventListener('change', updateView); });
              engineRadios.forEach(function(r){ r.addEventListener('change', updateView); });

              // ═══ Preset → Module mapping (sync with ai_configs preset_pricing) ═══
              var PRESET_MAP = {
                holistic:     { moduleId: 1, moduleKey: '1', credits: 3 },
                personalized: { moduleId: 1, moduleKey: '1', credits: 3 },
                growth:       { moduleId: 1, moduleKey: '1', credits: 3 },
                cefr:         { moduleId: 4, moduleKey: '4', credits: 4 },
                explorer:     { moduleId: 3, moduleKey: '3', credits: 2 },
                homework:     { moduleId: 3, moduleKey: '3', credits: 2 },
                cambridge:    { moduleId: 11, moduleKey: '11', credits: 4 },
                speech:       { moduleId: 4, moduleKey: '4', credits: 4 },
                drills:       { moduleId: 2, moduleKey: '2', credits: 2 }
              };

              generateBtn.addEventListener('click', async function(){
                // ── Validation ──
                var sb = window.sottotitoliSupabase;
                if (!sb) { showToastMsg('⚠️ Effettua il login per generare report.'); return; }
                var r = await sb.auth.getSession();
                if (!r.data?.session) { showToastMsg('⚠️ Sessione scaduta. Rieffettua il login.'); return; }
                var uid = r.data.session.user.id;

                // Get selected preset
                var selectedPreset;
                reportRadios.forEach(function(rd){ if(rd.checked) selectedPreset = rd; });
                if (!selectedPreset) { showToastMsg('⚠️ Seleziona un tipo di analisi.'); return; }
                var presetKey = selectedPreset.value;
                var mapping = PRESET_MAP[presetKey];
                if (!mapping) { showToastMsg('⚠️ Tipo di analisi non riconosciuto.'); return; }

                // Get selected sessions from transcript picker
                var sessionIds = selectedTranscriptIds.slice();
                if (!sessionIds.length) {
                  // Fallback: try to use sessions from the panorama list
                  if (allSessions && allSessions.length) {
                    sessionIds = [allSessions[0].id];
                  }
                }
                if (!sessionIds.length) { showToastMsg('⚠️ Seleziona almeno una sessione da analizzare.'); return; }

                // Get engine (0=standard, 5=neural deep dive)
                var engineCost = 0;
                engineRadios.forEach(function(er){ if(er.checked) engineCost = parseInt(er.value); });
                var totalCredits = mapping.credits + engineCost;

                // ── Credit Check ──
                var balance = 0;
                try {
                  var tokenRes = await sb.rpc('get_token_balance', { p_user_id: uid });
                  if (tokenRes.data !== null && tokenRes.data !== undefined) {
                    balance = tokenRes.data;
                  }
                } catch(e) { console.warn('RPC get_token_balance failed:', e.message); }

                // Fallback to direct query if RPC didn't give us a balance
                if (balance === 0) {
                  try {
                    var tb = await sb.from('user_tokens').select('balance').eq('user_id', uid).single();
                    if (!tb.error && tb.data) balance = tb.data.balance;
                  } catch(e2) { console.warn('Token direct query failed:', e2); }
                }

                if (balance < totalCredits) {
                  showToastMsg('⚠️ Crediti insufficienti. Hai ' + balance + ' crediti, servono ' + totalCredits + '.');
                  appConfirm('Ti servono ' + totalCredits + ' crediti ma ne hai solo ' + balance + '. Vuoi acquistare altri crediti?', function(){ window.location.href = 'wallet.html'; }, 'Crediti insufficienti', '💳');
                  return;
                }

                // ── Show loading ──
                loadingOverlay.style.display = 'flex';
                generateBtn.disabled = true;

                try {
                  // ── Atomic token deduction ──
                  var deductResult = await sb.rpc('deduct_tokens', {
                    p_user_id: uid,
                    p_amount: totalCredits,
                    p_reference: 'report_' + presetKey + '_' + Date.now()
                  });
                  if (deductResult.error) {
                    console.warn('Deduct error:', deductResult.error);
                    // Fallback: try direct update
                    var upd = await sb.from('user_tokens').update({ balance: balance - totalCredits, updated_at: new Date().toISOString() }).eq('user_id', uid).eq('balance', balance);
                    if (upd.error || !upd.data || upd.data.length === 0) {
                      loadingOverlay.style.display = 'none';
                      generateBtn.disabled = false;
                      showToastMsg('⚠️ Impossibile dedurre i crediti. Riprova.');
                      return;
                    }
                    // Log transaction
                    await sb.from('token_transactions').insert({
                      user_id: uid, amount: -totalCredits, type: 'report_usage',
                      reference: 'report_' + presetKey, balance_after: balance - totalCredits
                    });
                  }

                  // ── Insert request ──
                  var ins = await sb.from('ai_report_requests').insert({
                    user_id: uid,
                    session_ids: sessionIds,
                    module_key: mapping.moduleKey,
                    scope_type: sessionIds.length > 1 ? 'multi_session' : 'single_session',
                    status: 'queued'
                  });
                  if (ins.error) {
                    console.warn('Insert error:', ins.error.message);
                    loadingOverlay.style.display = 'none';
                    generateBtn.disabled = false;
                    showToastMsg('⚠️ Errore: ' + ins.error.message);
                    return;
                  }
                  if (XP && XP.award) XP.award('ai_report');
                  var requestId = ins.data && ins.data[0] ? ins.data[0].id : null;

                  // ── Trigger edge function ──
                  try {
                    var token = r.data.session.access_token;
                    await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requestId: requestId })
                    });
                  } catch(efErr) {
                    console.warn('Edge function trigger failed (will be picked up by cron):', efErr);
                  }

                  // ── Poll for completion ──
                  var pollCount = 0;
                  var maxPolls = 30; // 30 × 2s = 60s max
                  var pollInterval = setInterval(async function(){
                    pollCount++;
                    try {
                      var check = await sb.from('session_ai_reports')
                        .select('id,summary,overall_score,status')
                        .eq('user_id', uid)
                        .order('created_at', { ascending: false })
                        .limit(1);
                      if (check.data && check.data.length && check.data[0].status === 'completed') {
                        clearInterval(pollInterval);
                        loadingOverlay.style.display = 'none';
                        generateBtn.disabled = false;
                        var report = check.data[0];
                        showToastMsg('✅ Report completato · Score: ' + (report.overall_score || 'N/A'));
                        // Refresh "I miei Report" tab if visible
                        var mieiPanel = document.getElementById('sub-rai-miei');
                        if (mieiPanel) mieiPanel.dispatchEvent(new Event('reports-loaded'));
                      }
                    } catch(e) {}
                    if (pollCount >= maxPolls) {
                      clearInterval(pollInterval);
                      loadingOverlay.style.display = 'none';
                      generateBtn.disabled = false;
                      showToastMsg('⏳ Report in elaborazione. Controlla "I miei Report" tra poco.');
                    }
                  }, 2000);

                } catch(e) {
                  console.error('Generate report error:', e);
                  loadingOverlay.style.display = 'none';
                  generateBtn.disabled = false;
                  showToastMsg('❌ Errore: ' + (e.message || 'Sconosciuto'));
                }
              });

              cancelBtn.addEventListener('click', function(){
                loadingOverlay.style.display = 'none';
              });

              updateView();

              // ── Collapsible preset categories (Grammar / Vocabulary / Training & Focus) ──
              window.raiToggleCat = function(hdr){
                var cat = hdr.parentElement;
                if (!cat) return;
                var grid = cat.querySelector('.rai-grid');
                var chev = hdr.querySelector('.rai-chev');
                if (!grid) return;
                var hidden = grid.style.display === 'none';
                grid.style.display = hidden ? '' : 'none';
                if (chev) chev.classList.toggle('open', hidden);
              };

              // ── Transcript Picker ──
              var selectedTranscriptIds = [];
              var allSessions = [];
              var pickerBuilt = false; // Only build DOM once

              function buildTranscriptPickerOnce() {
                var listEl = document.getElementById('transcriptPickerList');
                if (!listEl || pickerBuilt) return;
                if (!allSessions.length) {
                  listEl.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:20px">No sessions found. Record some sessions first.</p>';
                  pickerBuilt = true;
                  return;
                }
                listEl.innerHTML = '';
                allSessions.forEach(function(s){
                  var name = s.name || ('Session ' + new Date(s.started_at).toLocaleDateString('it-IT'));
                  var dateStr = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'}) : '';
                  var checked = selectedTranscriptIds.indexOf(s.id) !== -1;
                  var isFav = s.favorite;
                  var favIcon = isFav ? '★' : '☆';
                  var favColor = isFav ? 'color:#f59e0b' : 'color:var(--text-soft)';
                  var row = document.createElement('label');
                  row.setAttribute('data-sid', s.id);
                  row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid ' + (checked ? 'var(--cyan)' : 'var(--line)') + ';border-radius:12px;cursor:pointer;background:' + (checked ? 'rgba(6,182,212,.06)' : 'var(--bg)') + ';transition:all .15s';
                  row.innerHTML = '<span onclick="event.stopPropagation();trToggleFav(\'' + s.id + '\')" style="font-size:18px;cursor:pointer;' + favColor + ';flex-shrink:0" title="Toggle favorite">' + favIcon + '</span>' +
                    '<input type="checkbox" value="' + s.id + '" ' + (checked ? 'checked' : '') + ' style="accent-color:var(--cyan);width:18px;height:18px;cursor:pointer;flex-shrink:0">' +
                    '<span style="flex:1;font-size:15px;font-weight:600;color:var(--text)">' + name + '</span>' +
                    '<span style="font-size:13px;color:var(--text-soft);white-space:nowrap">' + dateStr + '</span>';
                  // Hover effects
                  row.addEventListener('mouseenter', function(){
                    var cb = this.querySelector('input');
                    if (!cb.checked) { this.style.borderColor = 'var(--cyan)'; this.style.background = 'rgba(6,182,212,.04)'; }
                  });
                  row.addEventListener('mouseleave', function(){
                    var cb = this.querySelector('input');
                    if (!cb.checked) { this.style.borderColor = 'var(--line)'; this.style.background = 'var(--bg)'; }
                  });
                  // Checkbox change — toggle inline, no re-render
                  row.querySelector('input').addEventListener('change', function(){
                    var sid = this.value;
                    if (this.checked) {
                      if (selectedTranscriptIds.indexOf(sid) === -1) selectedTranscriptIds.push(sid);
                      row.style.borderColor = 'var(--cyan)';
                      row.style.background = 'rgba(6,182,212,.06)';
                    } else {
                      selectedTranscriptIds = selectedTranscriptIds.filter(function(id){ return id !== sid; });
                      row.style.borderColor = 'var(--line)';
                      row.style.background = 'var(--bg)';
                    }
                    refreshPickerCount();
                  });
                  listEl.appendChild(row);
                });
                pickerBuilt = true;
              }

              function refreshPickerCount() {
                var countEl = document.getElementById('transcriptPickerCount');
                if (countEl) countEl.textContent = selectedTranscriptIds.length + ' selezionati';
                var label = document.getElementById('transcriptSelectionLabel');
                if (label) {
                  if (selectedTranscriptIds.length) {
                    // Show abbreviated session names
                    var names = [];
                    allSessions.forEach(function(s){
                      if (selectedTranscriptIds.indexOf(s.id) !== -1) {
                        var n = s.name || new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short'});
                        names.push(n);
                      }
                    });
                    label.textContent = selectedTranscriptIds.length + ' sessioni: ' + names.join(', ');
                  } else {
                    label.textContent = 'Multi-select specific sessions';
                  }
                }
              }

              // Also update label when modal opens
              function openPicker() {
                var modal = document.getElementById('transcriptPickerModal');
                if (!modal) return;
                modal.style.display = 'flex';
                buildTranscriptPickerOnce();
                refreshPickerCount();
                // Sync checkboxes with selectedTranscriptIds
                var rows = document.querySelectorAll('#transcriptPickerList label[data-sid]');
                rows.forEach(function(row){
                  var sid = row.getAttribute('data-sid');
                  var cb = row.querySelector('input');
                  var isSelected = selectedTranscriptIds.indexOf(sid) !== -1;
                  if (cb) cb.checked = isSelected;
                  row.style.borderColor = isSelected ? 'var(--cyan)' : 'var(--line)';
                  row.style.background = isSelected ? 'rgba(6,182,212,.06)' : 'var(--bg)';
                });
                refreshPickerCount();
              }

              var openBtn = document.getElementById('openTranscriptPicker');

              if (openBtn) openBtn.addEventListener('click', openPicker);

              // The modal markup lives at the end of <body> (AFTER this script block), so direct
              // getElementById bindings for the modal buttons resolve to null here (the old
              // `if (confirmBtn) addEventListener(...)` never fired → Apply/Clear did nothing).
              // Use delegated document listeners instead — they work no matter when the modal
              // enters the DOM, and Apply now closes the popup after applying.
              document.addEventListener('click', function(e){
                if (!e.target || !e.target.closest) return;
                var modal = document.getElementById('transcriptPickerModal');
                if (e.target.closest('#closeTranscriptPicker')) { if (modal) modal.style.display = 'none'; return; }
                if (e.target.closest('#clearTranscriptSelection')) {
                  selectedTranscriptIds = [];
                  var rows = document.querySelectorAll('#transcriptPickerList label[data-sid]');
                  rows.forEach(function(row){
                    var cb = row.querySelector('input');
                    if (cb) cb.checked = false;
                    row.style.borderColor = 'var(--line)';
                    row.style.background = 'var(--bg)';
                  });
                  refreshPickerCount();
                  showToastMsg('🗑️ Selezione cancellata.');
                  return;
                }
                if (e.target.closest('#confirmTranscriptSelection')) {
                  if (!selectedTranscriptIds.length) {
                    showToastMsg('⚠️ Seleziona almeno una sessione.');
                    return;
                  }
                  if (modal) modal.style.display = 'none';
                  refreshPickerCount();
                  showToastMsg('✅ ' + selectedTranscriptIds.length + ' sessione/i selezionata/e.');
                }
              });

              // Load sessions
              if(window.SottotitoliData && window.SottotitoliData.getSessions){
                window.SottotitoliData.getSessions().then(function(sessions){
                  allSessions = sessions || [];
                  renderTranscriptPickerList();
                }).catch(function(){
                  document.getElementById('transcriptPickerList').innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:20px">Unable to load sessions. Try again later.</p>';
                });
              } else {
                // Retry
                var retries = 0;
                var loadInterval = setInterval(function(){
                  if(window.SottotitoliData && window.SottotitoliData.getSessions){
                    clearInterval(loadInterval);
                    window.SottotitoliData.getSessions().then(function(sessions){
                      allSessions = sessions || [];
                      renderTranscriptPickerList();
                    }).catch(function(){});
                  }
                  if (++retries > 20) clearInterval(loadInterval);
                }, 300);
              }

              // Stub for legacy generateReport calls from grammar panel
              window.generateReport = function(type) {
                var sb = window.sottotitoliSupabase;
                if (!sb) { appAlert('Accedi per generare report.', 'Accesso richiesto', '🔒'); return; }
                sb.auth.getSession().then(async function(r) {
                  if (!r.data?.session) { appAlert('Sessione scaduta. Rieffettua il login.', 'Sessione scaduta', '⚠️'); return; }
                  var token = r.data.session.access_token;
                  var sessionEl = document.getElementById('gramSessionSelect');
                  var sessionId = sessionEl ? sessionEl.value : '';
                  if (!sessionId) { appAlert('Seleziona una sessione.', 'Sessione richiesta', '📌'); return; }
                  try {
                    var funcUrl = type === 'grammar-full'
                      ? 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-grammar-report'
                      : 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports';
                    var body = JSON.stringify({ sessionId: sessionId, contentLanguage: 'en', explanationLanguage: 'it' });
                    var resp = await fetch(funcUrl, {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                      body: body
                    });
                    var result = await resp.json();
                    if (resp.ok && !result.error) {
                      showToastMsg('✅ Report generato');
                    } else {
                      showToastMsg('❌ ' + (result.error || 'Errore nella generazione.'));
                    }
                  } catch(e) {
                    showToastMsg('❌ Errore di rete: ' + e.message);
                  }
                }).catch(function(e) {
                  showToastMsg('❌ ' + e.message);
                });
              };

              // deleteAllReports kept for Impostazioni danger zone
              window.deleteAllReports = async function() {
                var sb = window.sottotitoliSupabase;
                if (!sb) { appAlert('Accedi per gestire i report.', 'Accesso richiesto', '🔒'); return; }
                var r = await sb.auth.getSession();
                if (!r.data?.session) { appAlert('Sessione scaduta.', 'Sessione scaduta', '⚠️'); return; }
                var uid = r.data.session.user.id;
                appConfirm('Eliminare tutti i report? Questa azione non può essere annullata.', async function(){
                  var dr = await sb.from('session_ai_reports').delete().eq('user_id', uid);
                  if (dr.error) { appAlert('Errore: ' + dr.error.message, 'Errore', '❌'); return; }
                  appAlert('Tutti i report eliminati.', 'Operazione completata', '✅');
                  window.location.reload();
                }, 'Elimina tutti i report', '🗑️');
              };
            })();
