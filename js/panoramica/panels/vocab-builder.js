// js/panoramica/panels/vocab-builder.js — pnl-vocabulary-builder panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-vocabulary-builder">
          <section class="panel-head"><h2>Vocabulary Builder</h2></section>
          <section class="panel-tabs"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" class="tab-link active" data-subtab="wb-expand" style="color:var(--cyan)">🇬🇧 English</button><button role="tab" aria-selected="false" class="tab-link" data-subtab="wb-expand-it" style="color:var(--accent-green)">🇮🇹 Italian</button><button role="tab" aria-selected="false" class="tab-link" data-subtab="wb-explore" style="color:var(--purple)">🗺️ Esplora</button><button role="tab" aria-selected="false" class="tab-link" data-subtab="vt-review" style="color:var(--amber)">🔄 Review</button></div></section>
          
          <!-- ═══ ENGLISH Vocabulary Builder ═══ -->
          <div role="tabpanel" class="subtab-pane active" id="sub-wb-expand">
            <!-- Quick guide banner for Build From tab only -->
            <div class="wb-stats" id="wbExpandStats" style="display:none"></div>
            <!-- ── Box style controls ── -->
            <div class="wbx-toggle-bar" style="display:flex;align-items:center;gap:16px;margin-bottom:14px;flex-wrap:wrap;padding:14px 20px;background:var(--panel-2);border-radius:14px;border:1px solid var(--line)">
              <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-soft);white-space:nowrap"><i class="fa-solid fa-palette"></i> Palette</span>
              <div id="wbxSchemeDots" style="display:flex;gap:6px"></div>
              <span style="width:1px;height:30px;background:var(--line);flex-shrink:0;margin:0 4px"></span>
              <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-soft);white-space:nowrap"><i class="fa-solid fa-tag"></i> Color by</span>
              <div style="display:flex;gap:0">
                <button class="mode-btn active" data-wbx-mode="none" onclick="wbxSetMode('none')" style="border-radius:6px 0 0 6px">None</button>
                <button class="mode-btn" data-wbx-mode="pos" onclick="wbxSetMode('pos')">POS</button>
                <button class="mode-btn" data-wbx-mode="cefr" onclick="wbxSetMode('cefr')" style="border-radius:0 6px 6px 0">CEFR</button>
              </div>
              <span style="width:1px;height:30px;background:var(--line);flex-shrink:0;margin:0 4px"></span>
              <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-soft);white-space:nowrap"><i class="fa-solid fa-folder-plus"></i> Save to</span>
              <select id="wbxSaveTarget" onchange="onSaveTargetChange()" style="padding:6px 10px;border-radius:6px;border:2px solid var(--line);background:var(--card);color:var(--text);font-size:12px;font-weight:600;font-family:var(--font-ui);cursor:pointer;max-width:180px">
                <option value="">Build From Known</option>
              </select>
              <button class="fchip" onclick="createBankFromSelector()" title="Crea nuova banca" style="font-size:13px;padding:6px 10px"><i class="fa-solid fa-plus"></i></button>
              <span style="flex:1"></span>
              <button class="fchip" id="wbxFullscreenBtn" title="Schermo intero" onclick="wbxToggleFullscreen()" style="font-size:14px;padding:8px 12px"><i class="fa-solid fa-expand"></i></button>
            </div>
            <script>
              // ── Synchronous: accent/mode toggles (must exist before IIFE completes) ──
              (function(){
                var schemes = ['2','4','5','6','7'];
                var schemeColors = ['#4338ca','#047857','#6d28d9','#b45309','#be185d'];
                var accentIdx = (function(){ var s = localStorage.getItem('wbx-accent-scheme')||'2'; var i = schemes.indexOf(s); return i >= 0 ? i : 0; })();
                var el = document.getElementById('sub-wb-expand');
                if (el) { el.setAttribute('data-wb-scheme', schemes[accentIdx]); el.setAttribute('data-wb-accent', localStorage.getItem('wbx-accent-mode')||'none'); }

                // ── Render scheme dots ──
                function renderSchemeDots(){
                  var dotsEl = document.getElementById('wbxSchemeDots');
                  if (!dotsEl) return;
                  dotsEl.innerHTML = schemes.map(function(s,i){
                    return '<span class="wbx-scheme-dot'+(i===accentIdx?' active':'')+'" style="background:'+schemeColors[i]+'" onclick="wbxSetScheme('+i+')" title="Palette '+schemes[i]+'"></span>';
                  }).join('');
                }
                renderSchemeDots();

                window.wbxSetScheme = function(idx){
                  accentIdx = idx;
                  var s = schemes[idx];
                  var e = document.getElementById('sub-wb-expand');
                  if (e) e.setAttribute('data-wb-scheme', s);
                  localStorage.setItem('wbx-accent-scheme', s);
                  renderSchemeDots();
                };
                // Keep old function for backward compat with Italian/VT panels
                window.wbxCycleAccent = function(){
                  accentIdx = (accentIdx + 1) % schemes.length;
                  wbxSetScheme(accentIdx);
                };

                window.wbxToggleFullscreen = function(){
                  var mp = document.querySelector('.main-panel');
                  var btn = document.getElementById('wbxFullscreenBtn');
                  if (!mp) return;
                  if (mp.classList.contains('wbx-fullscreen')) {
                    mp.classList.remove('wbx-fullscreen');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                    if (btn) btn.title = 'Schermo intero';
                  } else {
                    mp.classList.add('wbx-fullscreen');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                    if (btn) btn.title = 'Chiudi schermo intero';
                  }
                };
                window.wbxSetMode = function(mode){
                  var e = document.getElementById('sub-wb-expand');
                  if (e) e.setAttribute('data-wb-accent', mode);
                  document.querySelectorAll('#sub-wb-expand .mode-btn').forEach(function(c){ c.classList.remove('active'); });
                  var btn = document.querySelector('#sub-wb-expand .mode-btn[data-wbx-mode="' + mode + '"]');
                  if (btn) btn.classList.add('active');
                  localStorage.setItem('wbx-accent-mode', mode);
                };
                window.autoSizeExpandWords = function(){
                  document.querySelectorAll('#wbExpandResults .wbx-w').forEach(function(wel){
                    wel.style.fontSize = '';
                    var avail = wel.clientWidth;
                    var need = wel.scrollWidth;
                    if (need > avail && avail > 0) {
                      var ratio = avail / need;
                      var cur = parseFloat(getComputedStyle(wel).fontSize);
                      wel.style.fontSize = Math.max(12, (cur * ratio) * 0.95) + 'px';
                    }
                  });
                };

                // ── Show-more pagination (5 at a time, up to 20) ──
                window.wbxShowMore = function(btn){
                  var hidden = document.querySelectorAll('#wbExpandResults .wbx-box.wbx-hidden-initially');
                  var toShow = Math.min(5, hidden.length);
                  for (var i = 0; i < toShow; i++) {
                    hidden[i].classList.remove('wbx-hidden-initially');
                    hidden[i].style.display = '';
                  }
                  // Update or remove button
                  var remaining = document.querySelectorAll('#wbExpandResults .wbx-box.wbx-hidden-initially');
                  if (remaining.length === 0) {
                    btn.parentElement.remove();
                  } else {
                    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Mostra di più (' + remaining.length + ')';
                  }
                  window.autoSizeExpandWords();
                };

                // Wire up toggle bar clicks
                var bar = document.querySelector('#sub-wb-expand .wbx-toggle-bar');
                if (bar) {
                  bar.addEventListener('click', function(e){
                    var chip = e.target.closest('[data-wbx-mode]');
                    if (chip) { window.wbxSetMode(chip.getAttribute('data-wbx-mode')); return; }
                    if (e.target.closest('#wbxAccentBtn')) { window.wbxCycleAccent(); return; }
                  });
                }
                // Restore active mode chip
                var savedMode = localStorage.getItem('wbx-accent-mode') || 'none';
                var mc = document.querySelector('#sub-wb-expand [data-wbx-mode="' + savedMode + '"]');
                if (mc) {
                  document.querySelectorAll('#sub-wb-expand [data-wbx-mode]').forEach(function(c){ c.classList.remove('active'); });
                  mc.classList.add('active');
                }
              })();
            </script>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
              <div style="flex:1;min-width:200px;max-width:360px;position:relative">
                <input class="wb-search-input" id="wbExpandSearch" placeholder="Scrivi una parola che conosci…" oninput="renderExpandSuggestions()" onkeydown="if(event.key==='Enter'){event.preventDefault();renderExpandSuggestions()}" style="width:100%" spellcheck="true" autocorrect="on" autocomplete="off">
                <div id="wbExpandSuggestions" style="position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--line);border-radius:0 0 12px 12px;z-index:10;display:none;max-height:200px;overflow-y:auto;box-shadow:var(--shadow-md)"></div>
              </div>
              <select id="wbExpandRelation" onchange="renderExpandSuggestions()" style="padding:7px 12px;border-radius:100px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font-size:13px;font-family:var(--font-ui);outline:none;cursor:pointer">
                <option value="synonyms">Sinonimi</option>
                <option value="antonyms">Contrari</option>
                <option value="word-family">Famiglia di parole</option>
                <option value="collocations">Collocazioni</option>
                <option value="next-level">Livello superiore ↗</option>
              </select>
              <span style="font-size:11px;color:var(--text-faint)" id="wbExpandLevelInfo"></span>
            </div>
            <!-- POS disambiguation bar (hidden until multi-POS word detected) -->
            <div id="wbExpandDisambig" style="display:none;align-items:center;gap:10px;margin-bottom:14px;padding:10px 18px;background:var(--panel-2);border-radius:12px;border:1px solid var(--line);font-family:var(--font-ui);flex-wrap:wrap">
              <span style="font-size:12px;color:var(--text-soft)" id="wbDisambigContext"></span>
              <span style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap">Intendevi…</span>
              <span id="wbDisambigChips" style="display:flex;gap:6px;flex-wrap:wrap"></span>
            </div>
            <div id="wbExpandResults">
              <div style="text-align:center;padding:40px 20px;color:var(--text-faint)">
                <div style="font-size:48px;margin-bottom:12px;color:var(--text-faint)"><i class="fa-solid fa-brain"></i></div>
                <h3 style="color:var(--text-soft);margin-bottom:6px" data-i18n="vb_empty_title">Costruisci da ciò che sai</h3>
                <p style="font-size:14px;max-width:440px;margin:0 auto;line-height:1.5" data-i18n="vb_empty_desc">Scrivi una parola che conosci e Sottotitoli ti mostrerà sinonimi, contrari, collocazioni e parole correlate al tuo livello. Più sessioni fai, più suggerimenti saranno precisi.</p>
              </div>
            </div>
          </div>
          <!-- ═══ ITALIAN Vocabulary Builder ═══ -->
          <div role="tabpanel" class="subtab-pane" id="sub-wb-expand-it">
            <div class="wb-stats" id="wbItExpandStats" style="display:none"></div>
            <!-- ── Search bar ── -->
            <div class="wbx-toggle-bar" style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;padding:16px 20px;background:var(--panel-2);border-radius:14px;border:1px solid var(--line);min-height:72px">
              <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
                <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft)"><i class="fa-solid fa-palette"></i> Stile</span>
                <span style="font-size:11px;color:var(--text-faint);line-height:1.3">Schema colore delle card</span>
              </div>
              <button class="fchip" id="wbxItAccentBtn" title="Clicca per cambiare schema colore" style="font-size:14px;padding:8px 16px"><i class="fa-solid fa-palette"></i> <span id="wbxItSchemeNum">1</span></button>
              <span style="width:1px;height:36px;background:var(--line);flex-shrink:0;margin:0 6px"></span>
              <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
                <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft)"><i class="fa-solid fa-droplet"></i> Modo</span>
                <span style="font-size:11px;color:var(--text-faint);line-height:1.3">Colora per tipo di parola o livello</span>
              </div>
              <button class="fchip active" data-wbx-it-mode="none" title="Nessuna colorazione speciale" style="font-size:13px;padding:7px 14px">Default</button>
              <button class="fchip" data-wbx-it-mode="pos" title="Colora l'intestazione in base alla parte del discorso" style="font-size:13px;padding:7px 14px">POS Accent</button>
              <button class="fchip" data-wbx-it-mode="cefr" title="Colora l'intestazione in base al livello CEFR" style="font-size:13px;padding:7px 14px">CEFR Accent</button>
              <span style="flex:1"></span>
              <button class="fchip" id="wbxItFullscreenBtn" title="Schermo intero" onclick="wbxToggleFullscreen()" style="font-size:14px;padding:8px 12px"><i class="fa-solid fa-expand"></i></button>
            </div>
            <!-- ── Search bar (full width) ── -->
            <div style="display:flex;gap:10px;margin-bottom:14px">
              <input class="wb-search-input" id="wbItExpandSearch" data-i18n-placeholder="vb_it_search_placeholder" placeholder="Cerca una parola italiana…" style="flex:1;font-size:15px;padding:12px 18px" onkeydown="if(event.key==='Enter')renderItExpandSuggestions()">
              <button class="btn btn-primary btn-sm" onclick="renderItExpandSuggestions()" style="font-family:var(--font-ui);font-size:15px;padding:12px 24px;border-radius:99px;white-space:nowrap"><i class="fa-solid fa-magnifying-glass"></i> Cerca</button>
            </div>
            <!-- ── Results area ── -->
            <div id="wbItExpandResults">
              <div style="text-align:center;padding:40px 20px;color:var(--text-faint)">
                <div style="font-size:48px;margin-bottom:12px;color:var(--text-faint)"><i class="fa-solid fa-language"></i></div>
                <h3 style="color:var(--text-soft);margin-bottom:6px">Vocabolario Italiano</h3>
                <p style="font-size:14px;max-width:440px;margin:0 auto;line-height:1.5">Cerca una parola italiana e Sottotitoli ti mostrerà la definizione, la traduzione in inglese e parole correlate. Più sessioni fai, più suggerimenti saranno precisi.</p>
              </div>
            </div>
          </div>
          <!-- ═══ CEFR Vocabulary Explorer ═══ -->
          <div role="tabpanel" class="subtab-pane" id="sub-wb-explore">
            <div class="wb-stats" id="cefrTopicStats" style="margin-bottom:14px;display:none"></div>
            <div class="wb-search-bar" style="margin-bottom:14px">
              <input class="wb-search-input" id="cefrTopicSearch" placeholder="Cerca un argomento..." oninput="filterCefrTopics()">
            </div>
            <div style="display:flex;gap:8px;margin-bottom:14px">
              <button class="fchip active" onclick="toggleCefrRelevance('all')">All topics</button>
              <button class="fchip" onclick="toggleCefrRelevance('relevant')">Relevant to me</button>
            </div>
            <div id="cefrTopicGrid" style="display:flex;flex-wrap:wrap;gap:8px">
              <span style="font-size:13px;color:var(--text-faint)">Caricamento argomenti...</span>
            </div>
            <div id="cefrTopicWords" style="display:none;margin-top:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <h3 id="cefrTopicTitle" style="margin:0;font-size:18px">—</h3>
                <button class="btn btn-ghost btn-sm" onclick="closeCefrTopic()" style="font-family:var(--font-ui)"><i class="fa-solid fa-arrow-left"></i> Back</button>
              </div>
              <div style="display:flex;gap:6px;margin-bottom:14px">
                <button class="fchip active" onclick="sortCefrWords(this,'frequency')">Per frequenza</button>
                <button class="fchip" onclick="sortCefrWords(this,'level')">Per livello</button>
                <button class="fchip" onclick="sortCefrWords(this,'alpha')">Alfabetico</button>
              </div>
              <div id="cefrTopicGrid2"></div>
            </div>
          </div>
          <!-- ═══ Spaced Repetition Trainer ═══ -->
          <div role="tabpanel" class="subtab-pane" id="sub-vt-review">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
              <div>
                <h3 style="margin:0;font-size:18px;font-weight:700">Review Due</h3>
                <p style="margin:4px 0 0;font-size:12px;color:var(--text-soft)">Spaced-repetition words ready for review. Reviewing confirms them as mastered.</p>
              </div>
              <div style="display:flex;gap:8px" id="vtReviewOrderToggles">
                <button class="fchip active" onclick="vtSetOrder(this,'priority')">Priority</button>
                <button class="fchip" onclick="vtSetOrder(this,'cefr')">CEFR</button>
                <button class="fchip" onclick="vtSetOrder(this,'pos')">POS</button>
              </div>
            </div>
            <div id="vtReviewGrid" style="display:flex;flex-wrap:wrap;gap:8px">
              <span style="font-size:13px;color:var(--text-faint);padding:20px">Caricamento parole da ripassare…</span>
            </div>
          </div>
        </div>
`;
}

export async function init() {
  if (window._vbInitDone) return;
  window._vbInitDone = true;

  // Tab switching
  var tabs = document.getElementById('vbTabs');
  if (tabs) {
    tabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.vb-tab-btn');
      if (!btn) return;
      tabs.querySelectorAll('.vb-tab-btn').forEach(function(b) {
        b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
        b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
        b.style.border = b === btn ? 'none' : '1px solid var(--line)';
      });
      var tab = btn.getAttribute('data-tab');
      var searchInput = document.getElementById('vbSearchInput');
      if (searchInput) searchInput.placeholder = tab === 'it-builder' ? 'Cerca una parola in italiano...' : 'Cerca una parola in inglese...';
    });
  }

  // Search
  var searchBtn = document.getElementById('vbSearchBtn');
  var searchInput = document.getElementById('vbSearchInput');
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
}

export function destroy() { container = null; window._vbInitDone = false; }

async function doSearch() {
  var input = document.getElementById('vbSearchInput');
  var results = document.getElementById('vbResults');
  var word = (input.value || '').trim();
  if (!word) return;
  results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Cercando "' + esc(word) + '"...</p>';
  try {
    var resp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
    if (!resp.ok) { results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Nessuna definizione trovata.</p>'; return; }
    var defs = await resp.json();
    if (!defs.length) { results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Nessuna definizione trovata.</p>'; return; }
    var entry = defs[0];
    var phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '';
    var html = '<div style="margin-bottom:16px"><h3 style="font-size:22px;font-weight:800;color:var(--text);margin:0 0 4px;font-family:Manrope,sans-serif">' + esc(entry.word || word) + '</h3>';
    if (phonetic) html += '<span style="font-size:14px;color:var(--text-soft);font-family:JetBrains Mono,monospace">' + esc(phonetic) + '</span></div>';
    (entry.meanings || []).forEach(function(m) {
      html += '<div style="margin-bottom:20px"><div style="font-size:12px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">' + esc(m.partOfSpeech||'') + '</div>';
      (m.definitions||[]).slice(0,3).forEach(function(d,i) {
        html += '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--text);line-height:1.6"><strong>'+(i+1)+'.</strong> '+esc(d.definition);
        if (d.example) html += '<br><span style="color:var(--text-soft);font-style:italic">"' + esc(d.example) + '"</span>';
        html += '</div>';
      }); html += '</div>';
    });
    html += '<div style="margin-top:16px"><button onclick="window._vbSaveWord(\'' + word.replace(/'/g,"\\'") + '\')" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif">+ Aggiungi a banca</button></div>';
    results.innerHTML = html;
    window._vbSaveWord = async function(w) {
      var sb = window.sottotitoliSupabase;
      if (!sb) return;
      try {
        var userResp = await sb.auth.getUser();
        var userId = userResp.data.user.id;
        var bankResp = await sb.from('user_wordbanks').select('id').eq('user_id',userId).eq('lang','en').limit(1);
        var bankId = bankResp.data && bankResp.data.length ? bankResp.data[0].id : (await sb.from('user_wordbanks').insert({name:'My English Bank',lang:'en',user_id:userId}).select('id').single()).data.id;
        await sb.from('user_wordbank_words').insert({wordbank_id:bankId,word:w,user_id:userId,status:'new',added_at:new Date().toISOString()});
        var t = document.getElementById('toastMsg'); if (t) { t.textContent = '"' + w + '" salvata!'; t.classList.add('show'); setTimeout(function(){t.classList.remove('show')},2500); }
      } catch(e) { console.error('Save word:', e); }
    };
  } catch(e) { results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Errore nella ricerca.</p>'; }
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
