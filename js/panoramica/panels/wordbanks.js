// js/panoramica/panels/wordbanks.js — pnl-wordbanks panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-wordbanks">
          <section class="panel-head"><h2>Word banks</h2></section>
          <section class="panel-tabs"><div class="tabs" role="tablist">
            <button role="tab" aria-selected="true" class="tab-link active" data-subtab="wb-overview-panel">Overview</button>
            <button role="tab" aria-selected="false" class="tab-link" data-subtab="wb-overview">English</button>
            <button role="tab" aria-selected="false" class="tab-link" data-subtab="wb-overview-it">Italiano</button>
          </div></section>
          <div role="tabpanel" class="subtab-pane active" id="sub-wb-overview-panel" style="overflow-y:auto;max-height:calc(100vh - 160px)">
            <style>
              #sub-wb-overview-panel, #sub-wb-overview-panel * { box-sizing:border-box }
              @keyframes wbFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
              #sub-wb-overview-panel .wb-anim { animation:wbFadeUp .6s cubic-bezier(.16,1,.3,1) forwards; opacity:0 }
              #sub-wb-overview-panel .wb-d100 { animation-delay:100ms }
              #sub-wb-overview-panel .wb-d200 { animation-delay:200ms }
              #sub-wb-overview-panel .wb-d300 { animation-delay:300ms }
              #sub-wb-overview-panel .wb-d400 { animation-delay:400ms }

              /* ── Bento Grid System ── */
              #sub-wb-overview-panel .bento-grid {
                display:grid;grid-template-columns:repeat(12,1fr);gap:16px
              }
              @media (max-width:900px) {
                #sub-wb-overview-panel .bento-grid { grid-template-columns:1fr }
                #sub-wb-overview-panel .bento-grid > * { grid-column:1/-1 !important }
              }

              /* ── Section Cards ── */
              #sub-wb-overview-panel .wb-card,
              #sub-wb-overview-panel .wb-glass {
                background:var(--panel);border:1px solid var(--line);border-radius:14px;
                padding:24px;display:flex;flex-direction:column;
                transition:border-color .2s,box-shadow .2s
              }
              #sub-wb-overview-panel .wb-card:hover,
              #sub-wb-overview-panel .wb-glass:hover {
                border-color:var(--cyan);box-shadow:0 4px 20px rgba(6,182,212,.08)
              }

              /* ── Stat Block (compact, for sidebar column) ── */
              #sub-wb-overview-panel .wb-stat-block {
                background:var(--panel);border:1px solid var(--line);border-radius:14px;
                padding:20px;display:flex;flex-direction:column;gap:8px;
                transition:border-color .2s,transform .2s
              }
              #sub-wb-overview-panel .wb-stat-block:hover {
                border-color:var(--cyan);transform:translateY(-2px)
              }
              #sub-wb-overview-panel .wb-stat-label {
                font-size:10px;font-weight:700;font-family:"Manrope",sans-serif;
                color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em
              }
              #sub-wb-overview-panel .wb-stat-value {
                font-size:22px;font-weight:700;color:var(--text);line-height:1.2
              }
              #sub-wb-overview-panel .wb-stat-sub {
                font-size:10px;font-weight:600;color:var(--text-faint);font-family:"Manrope",sans-serif
              }

              /* ── Section Header ── */
              #sub-wb-overview-panel .wb-section-header {
                font-size:11px;font-weight:700;font-family:"Manrope",sans-serif;
                color:var(--cyan);text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px
              }
              #sub-wb-overview-panel .wb-section-title {
                font-size:18px;font-weight:700;color:var(--text);margin:0 0 4px;font-family:"Inter",sans-serif
              }
              #sub-wb-overview-panel .wb-section-desc {
                font-size:12px;color:var(--text-soft);margin:0 0 16px;line-height:1.4
              }

              /* ── Bar Charts (CEFR distribution) ── */
              #sub-wb-overview-panel .wb-bar-row { display:flex;align-items:center;gap:10px }
              #sub-wb-overview-panel .wb-bar-lvl { width:22px;font-size:10px;font-weight:700 }
              #sub-wb-overview-panel .wb-bar-track { flex:1;height:6px;background:var(--bg);border-radius:99px;overflow:hidden }
              #sub-wb-overview-panel .wb-bar-fill { height:100%;border-radius:99px;transition:width 1s cubic-bezier(.16,1,.3,1),transform .2s,box-shadow .2s;transform-origin:left }
              #sub-wb-overview-panel .wb-bar-row:hover .wb-bar-fill { transform:scaleX(1.02);box-shadow:0 0 8px currentColor }
              #sub-wb-overview-panel .wb-bar-val { font-size:11px;font-weight:600;color:var(--text-faint);min-width:28px;text-align:right }

              /* ── Count Chips ── */
              #sub-wb-overview-panel .wb-chip-box {
                background:var(--bg);border:1px solid var(--line);border-radius:12px;
                padding:12px 10px;text-align:center;min-width:64px;flex:1;transition:background .2s
              }
              #sub-wb-overview-panel .wb-chip-box:hover { background:var(--panel-2) }
              #sub-wb-overview-panel .wb-chip-num { font-size:16px;font-weight:700;line-height:1 }
              #sub-wb-overview-panel .wb-chip-lvl { font-size:8px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-top:3px }

              /* ── Footer ── */
              #sub-wb-overview-panel .wb-foot {
                margin-top:20px;padding-top:14px;border-top:1px solid var(--line);
                font-size:11px;color:var(--text-faint)
              }
              #sub-wb-overview-panel .wb-foot-right { text-align:right }
              #sub-wb-overview-panel .wb-foot-center { text-align:center }

              /* ── Pin Cards ── */
              #sub-wb-overview-panel .wb-pin-card {
                padding:16px;display:flex;flex-direction:column;align-items:center;
                text-align:center;cursor:pointer;border-radius:12px;
                background:var(--panel);border:1px solid var(--line);
                transition:border-color .2s,transform .2s
              }
              #sub-wb-overview-panel .wb-pin-card:hover { border-color:var(--cyan);transform:translateY(-2px) }
              #sub-wb-overview-panel .wb-pin-icon {
                width:44px;height:44px;border-radius:50%;
                background:rgba(6,182,212,.08);display:flex;align-items:center;
                justify-content:center;margin-bottom:10px
              }
              #sub-wb-overview-panel .wb-pin-name { font-size:13px;font-weight:600;color:var(--text);line-height:1.2 }
              #sub-wb-overview-panel .wb-pin-sub { font-size:11px;color:var(--text-faint);margin-top:3px }

              /* ── Library Row ── */
              #sub-wb-overview-panel .wb-lib-row {
                display:flex;align-items:center;justify-content:space-between;
                padding:14px 18px;cursor:pointer;transition:background .15s
              }
              #sub-wb-overview-panel .wb-lib-row:hover { background:var(--bg) }
              #sub-wb-overview-panel .wb-lib-divider { border-bottom:1px solid var(--line) }
              #sub-wb-overview-panel .wb-lib-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0 }
              #sub-wb-overview-panel .wb-lib-name { font-size:13px;font-weight:400;color:var(--text) }
              #sub-wb-overview-panel .wb-lib-count { font-size:13px;color:var(--text-faint) }

              /* ── Import CTA ── */
              #sub-wb-overview-panel .wb-cta {
                background:linear-gradient(135deg,rgba(6,182,212,.06),transparent);
                border:1px solid rgba(6,182,212,.18);border-radius:14px;
                padding:24px;display:flex;align-items:center;justify-content:space-between;
                gap:20px;flex-wrap:wrap
              }
              #sub-wb-overview-panel .wb-cta h4 { font-size:15px;font-weight:700;color:var(--text);margin:0 0 4px;font-family:"Inter",sans-serif }
              #sub-wb-overview-panel .wb-cta p { font-size:12px;color:var(--text-soft);max-width:400px;line-height:1.4;margin:0 }
              #sub-wb-overview-panel .wb-btn {
                background:var(--cyan);color:#fff;border:none;border-radius:99px;
                padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;
                white-space:nowrap;font-family:"Inter",sans-serif;
                transition:filter .15s,transform .15s
              }
              #sub-wb-overview-panel .wb-btn:hover { filter:brightness(1.1);transform:scale(1.03) }

              /* ── Empty State ── */
              #sub-wb-overview-panel .wb-empty {
                border:1px dashed var(--line);border-radius:12px;background:var(--bg);
                padding:28px 20px;display:flex;flex-direction:column;align-items:center;
                justify-content:center;flex:1;min-height:100px
              }
              #sub-wb-overview-panel .wb-empty-icon { font-size:28px;color:var(--text-faint);margin-bottom:6px }
              #sub-wb-overview-panel .wb-empty-text { font-size:11px;color:var(--text-faint);max-width:200px;text-align:center;line-height:1.4;margin:0 }

              /* ── More Button ── */
              #sub-wb-overview-panel .wb-more {
                display:flex;align-items:center;justify-content:center;padding:12px;
                cursor:pointer;font-size:11px;font-weight:700;color:var(--cyan);
                text-transform:uppercase;letter-spacing:.05em;transition:background .15s
              }
              #sub-wb-overview-panel .wb-more:hover { background:var(--bg) }

              /* ── Quick Tip Card ── */
              #sub-wb-overview-panel .wb-tip-card {
                background:var(--panel);border:1px solid var(--line);border-radius:14px;
                padding:20px;display:flex;flex-direction:column;gap:12px;
                height:100%
              }
              #sub-wb-overview-panel .wb-tip-icon {
                width:36px;height:36px;border-radius:50%;background:rgba(6,182,212,.1);
                display:flex;align-items:center;justify-content:center;color:var(--cyan)
              }
            </style>
            <!-- ═══ Bento Grid Layout ═══ -->
            <div class="bento-grid">
              <!-- Row 1: CEFR Distribution (8 cols) + Known Stats (4 cols) -->
              <div class="wb-card wb-anim wb-d100" style="grid-column:span 8">
                <span class="wb-section-header" data-i18n="wb_cefr_analysis">CEFR Analysis</span>
                <h3 class="wb-section-title">Distribuzione &amp; Conteggio</h3>
                <p class="wb-section-desc">tutte le parole</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex:1;align-items:start">
                  <div>
                    <div style="font-size:10px;font-weight:700;font-family:&quot;Manrope&quot;,sans-serif;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Distribuzione</div>
                    <div id="wbCefrDistAll" style="display:flex;flex-direction:column;gap:12px">…</div>
                  </div>
                  <div>
                    <div style="font-size:10px;font-weight:700;font-family:&quot;Manrope&quot;,sans-serif;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Conteggio</div>
                    <div id="wbCefrCountAll" style="display:flex;flex-wrap:wrap;gap:6px">…</div>
                  </div>
                </div>
                <div class="wb-foot wb-foot-right" id="wbCefrDistAllTotal"></div>
                <div class="wb-foot wb-foot-right" style="display:none" id="wbCefrCountAllTotal"></div>
              </div>
              <div style="grid-column:span 4;display:flex;flex-direction:column;gap:16px">
                <div class="wb-stat-block wb-anim wb-d200">
                  <span class="wb-stat-label">Parole Confermate</span>
                  <div class="wb-stat-value" id="wbCefrCountKnownTotal" style="font-size:20px">Trainer inattivo</div>
                  <div style="margin-top:4px">
                    <div id="wbCefrCountKnown" style="display:flex;flex-wrap:wrap;gap:5px">…</div>
                  </div>
                </div>
                <div class="wb-stat-block wb-anim wb-d200" style="flex:1">
                  <span class="wb-stat-label">Distribuzione Confermate</span>
                  <div id="wbCefrDistKnown" style="flex:1;min-height:40px">…</div>
                </div>
              </div>

              <!-- Row 2: Favorite Collections (8 cols) + Quick Tip (4 cols) -->
              <div class="wb-card wb-anim wb-d300" style="grid-column:span 8">
                <span class="wb-section-header">Accesso Rapido</span>
                <h3 class="wb-section-title" data-i18n="wb_favorites_title">Favorite Collections</h3>
                <p class="wb-section-desc" data-i18n="wb_favorites_desc">Le tue collezioni preferite per un accesso rapido. Clicca la ★ su qualsiasi banca parole per aggiungerla qui.</p>
                <div id="wbPinnedGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
                  <div class="wb-pin-card"><div class="wb-pin-icon"><span class="material-symbols-outlined">movie</span></div><div class="wb-pin-name">…</div><div class="wb-pin-sub">…</div></div>
                </div>
                <div class="wb-cta">
                  <div>
                    <h4 data-i18n="wb_expand_vocab">Ready to expand your vocabulary?</h4>
                    <p>Import text files, PDFs, or documents to automatically extract and categorize new vocabulary by CEFR level.</p>
                  </div>
                  <button class="wb-btn" onclick="wbShowImport()" data-i18n="wb_import_file">Import File</button>
                </div>
              </div>
              <div class="wb-tip-card wb-anim wb-d300" style="grid-column:span 4">
                <div class="wb-tip-icon"><span class="material-symbols-outlined" style="font-size:18px">lightbulb</span></div>
                <div style="font-size:12px;font-weight:700;color:var(--text);font-family:&quot;Inter&quot;,sans-serif" data-i18n="wb_quick_tip">Quick Tip</div>
                <p style="font-size:11px;color:var(--text-soft);line-height:1.5;margin:0" data-i18n="wb_quick_tip_text">Usa il Trainer per consolidare le parole. Ogni sessione di pratica rafforza la tua padronanza del vocabolario e aggiorna i livelli CEFR.</p>
              </div>

              <!-- Row 3: Full Library (12 cols) -->
              <div class="wb-card wb-anim wb-d400" style="grid-column:span 12;padding:0;overflow:hidden">
                <div style="padding:20px 24px 0">
                  <span class="wb-section-header">Libreria Completa</span>
                  <h3 class="wb-section-title" data-i18n="wb_full_library_title">Full Library</h3>
                  <p class="wb-section-desc">Tutte le tue banche parole in un unico posto. Sfoglia, cerca e organizza il tuo vocabolario.</p>
                </div>
                <div id="wbFullLibrary" style="padding:0">
                  <div class="wb-lib-row wb-lib-divider">
                    <div style="display:flex;align-items:center;gap:16px"><span class="wb-lib-dot" style="background:#059669"></span><span class="wb-lib-name">Caricamento…</span></div>
                    <span class="wb-lib-count">…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div role="tabpanel" class="subtab-pane" id="sub-wb-overview" data-wb-lang="en">
            <div id="wbEnContent" style="display:none"></div>
            <div id="wordbanksOverview"></div>
            <div id="wbInsideView" style="display:none"></div>
            <script>
              (function(){
                var lang = 'en';
                function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
                function loadAll(){
                  if(!window.SottotitoliData||!window.SottotitoliData.getWordbanks){setTimeout(loadAll,300);return;}
                  window.SottotitoliData.getWordbanks(lang).then(function(banks){
                    banks=banks||[];
                    // Show all real user banks (no type classification — table has no 'type' column)
                    var allUserBanks = banks;
                    // Preset banks that show when user has no real banks
                    var presets = {
                      pinned: [
                        {id:'preset-ripasso',name:'Ripasso immediato',desc:'Daily spaced-repetition for high-priority items',icon:'history',words:0,newWords:0,due:0},
                        {id:'preset-saved',name:'Saved From Sessions',desc:'Automatically extracted from your video interactions',icon:'movie',words:0,newWords:0,due:0},
                        {id:'preset-evb',name:'English Vocabulary Builder',desc:'Saved from Vocabulary Builder English',icon:'book',words:0,newWords:0,due:0},
                        {id:'preset-fragile',name:'Fragile Words',desc:'Words that need reinforcement',icon:'warning',words:0,newWords:0,due:0}
                      ],
                      discovery: [
                        {id:'preset-next',name:'Next Step',desc:'Strategic additions for your level',icon:'moving',type:'SMART',words:0},
                        {id:'preset-build',name:'Build From What You Know',desc:'Expanding related vocabulary clusters',icon:'psychology',type:'SMART',words:0},
                        {id:'preset-activate',name:'Activate What You Recognize',desc:'Claim your passive vocab',icon:'visibility',type:'BETA',words:0},
                        {id:'preset-goal',name:'Goal-Based Upcoming Vocab',desc:'What you said you need next',icon:'flag',type:'BETA',words:0},
                        {id:'preset-themes',name:'Session-Detected Themes',desc:'From your practice patterns',icon:'analytics',type:'BETA',words:0},
                        {id:'preset-roadmap',name:'Your Learning Roadmap',desc:'Stage-by-stage vocab plan',icon:'map',type:'BETA',words:0}
                      ]
                    };
                    // Merge: real user banks first, then presets only if no real banks exist
                    // Pinned section: ALWAYS use presets only (never user banks)
                    var allPinned = presets.pinned;
                    // Discovery: always show presets (no real discovery type in DB)
                    var allDiscovery = presets.discovery;

                    // Stats bar — fetch real stats
                    var statsHtml='';
                    if(window.SottotitoliData&&window.SottotitoliData.getWordbankStats){
                      window.SottotitoliData.getWordbankStats(lang).then(function(stats){
                        var statsEl=document.getElementById('wbEnStatsBar');
                        if(statsEl){
                          statsEl.innerHTML='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.totalWords||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In scadenza oggi</span><div style="font-size:22px;font-weight:700;color:'+(stats.dueToday>0?'#E11D48':'var(--text)')+';margin-top:2px">'+(stats.dueToday||0)+'</div>'+(stats.dueToday===0?'<div style="font-size:10px;font-weight:600;color:#10B981;font-family:\\'Manrope\\',sans-serif;margin-top:2px">Tutto in ordine</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Nuove questa settimana</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.newThisWeek||0)+'</div>'+(stats.newThisWeek>0?'<div style="font-size:10px;font-weight:600;color:var(--cyan);font-family:\\'Manrope\\',sans-serif;margin-top:2px">+'+(stats.newThisWeek||0)+' questa settimana</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Known</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.known||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Learning</span><div style="font-size:22px;font-weight:700;color:var(--cyan);margin-top:2px">'+(stats.learning||0)+'</div></div>'+
                          '</div>';
                        }
                      }).catch(function(){});
                    }
                    // Add stats bar placeholder (filled async above)
                    statsHtml='<div id="wbEnStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>';
                    // Pinned
                    statsHtml+='<div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:24px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined" style="color:var(--cyan)">push_pin</span><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Pinned Collections</h3><span style="background:rgba(6,182,212,.1);color:var(--cyan);font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;padding:2px 8px;border-radius:99px;text-transform:uppercase">Always Synced</span></div></div>';
                    allPinned.forEach(function(b){
                      var due=b.due||b.due_count||0;
                      var newWords=b.newWords||b.new_words||0;
                      var total=b.words||b.word_count||0;
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:16px;cursor:pointer;margin-bottom:4px" onmouseover="this.style.borderColor=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\'" onclick="wbOpenBank(\\''+b.id+'\\')">'+
                        '<span class="material-symbols-outlined" style="color:var(--cyan);font-size:18px">'+(b.icon||'history')+'</span>'+
                        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">'+esc(b.name||'Bank')+'</div><div style="font-size:12px;color:var(--text-soft)">'+esc(b.desc||b.description||'')+'</div></div>'+
                        '<div style="display:flex;align-items:center;gap:24px;flex-shrink:0">'+
                          '<div style="text-align:center"><span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase">Words</span><div style="font-size:13px;font-weight:700;color:var(--text)">'+total+'</div></div>'+
                          '<div style="text-align:center"><span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase">New Words</span><div style="font-size:13px;font-weight:700;color:#10B981">'+newWords+'</div></div>'+
                          '<div style="text-align:right;min-width:80px">'+
                            (due>0?'<span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:#E11D48;text-transform:uppercase">'+due+' TO DO</span><div style="width:64px;height:4px;background:var(--bg);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;background:#E11D48;width:'+Math.min(100,Math.round(due/total*100))+'%"></div></div>':'<span style="font-size:10px;font-weight:600;color:var(--text-soft);font-family:\\'Manrope\\',sans-serif">UP TO DATE</span>')+
                          '</div>'+
                        '</div>'+
                        '<span class="material-symbols-outlined" onclick="event.stopPropagation();toggleFavBank(\\''+b.id+'\\',this)" style="font-size:16px;cursor:pointer;color:var(--text-faint);margin-right:4px" title="Add to favorites">star</span>'+'<button style="padding:6px 14px;background:rgba(6,182,212,.1);color:var(--cyan);border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;cursor:pointer;white-space:nowrap">Open</button>'+
                      '</div>';
                    });
                    statsHtml+='</div>';
                    // Discovery
                    statsHtml+='<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Discovery</h3><span style="font-size:9px;font-weight:700;color:var(--text-soft);font-family:\\'Manrope\\',sans-serif;text-transform:uppercase">AI Powered</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
                    allDiscovery.forEach(function(b){
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;cursor:pointer" onmouseover="this.style.borderColor=\\'var(--cyan)\\';this.style.transform=\\'translateY(-2px)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\';this.style.transform=\\'\\'" onclick="wbOpenBank(\\''+b.id+'\\')">'+
                        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><span class="material-symbols-outlined" style="color:var(--cyan);font-size:24px">'+(b.icon||'auto_awesome')+'</span><span style="font-size:9px;font-weight:700;background:var(--cyan);color:#fff;padding:2px 6px;border-radius:4px;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase">'+(b.type||'SMART')+'</span></div>'+
                        '<div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Bank')+'</div><div style="font-size:12px;color:var(--text-soft);margin-bottom:12px">'+esc(b.desc||b.description||'')+'</div>'+
                        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px"><span style="font-size:10px;font-weight:600;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft)">'+(b.words||b.word_count||0)+' parole</span><span style="font-size:11px;font-weight:700;color:var(--cyan);font-family:\\'Manrope\\',sans-serif">Open</span></div></div>';
                    });
                    statsHtml+='</div></div><div style="background:rgba(6,182,212,.06);border:1px solid rgba(6,182,212,.18);border-radius:12px;padding:20px"><div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:6px"><h3 style="font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--cyan);margin:0">Import Your Own</h3><span class="material-symbols-outlined" style="font-size:15px;color:var(--cyan);cursor:help" title="Import words from text files, PDFs, or documents. Uploaded files appear here as word banks you can browse and study.">info</span></div></div>';
                    // Show recently imported files (tracked in localStorage)
                    var recentImports = [];
                    try { recentImports = JSON.parse(localStorage.getItem('sottotitoli-recent-imports') || '[]'); } catch(e) {}
                    if (recentImports.length) {
                      recentImports.slice(0, 5).forEach(function(ri){
                        statsHtml+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:6px;margin-bottom:4px" onmouseover="this.style.background=\\'var(--bg)\\'" onmouseout="this.style.background=\\'\\'" onclick="wbOpenBank(\\''+ri.id+'\\')"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-soft)">upload_file</span><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text)">'+esc(ri.name||'Bank')+'</div><div style="font-size:10px;color:var(--text-soft)">'+esc(ri.date||'')+'</div></div><span style="font-size:10px;font-weight:700;color:var(--cyan);font-family:\\'Manrope\\',sans-serif;white-space:nowrap">'+(ri.word_count||0)+' w</span></div>';
                      });
                    } else {
                      statsHtml+='<p style="text-align:center;color:var(--text-faint);padding:16px;font-size:12px">No imports yet. Upload a file to get started.</p>';
                    }
                    statsHtml+='<div style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><button onclick="wbShowImport()" style="width:100%;padding:10px;background:var(--cyan);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><span class="material-symbols-outlined" style="font-size:16px">upload_file</span> Import File</button></div></div></div>';
                    // Full library
                    statsHtml+='<div><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0 0 16px">Full Library</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
                    banks.slice(0,8).forEach(function(b){
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;cursor:pointer" onmouseover="this.style.borderColor=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\'" onclick="wbOpenBank(\\''+b.id+'\\')"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><span style="font-size:10px;font-weight:700;background:rgba(6,182,212,.1);color:var(--cyan);padding:2px 6px;border-radius:4px;font-family:\\'Manrope\\',sans-serif">'+(b.cefr_level||'—')+'</span></div><div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Bank')+'</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-soft)"><span>'+(b.word_count||0)+' parole</span><span style="font-weight:600;color:var(--cyan)">Open</span></div></div>';
                    });
                    statsHtml+='</div></div>';
                    document.getElementById('wordbanksOverview').innerHTML=statsHtml;
                    document.getElementById('wbEnContent').style.display='none';
                  }).catch(function(){document.getElementById('wordbanksOverview').innerHTML='<p style="text-align:center;color:var(--text-faint);padding:40px">Unable to load word banks.</p>';document.getElementById('wbEnContent').style.display='none';});
                }
                loadAll();
                window.wbNewBank=function(){ if(window.newWordbank) window.newWordbank(); else { var n=prompt('Bank name:'); if(n) alert('Create: '+n); } setTimeout(function(){ loadAll(); }, 800); };
                window.wbOpenBank=function(id){
                  var presetMap={'preset-ripasso':'review_due_now','preset-saved':'saved_from_sessions','preset-evb':'vocab_builder_en','preset-fragile':'fragile_words','preset-next':'goal_next_step','preset-build':'build_from_known','preset-activate':'activate_recognized','preset-goal':'upcoming_useful_vocab','preset-themes':'upcoming_session_driven','preset-roadmap':'upcoming_roadmap'};
                  if(presetMap[id]) id=presetMap[id];
                  if(window.openWordbankView){ window.openWordbankView(id); return; }
                  // openWordbankView may not be defined yet — poll for it
                  var tries=0;
                  var poll=setInterval(function(){
                    tries++;
                    if(window.openWordbankView){ clearInterval(poll); window.openWordbankView(id); }
                    else if(tries>30){ clearInterval(poll); alert('Open bank: '+id); }
                  },100);
                };
                window.toggleFavBank=function(bankId, starEl){
                  var favs = [];
                  try { favs = JSON.parse(localStorage.getItem('sottotitoli-fav-banks') || '[]'); } catch(e) {}
                  var idx = favs.indexOf(bankId);
                  if (idx >= 0) { favs.splice(idx, 1); if (starEl) { starEl.style.color = 'var(--text-faint)'; starEl.style.fontVariationSettings = "'FILL' 0"; } }
                  else { favs.push(bankId); if (starEl) { starEl.style.color = '#d97706'; starEl.style.fontVariationSettings = "'FILL' 1"; } }
                  localStorage.setItem('sottotitoli-fav-banks', JSON.stringify(favs));
                  // Refresh overview if visible
                  if (typeof renderWbOverviewSections === 'function') setTimeout(renderWbOverviewSections, 200);
                };
                window.wbShowImport=function(){ document.getElementById('wbImportPopup').style.display='flex'; };
                window.wbCloseImport=function(){ document.getElementById('wbImportPopup').style.display='none'; };
                window.wbShowCreate=function(){ document.getElementById('wbCreatePopup').style.display='flex'; };
                window.wbCloseCreate=function(){ document.getElementById('wbCreatePopup').style.display='none'; };
                window.wbDoCreate=function(){
                  var name=(document.getElementById('wbCreateName').value||'').trim();
                  var tag=(document.getElementById('wbCreateTag').value||'').trim();
                  if(!name){alert('Enter a bank name.');return;}
                  // Detect which language tab is active
                  var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
                  var lang = itTab ? 'it' : 'en';
                  if(window.SottotitoliData&&window.SottotitoliData.addWordbank){
                    window.SottotitoliData.addWordbank(name,lang).then(function(bank){
                      if(bank){ alert('Banca "'+name+'" creata!'); }
                      wbCloseCreate();
                      // Refresh the appropriate overview
                      if(lang==='it' && typeof renderWordbanksIt === 'function') renderWordbanksIt();
                      else if(typeof renderWordbanks === 'function') renderWordbanks();
                    }).catch(function(){ alert('Errore creando la banca.'); wbCloseCreate(); });
                  } else {
                    if(window.newWordbank){ window.newWordbank(); wbCloseCreate(); }
                    else { alert('Creato: '+name); wbCloseCreate(); }
                  }
                };
                function processWords(text,name){
                  var words=text.split(/[\\\\s,;:|!?.\\\\-\\\\[\\\\]\\\\(\\\\)\\\\{\\\\}"'<>\\\\n\\\\r\\\\t]+/).filter(function(w){return w.length>1&&!/^\\\\d+$/.test(w);});
                  if(!words.length){alert('No words found in file.');return;}
                  // Detect which language tab is active
                  var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
                  var lang = itTab ? 'it' : 'en';
                  var storageKey = lang === 'it' ? 'sottotitoli-recent-imports-it' : 'sottotitoli-recent-imports';
                  var recent=[];
                  try{recent=JSON.parse(localStorage.getItem(storageKey)||'[]');}catch(e){}
                  var today=new Date().toISOString().substring(0,10);
                  if(window.SottotitoliData&&window.SottotitoliData.addWordbank){
                    window.SottotitoliData.addWordbank(name,lang).then(function(bank){
                      if(bank&&bank.id&&window.SottotitoliData.bulkAddToBank){
                        window.SottotitoliData.bulkAddToBank(bank.id,words).then(function(){
                          recent.unshift({id:bank.id,name:name,date:today,word_count:words.length});
                          if(recent.length>20)recent=recent.slice(0,20);
                          localStorage.setItem(storageKey,JSON.stringify(recent));
                          alert('Banca "'+name+'" creata con '+words.length+' parole.');
                          wbCloseImport();
                          // Refresh the appropriate overview
                          if(lang==='it' && typeof renderWordbanksIt === 'function') setTimeout(renderWordbanksIt, 300);
                          else if(typeof loadAll === 'function') setTimeout(loadAll, 300);
                        }).catch(function(){alert('Errore aggiungendo parole alla banca.');});
                      }else{
                        recent.unshift({id:bank.id,name:name,date:today,word_count:words.length});
                        if(recent.length>20)recent=recent.slice(0,20);
                        localStorage.setItem(storageKey,JSON.stringify(recent));
                        alert('Banca "'+name+'" creata con '+words.length+' parole.');
                        wbCloseImport();
                        if(lang==='it' && typeof renderWordbanksIt === 'function') setTimeout(renderWordbanksIt, 300);
                        else if(typeof loadAll === 'function') setTimeout(loadAll, 300);
                      }
                    }).catch(function(){alert('Errore creando la banca.');});
                  }else{
                    recent.unshift({id:'local-'+Date.now(),name:name,date:today,word_count:words.length});
                    if(recent.length>20)recent=recent.slice(0,20);
                    localStorage.setItem(storageKey,JSON.stringify(recent));
                    alert('Offline: creata '+name+' ('+words.length+' parole)');wbCloseImport();
                  }
                }
                window.wbDoImport=function(){
                  var file=document.getElementById('wbImportFile').files[0];
                  var name=(document.getElementById('wbImportName').value||'').trim();
                  if(!file){alert('Select a file first.');return;}
                  if(!name){alert('Enter a bank name.');return;}
                  var ext=(file.name||'').split('.').pop().toLowerCase();
                  if(ext==='pdf'){
                    if(typeof pdfjsLib==='undefined'){alert('PDF parser not loaded. Try refreshing.');return;}
                    var reader=new FileReader();
                    reader.onload=function(e){
                      pdfjsLib.getDocument({data:e.target.result}).promise.then(function(pdf){
                        var pages=[],loaded=0;
                        for(var i=1;i<=pdf.numPages;i++){
                          pdf.getPage(i).then(function(page){
                            return page.getTextContent();
                          }).then(function(tc){
                            var txt=tc.items.map(function(it){return it.str;}).join(' ');
                            pages.push(txt);loaded++;
                            if(loaded===pdf.numPages) processWords(pages.join(' '),name);
                          });
                        }
                      }).catch(function(){alert('Failed to parse PDF.');});
                    };
                    reader.readAsArrayBuffer(file);
                  }else if(ext==='docx'){
                    if(typeof mammoth==='undefined'){alert('DOCX parser not loaded. Try refreshing.');return;}
                    var reader=new FileReader();
                    reader.onload=function(e){
                      mammoth.extractRawText({arrayBuffer:e.target.result}).then(function(result){
                        processWords(result.value,name);
                      }).catch(function(){alert('Failed to parse DOCX.');});
                    };
                    reader.readAsArrayBuffer(file);
                  }else{
                    var reader=new FileReader();
                    reader.onload=function(e){processWords(e.target.result,name);};
                    reader.readAsText(file);
                  }
                };
              })();
            </script>
          </div>
          <div role="tabpanel" class="subtab-pane" id="sub-wb-overview-it" data-wb-lang="it">
            <div id="wbItContent" style="display:none"></div>
            <div id="wordbanksItOverview"></div>
            <div id="wbItInsideView" style="display:none"></div>
            <script>
              (function(){
                var lang = 'it';
                function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
                function loadAllIt(){
                  if(!window.SottotitoliData||!window.SottotitoliData.getWordbanks){setTimeout(loadAllIt,300);return;}
                  window.SottotitoliData.getWordbanks(lang).then(function(banks){
                    banks=banks||[];
                    var allUserBanks = banks;
                    // Italian preset banks
                    var presets = {
                      pinned: [
                        {id:'it_review_due',name:'Ripasso immediato',desc:'Parole italiane da ripassare ogni giorno',icon:'history',words:0,newWords:0,due:0},
                        {id:'it_saved_sessions',name:'Salvate da sessioni',desc:'Parole italiane salvate durante le sessioni live',icon:'mic',words:0,newWords:0,due:0},
                        {id:'it_vocab_builder',name:'Italian Vocabulary Builder',desc:'Parole italiane salvate dal Vocabulary Builder',icon:'book',words:(function(){ try { var b=JSON.parse(localStorage.getItem('sottotitoli_wb_it_pinned')||'{"words":[]}'); return (b.words||[]).length; } catch(e){ return 0; } })(),newWords:0,due:0},
                        {id:'it_fragile',name:'Parole Fragili',desc:'Parole italiane che necessitano rinforzo',icon:'warning',words:0,newWords:0,due:0}
                      ],
                      discovery: [
                        {id:'it_next_step',name:'Prossimo passo',desc:'Vocabolario italiano per i tuoi obiettivi',icon:'moving',type:'BETA',words:0},
                        {id:'it_build_known',name:'Costruisci da ciò che sai',desc:'Progressione lessicale italiana',icon:'psychology',type:'BETA',words:0},
                        {id:'it_activate',name:'Attiva ciò che riconosci',desc:'Da passivo ad attivo',icon:'visibility',type:'BETA',words:0}
                      ]
                    };
                    var allPinned = presets.pinned;
                    var allDiscovery = presets.discovery;

                    // Stats bar — fetch real stats
                    var statsHtml='';
                    if(window.SottotitoliData&&window.SottotitoliData.getWordbankStats){
                      window.SottotitoliData.getWordbankStats(lang).then(function(stats){
                        var statsEl=document.getElementById('wbItStatsBar');
                        if(statsEl){
                          statsEl.innerHTML='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.totalWords||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In scadenza oggi</span><div style="font-size:22px;font-weight:700;color:'+(stats.dueToday>0?'#E11D48':'var(--text)')+';margin-top:2px">'+(stats.dueToday||0)+'</div>'+(stats.dueToday===0?'<div style="font-size:10px;font-weight:600;color:#10B981;font-family:\\'Manrope\\',sans-serif;margin-top:2px">Tutto in ordine</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Nuove questa settimana</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.newThisWeek||0)+'</div>'+(stats.newThisWeek>0?'<div style="font-size:10px;font-weight:600;color:var(--cyan);font-family:\\'Manrope\\',sans-serif;margin-top:2px">+'+(stats.newThisWeek||0)+' questa settimana</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Conosciute</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.known||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In apprendimento</span><div style="font-size:22px;font-weight:700;color:var(--cyan);margin-top:2px">'+(stats.learning||0)+'</div></div>'+
                          '</div>';
                        }
                      }).catch(function(){});
                    }
                    statsHtml='<div id="wbItStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>';

                    // Pinned
                    statsHtml+='<div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:24px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined" style="color:var(--accent-green)">push_pin</span><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Collezioni Fissate</h3><span style="background:rgba(16,185,129,.1);color:var(--accent-green);font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;padding:2px 8px;border-radius:99px;text-transform:uppercase">Sempre Sincronizzate</span></div></div>';
                    allPinned.forEach(function(b){
                      var due=b.due||b.due_count||0;
                      var newWords=b.newWords||b.new_words||0;
                      var total=b.words||b.word_count||0;
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:16px;cursor:pointer;margin-bottom:4px" onmouseover="this.style.borderColor=\\'var(--accent-green)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\'" onclick="wbOpenBankIt(\\''+b.id+'\\')">'+
                        '<span class="material-symbols-outlined" style="color:var(--accent-green);font-size:18px">'+(b.icon||'history')+'</span>'+
                        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">'+esc(b.name||'Banca')+'</div><div style="font-size:12px;color:var(--text-soft)">'+esc(b.desc||b.description||'')+'</div></div>'+
                        '<div style="display:flex;align-items:center;gap:24px;flex-shrink:0">'+
                          '<div style="text-align:center"><span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase">Parole</span><div style="font-size:13px;font-weight:700;color:var(--text)">'+total+'</div></div>'+
                          '<div style="text-align:center"><span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft);text-transform:uppercase">Nuove</span><div style="font-size:13px;font-weight:700;color:#10B981">'+newWords+'</div></div>'+
                          '<div style="text-align:right;min-width:80px">'+
                            (due>0?'<span style="font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;color:#E11D48;text-transform:uppercase">'+due+' DA FARE</span><div style="width:64px;height:4px;background:var(--bg);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;background:#E11D48;width:'+Math.min(100,Math.round(due/total*100))+'%"></div></div>':'<span style="font-size:10px;font-weight:600;color:var(--text-soft);font-family:\\'Manrope\\',sans-serif">IN ORDINE</span>')+
                          '</div>'+
                        '</div>'+
                        '<span class="material-symbols-outlined" onclick="event.stopPropagation();toggleFavBankIt(\\''+b.id+'\\',this)" style="font-size:16px;cursor:pointer;color:var(--text-faint);margin-right:4px" title="Aggiungi ai preferiti">star</span>'+'<button style="padding:6px 14px;background:rgba(16,185,129,.1);color:var(--accent-green);border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;cursor:pointer;white-space:nowrap">Apri</button>'+
                      '</div>';
                    });
                    statsHtml+='</div>';

                    // Discovery
                    statsHtml+='<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Scoperta</h3><span style="font-size:9px;font-weight:700;color:var(--text-soft);font-family:\\'Manrope\\',sans-serif;text-transform:uppercase">AI Powered</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
                    allDiscovery.forEach(function(b){
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;cursor:pointer" onmouseover="this.style.borderColor=\\'var(--accent-green)\\';this.style.transform=\\'translateY(-2px)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\';this.style.transform=\\'\\'" onclick="wbOpenBankIt(\\''+b.id+'\\')">'+
                        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><span class="material-symbols-outlined" style="color:var(--accent-green);font-size:24px">'+(b.icon||'auto_awesome')+'</span><span style="font-size:9px;font-weight:700;background:var(--accent-green);color:#fff;padding:2px 6px;border-radius:4px;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase">'+(b.type||'BETA')+'</span></div>'+
                        '<div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Banca')+'</div><div style="font-size:12px;color:var(--text-soft);margin-bottom:12px">'+esc(b.desc||b.description||'')+'</div>'+
                        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px"><span style="font-size:10px;font-weight:600;font-family:\\'Manrope\\',sans-serif;color:var(--text-soft)">'+(b.words||b.word_count||0)+' parole</span><span style="font-size:11px;font-weight:700;color:var(--accent-green);font-family:\\'Manrope\\',sans-serif">Apri</span></div></div>';
                    });
                    statsHtml+='</div></div><div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:12px;padding:20px"><div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:6px"><h3 style="font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-green);margin:0">Importa le tue</h3><span class="material-symbols-outlined" style="font-size:15px;color:var(--accent-green);cursor:help" title="Importa parole da file di testo, PDF o documenti. I file caricati appariranno qui come banche parole che puoi sfogliare e studiare.">info</span></div></div>';
                    var recentImports = [];
                    try { recentImports = JSON.parse(localStorage.getItem('sottotitoli-recent-imports-it') || '[]'); } catch(e) {}
                    if (recentImports.length) {
                      recentImports.slice(0, 5).forEach(function(ri){
                        statsHtml+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:6px;margin-bottom:4px" onmouseover="this.style.background=\\'var(--bg)\\'" onmouseout="this.style.background=\\'\\'" onclick="wbOpenBankIt(\\''+ri.id+'\\')"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-soft)">upload_file</span><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text)">'+esc(ri.name||'Banca')+'</div><div style="font-size:10px;color:var(--text-soft)">'+esc(ri.date||'')+'</div></div><span style="font-size:10px;font-weight:700;color:var(--accent-green);font-family:\\'Manrope\\',sans-serif;white-space:nowrap">'+(ri.word_count||0)+' p</span></div>';
                      });
                    } else {
                      statsHtml+='<p style="text-align:center;color:var(--text-faint);padding:16px;font-size:12px">Nessuna importazione. Carica un file per iniziare.</p>';
                    }
                    statsHtml+='<div style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><button onclick="wbShowImport()" style="width:100%;padding:10px;background:var(--accent-green);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\\'Manrope\\',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><span class="material-symbols-outlined" style="font-size:16px">upload_file</span> Importa File</button></div></div></div>';

                    // Full library
                    statsHtml+='<div><h3 style="font-size:13px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0 0 16px">Libreria Completa</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
                    banks.slice(0,8).forEach(function(b){
                      statsHtml+='<div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;cursor:pointer" onmouseover="this.style.borderColor=\\'var(--accent-green)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\'" onclick="wbOpenBankIt(\\''+b.id+'\\')"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><span style="font-size:10px;font-weight:700;background:rgba(16,185,129,.1);color:var(--accent-green);padding:2px 6px;border-radius:4px;font-family:\\'Manrope\\',sans-serif">'+(b.cefr_level||'—')+'</span></div><div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Banca')+'</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-soft)"><span>'+(b.word_count||0)+' parole</span><span style="font-weight:600;color:var(--accent-green)">Apri</span></div></div>';
                    });
                    statsHtml+='</div>'+
                      '<div class="wb-card" style="border:2px dashed var(--line);background:transparent;display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;margin-top:12px" onclick="newWordbank()"><div style="text-align:center;color:var(--text-faint);font-size:11px;font-weight:600"><i class="fa-solid fa-plus" style="margin-right:4px;font-size:10px"></i> Crea nuova banca</div></div>'+
                    '</div>';
                    document.getElementById('wordbanksItOverview').innerHTML=statsHtml;
                    document.getElementById('wbItContent').style.display='none';
                  }).catch(function(){document.getElementById('wordbanksItOverview').innerHTML='<p style="text-align:center;color:var(--text-faint);padding:40px">Impossibile caricare le banche parole.</p>';document.getElementById('wbItContent').style.display='none';});
                }
                loadAllIt();

                // Italian-specific bank opener — passes Italian IDs directly (no remapping to English!)
                window.wbOpenBankIt=function(id){
                  if(window.openWordbankView){ window.openWordbankView(id); return; }
                  var tries=0;
                  var poll=setInterval(function(){
                    tries++;
                    if(window.openWordbankView){ clearInterval(poll); window.openWordbankView(id); }
                    else if(tries>30){ clearInterval(poll); alert('Apri banca: '+id); }
                  },100);
                };

                window.toggleFavBankIt=function(bankId, starEl){
                  var favs = [];
                  try { favs = JSON.parse(localStorage.getItem('sottotitoli-fav-banks-it') || '[]'); } catch(e) {}
                  var idx = favs.indexOf(bankId);
                  if (idx >= 0) { favs.splice(idx, 1); if (starEl) { starEl.style.color = 'var(--text-faint)'; starEl.style.fontVariationSettings = "'FILL' 0"; } }
                  else { favs.push(bankId); if (starEl) { starEl.style.color = '#d97706'; starEl.style.fontVariationSettings = "'FILL' 1"; } }
                  localStorage.setItem('sottotitoli-fav-banks-it', JSON.stringify(favs));
                  if (typeof renderWbOverviewSections === 'function') setTimeout(renderWbOverviewSections, 200);
                };
                // Expose loadAllIt so renderWordbanksIt() can trigger a full refresh
                window._wbItLoadAll = loadAllIt;
              })();
            </script>
          </div>
          <!-- Subtab: Review Due -->
          <div role="tabpanel" class="subtab-pane" id="sub-wb-review">
            <section id="reviewDashboardMount">
              <div id="wbReviewClassicFallback">
                <div class="wb-stats" id="wbReviewStats"></div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
                  <h3 style="margin:0;font-size:18px;font-weight:700">⏰ Parole da ripassare</h3>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-ghost btn-sm" onclick="renderReviewDue()" style="font-family:var(--font-ui)"><i class="fa-solid fa-rotate"></i> Refresh</button>
                    <button class="btn btn-primary btn-sm" id="btnReviewAllDue" onclick="reviewAllDue()" style="font-family:var(--font-ui)"><i class="fa-solid fa-check"></i> Segna tutte come ripassate</button>
                  </div>
                </div>
                <div class="bulk-bar" id="wbReviewBulkBar"><span id="wbReviewBulkCount">0 selezionate</span><button onclick="wbReviewBulkDone()">✓ Fatto</button><button class="bulk-close" onclick="wbReviewClearSelection()">&times;</button></div>
                <div class="wb-table-wrap"><table class="wb-table"><thead><tr><th class="cb"><input type="checkbox" onchange="wbReviewToggleAll(this)" style="accent-color:var(--cyan)"></th><th class="sortable" data-sort="word">Parola <span class="sort-arrow">▲</span></th><th class="sortable" data-sort="cefr">CEFR <span class="sort-arrow">▲</span></th><th class="sortable" data-sort="pos">POS <span class="sort-arrow">▲</span></th><th class="sortable" data-sort="lastReview">Ultimo ripasso <span class="sort-arrow">▲</span></th><th class="sortable" data-sort="interval">Intervallo SRS <span class="sort-arrow">▲</span></th><th class="sortable" data-sort="status">Stato <span class="sort-arrow">▲</span></th><th></th></tr></thead><tbody id="wbReviewBody"></tbody></table></div>
                <div id="wbReviewEmpty" style="display:none;text-align:center;padding:40px 20px;color:var(--text-faint)">
                  <div style="font-size:48px;margin-bottom:12px">🎉</div>
                  <h3 style="color:var(--text-soft);margin-bottom:6px">Tutto in ordine!</h3>
                  <p style="font-size:14px;max-width:400px;margin:0 auto;line-height:1.5">Nessuna parola da ripassare oggi. Torna domani o inizia una nuova sessione per aggiungere parole.</p>
                </div>
              </div>
            </section>
            <div id="reviewSessionMount"></div>
          </div>
        </div>
`;
}

export async function init() {
  // Tab switching
  var tabs = document.getElementById('wbTabs');
  if (tabs) {
    tabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.wb-tab-btn');
      if (!btn) return;
      tabs.querySelectorAll('.wb-tab-btn').forEach(function(b) {
        b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
        b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
        b.style.border = b === btn ? 'none' : '1px solid var(--line)';
      });
      loadBanks(btn.getAttribute('data-tab'));
    });
  }

  // Create bank button
  var createBtn = document.getElementById('wbCreateBtn');
  if (createBtn) createBtn.addEventListener('click', showCreateBankDialog);

  // Import button delegated
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#wbImportBtn');
    if (!btn) return;
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf,.docx,.txt';
    input.onchange = function() { if (this.files[0]) importBankFile(this.files[0]); };
    input.click();
  });

  // Initial load
  loadBanks('overview');
}

export function destroy() { container = null; }

async function loadBanks(tab) {
  tab = tab || 'overview';
  var sb = window.sottotitoliSupabase;
  var content = document.getElementById('wbContent');
  if (!sb) { if (content) content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Accedi per visualizzare le banche.</p>'; return; }
  try {
    var resp = await sb.from('user_wordbanks').select('id, name, lang, created_at').order('created_at', { ascending: false });
    if (resp.error) throw resp.error;
    var banks = resp.data || [];
    if (tab === 'overview') renderBankOverview(banks);
    else {
      var filtered = banks.filter(function(b) { return tab === 'english' ? (b.lang||'').toLowerCase().indexOf('en')!==-1 : tab === 'italian' ? (b.lang||'').toLowerCase().indexOf('it')!==-1 : true; });
      renderBankList(filtered, tab === 'review');
    }
  } catch(e) { console.error('Wordbanks:', e); if (content) content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Errore nel caricamento.</p>'; }
}

function renderBankOverview(banks) {
  var content = document.getElementById('wbContent');
  if (!content) return;
  if (!banks.length) { content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Nessuna banca. Crea la tua prima banca!</p>'; return; }
  content.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">' +
    banks.map(function(b) {
      return '<div class="wb-card" data-id="' + b.id + '" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor=\'var(--cyan)\'" onmouseout="this.style.borderColor=\'var(--line)\'">' +
        '<strong style="color:var(--text);font-size:15px">' + esc(b.name) + '</strong>' +
        '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--text-soft)">' +
        '<span style="padding:2px 10px;border-radius:99px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:10px;font-weight:700">' + esc(b.lang||'—') + '</span>' +
        '<span>' + (b.created_at?new Date(b.created_at).toLocaleDateString('it-IT'):'') + '</span></div></div>';
    }).join('') + '</div>';

  // Bank card click → view words
  content.addEventListener('click', function(e) {
    var card = e.target.closest('.wb-card');
    if (!card) return;
    viewBankWords(card.getAttribute('data-id'));
  });
}

function renderBankList(banks, isReview) {
  var content = document.getElementById('wbContent');
  if (!content) return;
  if (isReview) { content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Da ripassare — in arrivo.</p>'; return; }
  if (!banks.length) { content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Nessuna banca in questa lingua.</p>'; return; }
  content.innerHTML = banks.map(function(b) {
    return '<div class="wb-card" data-id="' + b.id + '" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onmouseover="this.style.borderColor=\'var(--cyan)\'" onmouseout="this.style.borderColor=\'var(--line)\'">' +
      '<strong style="color:var(--text)">' + esc(b.name) + '</strong>' +
      '<span style="font-size:11px;color:var(--text-faint)">' + esc(b.lang||'') + '</span></div>';
  }).join('');
}

async function viewBankWords(bankId) {
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  try {
    var resp = await sb.from('user_wordbank_words').select('word, pos, cefr_level, added_at').eq('wordbank_id', bankId).order('added_at',{ascending:false}).limit(200);
    var words = resp.data || [];
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-family:Manrope,sans-serif">Parole</h3><button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim)">&times;</button></div>' +
      (words.length ? words.map(function(w) { return '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--line);font-size:13px"><span style="font-weight:600;color:var(--text)">' + esc(w.word) + '</span><span style="color:var(--text-soft);font-size:11px">' + esc(w.pos||'') + (w.cefr_level?' · '+w.cefr_level:'') + '</span></div>'; }).join('') : '<p style="text-align:center;color:var(--text-faint);padding:40px">Nessuna parola.</p>') + '</div>';
    modal.addEventListener('click', function(e) { if (e.target===modal||e.target.closest('button')) modal.remove(); });
    document.body.appendChild(modal);
  } catch(e) { console.error('View bank:', e); }
}

function showCreateBankDialog() {
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
    '<h3 style="margin:0 0 16px;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">Nuova Banca Parole</h3>' +
    '<input id="wbNewName" placeholder="Nome banca" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;margin-bottom:12px;box-sizing:border-box">' +
    '<select id="wbNewLang" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;margin-bottom:16px;box-sizing:border-box"><option value="en">English</option><option value="it">Italiano</option></select>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button id="wbNewCancel" style="padding:10px 20px;border:1px solid var(--line);border-radius:100px;background:var(--card);color:var(--text-soft);font-size:13px;font-weight:600;cursor:pointer">Annulla</button><button id="wbNewConfirm" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;cursor:pointer">Crea</button></div></div>';
  modal.addEventListener('click', function(e) { if (e.target===modal) modal.remove(); });
  modal.querySelector('#wbNewCancel').addEventListener('click', function() { modal.remove(); });
  modal.querySelector('#wbNewConfirm').addEventListener('click', async function() {
    var name = document.getElementById('wbNewName').value.trim();
    var lang = document.getElementById('wbNewLang').value;
    if (!name) return;
    var sb = window.sottotitoliSupabase;
    if (!sb) { modal.remove(); return; }
    try {
      var userResp = await sb.auth.getUser();
      await sb.from('user_wordbanks').insert({ name: name, lang: lang, user_id: userResp.data.user.id });
      modal.remove();
      loadBanks('overview');
    } catch(e) { alert('Errore: ' + e.message); }
  });
  document.body.appendChild(modal);
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
