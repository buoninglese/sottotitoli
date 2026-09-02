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
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.totalWords||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In scadenza oggi</span><div style="font-size:22px;font-weight:700;color:'+(stats.dueToday>0?'#E11D48':'var(--text)')+';margin-top:2px">'+(stats.dueToday||0)+'</div>'+(stats.dueToday===0?'<div style="font-size:11px;font-weight:600;color:#10B981;font-family:\'Manrope\',sans-serif;margin-top:2px">Tutto in ordine</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Nuove questa settimana</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.newThisWeek||0)+'</div>'+(stats.newThisWeek>0?'<div style="font-size:11px;font-weight:600;color:var(--cyan);font-family:\'Manrope\',sans-serif;margin-top:2px">+'+(stats.newThisWeek||0)+' questa settimana</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Known</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.known||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Learning</span><div style="font-size:22px;font-weight:700;color:var(--cyan);margin-top:2px">'+(stats.learning||0)+'</div></div>'+
                          '</div>';
                        }
                      }).catch(function(){});
                    }
                    // Add stats bar placeholder (filled async above)
                    statsHtml='<div id="wbEnStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>';
                    // Pinned
                    statsHtml+='<div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:24px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined" style="color:var(--cyan)">push_pin</span><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Pinned Collections</h3><span style="background:rgba(6,182,212,.1);color:var(--cyan);font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;padding:2px 8px;border-radius:99px;text-transform:uppercase">Always Synced</span></div></div>';
                    allPinned.forEach(function(b){
                      var due=b.due||b.due_count||0;
                      var newWords=b.newWords||b.new_words||0;
                      var total=b.words||b.word_count||0;
                      statsHtml+='<div class="hv-border" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:16px;cursor:pointer;margin-bottom:4px" onclick="wbOpenBank(\''+b.id+'\')">'+
                        '<span class="material-symbols-outlined" style="color:var(--cyan);font-size:18px">'+(b.icon||'history')+'</span>'+
                        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">'+esc(b.name||'Bank')+'</div><div style="font-size:13px;color:var(--text-soft)">'+esc(b.desc||b.description||'')+'</div></div>'+
                        '<div style="display:flex;align-items:center;gap:24px;flex-shrink:0">'+
                          '<div style="text-align:center"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase">Words</span><div style="font-size:13px;font-weight:700;color:var(--text)">'+total+'</div></div>'+
                          '<div style="text-align:center"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase">New Words</span><div style="font-size:13px;font-weight:700;color:#10B981">'+newWords+'</div></div>'+
                          '<div style="text-align:right;min-width:80px">'+
                            (due>0?'<span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:#E11D48;text-transform:uppercase">'+due+' TO DO</span><div style="width:64px;height:4px;background:var(--bg);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;background:#E11D48;width:'+Math.min(100,Math.round(due/total*100))+'%"></div></div>':'<span style="font-size:11px;font-weight:600;color:var(--text-soft);font-family:\'Manrope\',sans-serif">UP TO DATE</span>')+
                          '</div>'+
                        '</div>'+
                        '<span class="material-symbols-outlined" onclick="event.stopPropagation();toggleFavBank(\''+b.id+'\',this)" style="font-size:18px;cursor:pointer;color:var(--text-faint);margin-right:4px" title="Add to favorites">star</span>'+'<button style="padding:6px 14px;background:rgba(6,182,212,.1);color:var(--cyan);border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;cursor:pointer;white-space:nowrap">Open</button>'+
                      '</div>';
                    });
                    statsHtml+='</div>';
                    // Discovery
                    statsHtml+='<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Discovery</h3><span style="font-size:11px;font-weight:700;color:var(--text-soft);font-family:\'Manrope\',sans-serif;text-transform:uppercase">AI Powered</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
                    allDiscovery.forEach(function(b){
                      statsHtml+='<div class="hv-border-lift" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;cursor:pointer" onclick="wbOpenBank(\''+b.id+'\')">'+
                        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><span class="material-symbols-outlined" style="color:var(--cyan);font-size:28px">'+(b.icon||'auto_awesome')+'</span><span style="font-size:11px;font-weight:700;background:var(--cyan);color:#fff;padding:2px 6px;border-radius:4px;font-family:\'Manrope\',sans-serif;text-transform:uppercase">'+(b.type||'SMART')+'</span></div>'+
                        '<div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Bank')+'</div><div style="font-size:13px;color:var(--text-soft);margin-bottom:12px">'+esc(b.desc||b.description||'')+'</div>'+
                        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px"><span style="font-size:11px;font-weight:600;font-family:\'Manrope\',sans-serif;color:var(--text-soft)">'+(b.words||b.word_count||0)+' parole</span><span style="font-size:11px;font-weight:700;color:var(--cyan);font-family:\'Manrope\',sans-serif">Open</span></div></div>';
                    });
                    statsHtml+='</div></div><div style="background:rgba(6,182,212,.06);border:1px solid rgba(6,182,212,.18);border-radius:12px;padding:20px"><div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:6px"><h3 style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--cyan);margin:0">Import Your Own</h3><span class="material-symbols-outlined" style="font-size:15px;color:var(--cyan);cursor:help" title="Import words from text files, PDFs, or documents. Uploaded files appear here as word banks you can browse and study.">info</span></div></div>';
                    // Show recently imported files (tracked in localStorage)
                    var recentImports = [];
                    try { recentImports = JSON.parse(localStorage.getItem('sottotitoli-recent-imports') || '[]'); } catch(e) {}
                    if (recentImports.length) {
                      recentImports.slice(0, 5).forEach(function(ri){
                        statsHtml+='<div class="hv-bg" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:6px;margin-bottom:4px" onclick="wbOpenBank(\''+ri.id+'\')"><span class="material-symbols-outlined" style="font-size:18px;color:var(--text-soft)">upload_file</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">'+esc(ri.name||'Bank')+'</div><div style="font-size:11px;color:var(--text-soft)">'+esc(ri.date||'')+'</div></div><span style="font-size:11px;font-weight:700;color:var(--cyan);font-family:\'Manrope\',sans-serif;white-space:nowrap">'+(ri.word_count||0)+' w</span></div>';
                      });
                    } else {
                      statsHtml+='<p style="text-align:center;color:var(--text-faint);padding:16px;font-size:13px">No imports yet. Upload a file to get started.</p>';
                    }
                    statsHtml+='<div style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><button onclick="wbShowImport()" style="width:100%;padding:10px;background:var(--cyan);color:var(--chip-active-text,#fff);border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><span class="material-symbols-outlined" style="font-size:18px">upload_file</span> Import File</button></div></div></div>';
                    // Full library
                    statsHtml+='<div><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0 0 16px">Full Library</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
                    banks.slice(0,8).forEach(function(b){
                      statsHtml+='<div class="hv-border" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;cursor:pointer" onclick="wbOpenBank(\''+b.id+'\')"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><span style="font-size:11px;font-weight:700;background:rgba(6,182,212,.1);color:var(--cyan);padding:2px 6px;border-radius:4px;font-family:\'Manrope\',sans-serif">'+(b.cefr_level||'—')+'</span></div><div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Bank')+'</div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-soft)"><span>'+(b.word_count||0)+' parole</span><span style="font-weight:600;color:var(--cyan)">Open</span></div></div>';
                    });
                    statsHtml+='</div></div>';
                    // ── Folder layout replaces the standard word-bank cards ──
                    // Keep the stats bar; render the folder grid (which includes pinned/smart/custom + AI + new slots)
                    var wbfEnRoot = document.createElement('div');
                    wbfEnRoot.className = 'wbf-view';
                    wbfEnRoot.setAttribute('data-wbf-lang', 'en');
                    wbfEnRoot.innerHTML =
                      '<div class="wbf-toolbar">'+
                        '<span class="wbf-toolbar-title">Collezioni</span>'+
                      '</div>'+
                      '<div id="wbFoldersGridEn"><div class="wbf-loading"><div class="wbf-spinner"></div><span data-i18n="wb_folders_loading">Caricamento cartelle…</span></div></div>';
                    // Render ONLY the stats bar (filled async by the #wbEnStatsBar fetch above) + the folder view
                    document.getElementById('wordbanksOverview').innerHTML = '<div id="wbEnStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>' +
                      '<div style="margin-bottom:24px;background:linear-gradient(135deg,rgba(6,182,212,.06),transparent);border:1px solid rgba(6,182,212,.18);border-radius:14px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">'+
                        '<div><h4 style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 4px;font-family:&quot;Inter&quot;,sans-serif" data-i18n="wb_expand_vocab">Ready to expand your vocabulary?</h4><p style="font-size:13px;color:var(--text-soft);max-width:400px;line-height:1.4;margin:0" data-i18n="wb_expand_vocab_desc">Import text files, PDFs, or documents to automatically extract and categorize new vocabulary by CEFR level.</p></div>'+
                        '<button onclick="wbShowImport()" class="wb-btn" data-i18n="wb_import_file"><span class="material-symbols-outlined" style="font-size:15px">upload_file</span> Import File</button>'+
                      '</div>' + wbfEnRoot.outerHTML;
                    document.getElementById('wbEnContent').style.display='none';
                    // Render folders once the folders module is available (defined later in the page)
                    (function renderFoldersEn(){
                      if (window.renderWbFolders && document.getElementById('wbFoldersGridEn')) { window.renderWbFolders('en', document.getElementById('wbFoldersGridEn')); return; }
                      setTimeout(renderFoldersEn, 150);
                    })();
                  }).catch(function(){document.getElementById('wordbanksOverview').innerHTML='<p style="text-align:center;color:var(--text-faint);padding:40px">Unable to load word banks.</p>';document.getElementById('wbEnContent').style.display='none';});
                }
                loadAll();
                window.wbNewBank=function(){ if(window.newWordbank) window.newWordbank(); else { appPrompt('Nome della nuova banca:', function(n){ if(n) appAlert('Banca "'+n+'" creata (offline).', 'Offline', '📚'); }, 'Nuova banca', '📚'); } setTimeout(function(){ loadAll(); }, 800); };
                window.wbOpenBank=function(id){
                  var presetMap={'preset-ripasso':'review_due_now','preset-saved':'saved_from_sessions','preset-evb':'vocab_builder_en','preset-fragile':'fragile_words','preset-next':'goal_next_step','preset-build':'build_from_known','preset-activate':'activate_recognized','preset-goal':'upcoming_useful_vocab','preset-themes':'upcoming_session_driven','preset-roadmap':'upcoming_roadmap'};
                  if(presetMap[id]) id=presetMap[id];
                  if(window.openWordbankView){ window.openWordbankView(id); return; }
                  // openWordbankView may not be defined yet — poll for it
                  var tries=0;
                  var poll=setInterval(function(){
                    tries++;
                    if(window.openWordbankView){ clearInterval(poll); window.openWordbankView(id); }
                    else if(tries>30){ clearInterval(poll); appAlert('Apri banca: '+id, 'Apri banca', '📂'); }
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
                window.wbShowImport=function(){
                  document.getElementById('wbAiPopup').style.display='none';
                  document.getElementById('wbCreatePopup').style.display='none';
                  document.getElementById('wbImportPopup').style.display='flex';
                  var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
                  if (window.wbImpLang) window.wbImpLang(itTab ? 'it' : 'en');
                };
                // Import language toggle (🇬🇧 English / 🇮🇹 Italiano)
                window.wbImpLang=function(l){
                  window._wbImpLang = l;
                  var en=document.getElementById('wbImpLangEn'), it=document.getElementById('wbImpLangIt');
                  var act=function(btn,on){ if(!btn)return; btn.style.background = on ? 'var(--chip-active-bg, var(--cyan))' : 'transparent'; btn.style.color = on ? 'var(--chip-active-text, #fff)' : 'var(--text-soft)'; };
                  act(en, l==='en'); act(it, l==='it');
                };
                // ALL toggles the POS filters; unchecking a POS clears ALL
                window.wbImpAllToggle=function(allEl){
                  ['wbImpNouns','wbImpVerbs','wbImpAdj'].forEach(function(id){ var el=document.getElementById(id); if(el) el.checked = allEl.checked; });
                };
                window.wbImpSync=function(){
                  var all=document.getElementById('wbImpAll'); if(!all) return;
                  var ids=['wbImpNouns','wbImpVerbs','wbImpAdj'];
                  all.checked = ids.every(function(id){ var e=document.getElementById(id); return e && e.checked; });
                };
                window.wbCloseImport=function(){ document.getElementById('wbImportPopup').style.display='none'; };
                window.wbShowCreate=function(){ document.getElementById('wbAiPopup').style.display='none'; document.getElementById('wbImportPopup').style.display='none'; document.getElementById('wbCreatePopup').style.display='flex'; };
                window.wbCloseCreate=function(){ document.getElementById('wbCreatePopup').style.display='none'; };
                window.wbDoCreate=function(){
                  var name=(document.getElementById('wbCreateName').value||'').trim();
                  var tag=(document.getElementById('wbCreateTag').value||'').trim();
                  if(!name){appAlert('Inserisci un nome per la banca.', 'Nome richiesto', '📌');return;}
                  // Detect which language tab is active
                  var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
                  var lang = itTab ? 'it' : 'en';
                  if(window.SottotitoliData&&window.SottotitoliData.addWordbank){
                    window.SottotitoliData.addWordbank(name,lang).then(function(bank){
                      if(bank){ appAlert('Banca "'+name+'" creata!', 'Operazione completata', '✅'); }
                      wbCloseCreate();
                      // Refresh the appropriate overview
                      if(lang==='it' && typeof renderWordbanksIt === 'function') renderWordbanksIt();
                      else if(typeof renderWordbanks === 'function') renderWordbanks();
                      // Also refresh the folder grid of the active subtab
                      if (window.wbRenderActive) setTimeout(window.wbRenderActive, 350);
                    }).catch(function(){ appAlert('Errore creando la banca.', 'Errore', '❌'); wbCloseCreate(); });
                  } else {
                    if(window.newWordbank){ window.newWordbank(); wbCloseCreate(); }
                    else { appAlert('Banca "'+name+'" creata.', 'Operazione completata', '✅'); wbCloseCreate(); }
                  }
                };
                async function processWords(text,name){
                  var raw=text.split(/[\\s,;:|!?.\\-\\[\\]\\(\\)\\{\\}"'<>\\n\\r\\t]+/).filter(function(w){return w.length>1&&!/^\\d+$/.test(w);});
                  if(!raw.length){appAlert('Nessuna parola trovata nel file.', 'Import vuoto', '📭');return;}
                  var lang = window._wbImpLang || (document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]') ? 'it' : 'en');
                  // ── Apply import filters (ALL / POS / CEFR) ──
                  var allOn = !document.getElementById('wbImpAll') || document.getElementById('wbImpAll').checked;
                  var wantN = !document.getElementById('wbImpNouns') || document.getElementById('wbImpNouns').checked;
                  var wantV = !document.getElementById('wbImpVerbs') || document.getElementById('wbImpVerbs').checked;
                  var wantAdj = !document.getElementById('wbImpAdj') || document.getElementById('wbImpAdj').checked;
                  var wantB2 = document.getElementById('wbImpB2') ? document.getElementById('wbImpB2').checked : false;
                  var wantC1 = document.getElementById('wbImpC1') ? document.getElementById('wbImpC1').checked : false;
                  var wantC2 = document.getElementById('wbImpC2') ? document.getElementById('wbImpC2').checked : false;
                  var words = raw.filter(function(wd){
                    if (allOn) return true;
                    var lw = wd.toLowerCase();
                    var pos = (window.LEMMA_POS_MAP||{})[lw] || '';
                    var cefr = (window.CEFR_LEVELS||{})[lw] || '';
                    var posOk = (wantN && pos==='n') || (wantV && pos==='v') || (wantAdj && pos==='adj');
                    if (!posOk) return false;
                    if (wantB2 && cefr !== 'B2') return false;
                    if (wantC1 && cefr !== 'C1') return false;
                    if (wantC2 && cefr !== 'C2') return false;
                    return true;
                  });
                  // ── Skip words the user already has in a word bank ──
                  if (document.getElementById('wbImpSkip') && document.getElementById('wbImpSkip').checked) {
                    try {
                      var sBanks = (await SottotitoliData.getWordbanks(lang)) || [];
                      var existing = {};
                      for (var sbi=0; sbi<sBanks.length; sbi++) {
                        var sWs = (await SottotitoliData.getWordbankWords(sBanks[sbi].id)) || [];
                        sWs.forEach(function(w){ existing[String(w.word||'').toLowerCase()] = true; });
                      }
                      words = words.filter(function(w){ return !existing[String(w).toLowerCase()]; });
                    } catch(e) {}
                  }
                  if (!words.length) { appAlert('Nessuna parola corrisponde ai filtri selezionati.', 'Nessun risultato', '🔍'); return; }
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
                          appAlert('Banca "'+name+'" creata con '+words.length+' parole.', 'Operazione completata', '✅');
                          wbCloseImport();
                          // Refresh the appropriate overview
                          if(lang==='it' && typeof renderWordbanksIt === 'function') setTimeout(renderWordbanksIt, 300);
                          else if(typeof loadAll === 'function') setTimeout(loadAll, 300);
                        }).catch(function(){appAlert('Errore aggiungendo parole alla banca.', 'Errore', '❌');});
                      }else{
                        recent.unshift({id:bank.id,name:name,date:today,word_count:words.length});
                        if(recent.length>20)recent=recent.slice(0,20);
                        localStorage.setItem(storageKey,JSON.stringify(recent));
                        appAlert('Banca "'+name+'" creata con '+words.length+' parole.', 'Operazione completata', '✅');
                        wbCloseImport();
                        if(lang==='it' && typeof renderWordbanksIt === 'function') setTimeout(renderWordbanksIt, 300);
                        else if(typeof loadAll === 'function') setTimeout(loadAll, 300);
                      }
                    }).catch(function(){appAlert('Errore creando la banca.', 'Errore', '❌');});
                  }else{
                    recent.unshift({id:'local-'+Date.now(),name:name,date:today,word_count:words.length});
                    if(recent.length>20)recent=recent.slice(0,20);
                    localStorage.setItem(storageKey,JSON.stringify(recent));
                    appAlert('Offline: creata '+name+' ('+words.length+' parole)', 'Offline', '📚');wbCloseImport();
                  }
                }
                window.wbDoImport=function(){
                  var file=document.getElementById('wbImportFile').files[0];
                  var name=(document.getElementById('wbImportName').value||'').trim();
                  if(!file){appAlert('Seleziona un file per prima cosa.', 'File richiesto', '📎');return;}
                  if(!name){appAlert('Inserisci un nome per la banca.', 'Nome richiesto', '📌');return;}
                  var ext=(file.name||'').split('.').pop().toLowerCase();
                  if(ext==='pdf'){
                    if(typeof pdfjsLib==='undefined'){appAlert('Parser PDF non caricato. Aggiorna la pagina.', 'PDF non disponibile', '⚠️');return;}
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
                      }).catch(function(){appAlert('Impossibile leggere il PDF.', 'Errore PDF', '❌');});
                    };
                    reader.readAsArrayBuffer(file);
                  }else if(ext==='docx'){
                    if(typeof mammoth==='undefined'){appAlert('Parser DOCX non caricato. Aggiorna la pagina.', 'DOCX non disponibile', '⚠️');return;}
                    var reader=new FileReader();
                    reader.onload=function(e){
                      mammoth.extractRawText({arrayBuffer:e.target.result}).then(function(result){
                        processWords(result.value,name);
                      }).catch(function(){appAlert('Impossibile leggere il DOCX.', 'Errore DOCX', '❌');});
                    };
                    reader.readAsArrayBuffer(file);
                  }else{
                    var reader=new FileReader();
                    reader.onload=function(e){processWords(e.target.result,name);};
                    reader.readAsText(file);
                  }
                };
              })();
