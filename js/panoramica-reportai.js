            (function(){
              function escHtml(s) {
                if (s === null || s === undefined) return '';
                return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
              }
              function safeId(x) {
                return String(x === null || x === undefined ? '' : x).replace(/[^a-zA-Z0-9_-]/g,'');
              }
              // File-level i18n helper.
              // A raiT() helper already exists, but it is declared INSIDE updateView(),
              // so the picker functions below cannot see it. That scoping is exactly how
              // six user-facing strings ended up hardcoded (Italian in an English UI, and
              // 'Toggle favorite' in Italian) while the surrounding UI translated fine.
              function T(k, fb) {
                try { if (typeof I18n !== 'undefined' && I18n.t) { var v = I18n.t(k); if (v && v !== k) return v; } } catch(e){}
                return fb;
              }
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
                  var lbl = cardLabel(selectedPreset);
                  // Credits come from PRODUCT_MAP, which is loaded from
                  // public.report_products — never from the HTML, so what we show is
                  // exactly what we deduct.
                  var cst = (PRODUCT_MAP[selectedPreset.value] && PRODUCT_MAP[selectedPreset.value].credits) || 0;
                  var pIconEl = selectedPreset.parentElement.querySelector('.material-symbols-outlined');
                  // Keyed on the product, so the name follows the locale like the card does.
                  setCopy(typeNameEl, 'rai_prod_' + selectedPreset.value, lbl);
                  if (typeCostEl) typeCostEl.textContent = cst + ' CR';
                  if (typeIconEl) typeIconEl.textContent = pIconEl ? pIconEl.textContent : 'auto_graph';
                } else {
                  if (typeNameEl) typeNameEl.textContent = raiT('rai_make_choice', 'Fai prima una scelta');
                  if (typeCostEl) typeCostEl.textContent = '';
                }
                var engineSel = null;
                engineRadios.forEach(function(r){ if (r.checked) engineSel = r; });
                if (engineSel) {
                  // Keyed, so it follows the active locale instead of freezing in
                  // whichever one was current when the panel was last rendered.
                  setCopy(engineNameEl,
                          engineSel.value === '5' ? 'rai_neural' : 'rai_standard',
                          engineSel.value === '5'
                            ? 'Analisi neurale approfondita'
                            : 'Sintesi standard');
                  if (engineCostEl) engineCostEl.textContent = '+' + engineSel.value + ' CR';
                } else {
                  if (engineNameEl) engineNameEl.textContent = raiT('rai_make_choice', 'Fai prima una scelta');
                  if (engineCostEl) engineCostEl.textContent = '';
                }

                if (!selectedPreset) return;
                var label = cardLabel(selectedPreset);
                var desc = cardDesc(selectedPreset);
                var cost = (PRODUCT_MAP[selectedPreset.value] && PRODUCT_MAP[selectedPreset.value].credits) || 0;
                var metrics = JSON.parse(selectedPreset.getAttribute('data-metrics') || '[]');
                if (selectedDescription) setCopy(selectedDescription, 'rai_prod_' + selectedPreset.value + '_desc', desc);
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

                // Translate the strings we just injected for the active locale.
                if (window.I18n && I18n.apply) { try { I18n.apply(); } catch (e) {} }
              }

               reportRadios.forEach(function(r){ r.addEventListener('change', updateView); });
               engineRadios.forEach(function(r){ r.addEventListener('change', updateView); });

              // ═══ The report catalogue comes from the database ═══
              // public.report_products is the single source of truth. A card's
              // `value` IS product_key, and both the price shown and the id sent to
              // the worker come from that row — the UI holds no copy of the numbers,
              // so it cannot drift from billing.
              //
              // This used to be a hardcoded PRESET_MAP, and it drifted exactly as
              // you would expect: it disagreed with the catalogue, three of its nine
              // entries were the same prompt, and 'cefr' charged 4 credits for the
              // Pronunciation report.
              //
              // The fallback below is used only until the fetch lands, or if it
              // fails, so the panel is never unusable. It is a fallback, not a
              // source: scripts/check-report-catalogue.sh checks the HTML cards
              // against the live table, which is what keeps this honest.
              var PRODUCT_FALLBACK = {
                comprehensive: { id: 1,  credits: 3 },
                fluency:       { id: 3,  credits: 2 },
                vocabulary:    { id: 2,  credits: 2 },
                pronunciation: { id: 4,  credits: 4 },
                discourse:     { id: 11, credits: 4 }
              };
              var PRODUCT_MAP = PRODUCT_FALLBACK;

              // Visible copy is read from the DOM, never from data-* attributes.
              // The attributes held English strings that were injected verbatim by
              // selectedDescription.textContent — which breaks the i18n contract:
              // JS must inject Italian, or switching to IT captures the English as
              // the "original" and corrupts it.
              //
              // data-i18n-orig-txt is the Italian original that I18n.captureOriginals()
              // snapshots, so reading it means we always inject Italian and let the
              // translation observer localise it — exactly like the rest of the page.
              function cardCopy(el) {
                if (!el) return '';
                return (el.getAttribute('data-i18n-orig-txt') || el.textContent).trim();
              }
              function cardLabel(r) {
                return cardCopy(r.parentElement.querySelector('p.rai-font-bold'));
              }
              function cardDesc(r) {
                var ps = r.parentElement.querySelectorAll('p');
                return ps.length > 1 ? cardCopy(ps[1]) : '';
              }

              // Make a JS-injected string translatable. The element gets the key and
              // the Italian original, then I18n.apply() translates it — so the copy
              // follows the active locale instead of freezing in whichever locale
              // happened to be active when it was set. The previous code wrote the
              // English data-label straight in, so this panel was English in both
              // languages.
              function setCopy(el, key, itText) {
                if (!el) return;
                el.setAttribute('data-i18n', key);
                el.setAttribute('data-i18n-orig-txt', itText);
                el.textContent = itText;
              }

              // Paint prices from the map we hold, and hide any card whose product
              // the catalogue does not offer — a card that cannot be billed must not
              // be selectable.
              function applyProducts(products) {
                reportRadios.forEach(function(r){
                  var p = products[r.value];
                  var card = r.closest('label');
                  if (!p) {
                    if (card) { card.style.display = 'none'; card.setAttribute('data-unavailable', '1'); }
                    return;
                  }
                  if (card) { card.style.display = ''; card.removeAttribute('data-unavailable'); }
                  var badge = r.parentElement.querySelector('[data-price]');
                  if (badge) badge.textContent = p.credits + 'cr';
                  r.setAttribute('data-cost', String(p.credits));
                });
                PRODUCT_MAP = products;
                // If the selected preset is not offered, select the first that is.
                var usable = document.querySelectorAll('#pnl-report-ai input[name="reportType"]:not([data-unavailable])');
                var anyChecked = false;
                usable.forEach(function(r){ if (r.checked) anyChecked = true; });
                if (!anyChecked && usable.length) usable[0].checked = true;
                updateView();
              }

              (async function loadProducts(){
                try {
                  var c = window.sottotitoliSupabase;
                  if (!c) return;
                  var res = await c.from('report_products')
                    .select('id,product_key,credits,basis')
                    .eq('is_active', true)
                    .eq('basis', 'sessions');
                  if (res.error || !res.data || !res.data.length) return;
                  var map = {};
                  res.data.forEach(function(p){ map[p.product_key] = { id: p.id, credits: p.credits }; });
                  applyProducts(map);
                } catch (e) { /* keep the fallback */ }
              })();

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

                var product = PRODUCT_MAP[presetKey];
                if (!product) { showToastMsg('⚠️ Tipo di analisi non riconosciuto.'); return; }
                if (!product.id) { showToastMsg('⚠️ Tipo di analisi non disponibile. Ricarica la pagina.'); return; }

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
                var totalCredits = product.credits + engineCost;

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

                // Give report credits back when no report can be produced.
                // Idempotent server-side (keyed on the reference), so it is safe to
                // call from here AND from the worker for the same request.
                var refundReportCredits = async function(uidArg, amount, ref) {
                  try {
                    var r = await sb.rpc('refund_report_credits', {
                      p_user_id: uidArg, p_amount: amount, p_reference: ref
                    });
                    if (r.error) { console.warn('Refund failed:', r.error.message); return false; }
                    return !!(r.data && r.data.success);
                  } catch (e) {
                    console.warn('Refund threw:', e);
                    return false;
                  }
                };

                try {
                  // ── Atomic token deduction ──
                  // chargeRef identifies THIS charge in the ledger. The same value is
                  // reused as the refund key, so a re-credit can never double-apply —
                  // no matter how many times a retry or a flaky network asks for it.
                  var chargeRef = 'report_' + presetKey + '_' + Date.now();
                  var deductResult = await sb.rpc('deduct_tokens', {
                    p_user_id: uid,
                    p_amount: totalCredits,
                    p_reference: chargeRef
                  });
                  // deduct_tokens reports a LOGICAL failure as a normal response
                  // ({success:false, error:'Insufficient tokens'}), NOT as r.error.
                  // The old code only inspected r.error, so that response sailed
                  // through and a request was created WITHOUT being charged.
                  if (!deductResult.error && (!deductResult.data || deductResult.data.success !== true)) {
                    loadingOverlay.style.display = 'none';
                    generateBtn.disabled = false;
                    showToastMsg('⚠️ Crediti non scalati: ' + ((deductResult.data && deductResult.data.error) || 'errore sconosciuto') + '. Riprova.');
                    return;
                  }
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
                   // scope_type MUST be one of ai_report_requests_scope_type_check:
                   //   single_session | selected_sessions | last_7_days | last_30_days
                   // This read 'multi_session', which is NOT in that list — so choosing
                   // two or more sessions failed the insert DETERMINISTICALLY, after the
                   // credits had already been taken. That is the billing bug.

                   var insertPayload = {
                     user_id: uid,
                     session_ids: sessionIds,
                     module_key: String(product.id),
                     scope_type: sessionIds.length > 1 ? 'selected_sessions' : 'single_session',
                     status: 'queued',
                     // Record what was charged so a refund has a source of truth.
                     // process-ai-reports overwrites this with real usage on success,
                     // so the value a failure sees is exactly the amount to give back.
                     tokens_spent: totalCredits,
                     // Ties this request to its charge. refund_report_credits uses it to tell
                     // "no report was delivered" (refundable) from "the report WAS delivered"
                     // (not refundable). Without it, a delivered report could be refunded once —
                     // one free report per real charge. See migration 20260929160000.
                     charge_reference: chargeRef
                   };

                   var ins = await sb.from('ai_report_requests').insert(insertPayload);
                  if (ins.error) {
                    console.warn('Insert error:', ins.error.message);
                    // The charge is applied but no report will ever be produced.
                    // Refund in full, with no administrative fee: restoring an internal
                    // balance touches no payment processor, so there is no cost to pass
                    // on (policy 2026-09-27). A processor fee is withheld only on a
                    // money refund under the 14-day policy, which is Stripe-side.
                    var refunded = await refundReportCredits(uid, totalCredits, chargeRef);
                    loadingOverlay.style.display = 'none';
                    generateBtn.disabled = false;
                    showToastMsg(refunded
                      ? '⚠️ Errore: ' + ins.error.message + ' — crediti riaccreditati.'
                      : '⚠️ Errore: ' + ins.error.message + '. Crediti non riaccreditati: scrivi a support@sottotitoli.pro.');
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
                      // Match THIS request, not the newest completed report for the
                      // user. With two reports in flight the old query could pick up
                      // the other request's text and show it as this one's.
                      // request_id is written by process-ai-reports (migration
                      // 20260929180000); rows from before it have null and simply
                      // never match — a safe timeout rather than a wrong report.
                      var check = requestId
                        ? await sb.from('session_ai_reports')
                            .select('id,summary,overall_score,confidence,status')
                            .eq('request_id', requestId)
                            .limit(1)
                        : await sb.from('session_ai_reports')
                            .select('id,summary,overall_score,confidence,status')
                            .eq('user_id', uid)
                            .order('created_at', { ascending: false })
                            .limit(1);
                      if (check.data && check.data.length && check.data[0].status === 'completed') {
                        clearInterval(pollInterval);
                        loadingOverlay.style.display = 'none';
                        generateBtn.disabled = false;
                        var report = check.data[0];
                        showToastMsg('✅ Report completato' + (report.confidence ? ' · Confidence: ' + report.confidence + '/100' : (report.overall_score ? ' · Confidence: ' + report.overall_score + '/100' : '')));
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
                  listEl.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:20px">' + escHtml(T('rai_picker_empty', 'No sessions found. Record some sessions first.')) + '</p>';
                  pickerBuilt = true;
                  return;
                }
                listEl.innerHTML = '';
                allSessions.forEach(function(s){
                  var name = s.name || (T('session_untitled', 'Session') + ' ' + new Date(s.started_at).toLocaleDateString(I18n.locale()));
                  var dateStr = s.started_at ? new Date(s.started_at).toLocaleDateString(I18n.locale(), {day:'2-digit',month:'short',year:'numeric'}) : '';
                  var checked = selectedTranscriptIds.indexOf(s.id) !== -1;
                  var isFav = s.favorite;
                  var favIcon = isFav ? '★' : '☆';
                  var favColor = isFav ? 'color:#f59e0b' : 'color:var(--text-soft)';
                  var row = document.createElement('label');
                  row.setAttribute('data-sid', s.id);
                  row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid ' + (checked ? 'var(--cyan)' : 'var(--line)') + ';border-radius:12px;cursor:pointer;background:' + (checked ? 'rgba(6,182,212,.06)' : 'var(--bg)') + ';transition:all .15s';
                  row.innerHTML = '<span onclick="event.stopPropagation();trToggleFav(\'' + safeId(s.id) + '\')" style="font-size:18px;cursor:pointer;' + favColor + ';flex-shrink:0" title="' + escHtml(T('rai_picker_fav', 'Toggle favorite')) + '">' + favIcon + '</span>' +
                    '<input type="checkbox" value="' + safeId(s.id) + '" ' + (checked ? 'checked' : '') + ' style="accent-color:var(--cyan);width:18px;height:18px;cursor:pointer;flex-shrink:0">' +
                    '<span style="flex:1;font-size:15px;font-weight:600;color:var(--text)">' + escHtml(name) + '</span>' +
                    '<span style="font-size:13px;color:var(--text-soft);white-space:nowrap">' + escHtml(dateStr) + '</span>';
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
                var _n = selectedTranscriptIds.length;
                // One key per number, so Italian can agree with the count. Concatenating
                // the number onto a single plural is how this rendered "1 sessioni".
                if (countEl) countEl.textContent = _n + ' ' + T(_n === 1 ? 'rai_picker_sel_one' : 'rai_picker_sel_many', 'selected');
                var label = document.getElementById('transcriptSelectionLabel');
                if (label) {
                  if (_n) {
                    // Show abbreviated session names
                    var names = [];
                    allSessions.forEach(function(s){
                      if (selectedTranscriptIds.indexOf(s.id) !== -1) {
                        var n = s.name || new Date(s.started_at).toLocaleDateString(I18n.locale(), {day:'2-digit',month:'short'});
                        names.push(n);
                      }
                    });
                    label.textContent = _n + ' ' + T(_n === 1 ? 'rai_picker_lbl_one' : 'rai_picker_lbl_many', 'sessions:') + ' ' + names.join(', ');
                  } else {
                    label.textContent = T('rai_multi_select', 'Multi-select specific sessions');
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
