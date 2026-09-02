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
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.totalWords||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In scadenza oggi</span><div style="font-size:22px;font-weight:700;color:'+(stats.dueToday>0?'#E11D48':'var(--text)')+';margin-top:2px">'+(stats.dueToday||0)+'</div>'+(stats.dueToday===0?'<div style="font-size:11px;font-weight:600;color:#10B981;font-family:\'Manrope\',sans-serif;margin-top:2px">Tutto in ordine</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Nuove questa settimana</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.newThisWeek||0)+'</div>'+(stats.newThisWeek>0?'<div style="font-size:11px;font-weight:600;color:var(--cyan);font-family:\'Manrope\',sans-serif;margin-top:2px">+'+(stats.newThisWeek||0)+' questa settimana</div>':'')+'</div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Conosciute</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.known||0)+'</div></div>'+
                            '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In apprendimento</span><div style="font-size:22px;font-weight:700;color:var(--cyan);margin-top:2px">'+(stats.learning||0)+'</div></div>'+
                          '</div>';
                        }
                      }).catch(function(){});
                    }
                    statsHtml='<div id="wbItStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>';

                    // Pinned
                    statsHtml+='<div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:24px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined" style="color:var(--accent-green)">push_pin</span><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Collezioni Fissate</h3><span style="background:rgba(16,185,129,.1);color:var(--accent-green);font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;padding:2px 8px;border-radius:99px;text-transform:uppercase">Sempre Sincronizzate</span></div></div>';
                    allPinned.forEach(function(b){
                      var due=b.due||b.due_count||0;
                      var newWords=b.newWords||b.new_words||0;
                      var total=b.words||b.word_count||0;
                      statsHtml+='<div class="hv-border-green" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:16px;cursor:pointer;margin-bottom:4px" onclick="wbOpenBankIt(\''+b.id+'\')">'+
                        '<span class="material-symbols-outlined" style="color:var(--accent-green);font-size:18px">'+(b.icon||'history')+'</span>'+
                        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">'+esc(b.name||'Banca')+'</div><div style="font-size:13px;color:var(--text-soft)">'+esc(b.desc||b.description||'')+'</div></div>'+
                        '<div style="display:flex;align-items:center;gap:24px;flex-shrink:0">'+
                          '<div style="text-align:center"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase">Parole</span><div style="font-size:13px;font-weight:700;color:var(--text)">'+total+'</div></div>'+
                          '<div style="text-align:center"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase">Nuove</span><div style="font-size:13px;font-weight:700;color:#10B981">'+newWords+'</div></div>'+
                          '<div style="text-align:right;min-width:80px">'+
                            (due>0?'<span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:#E11D48;text-transform:uppercase">'+due+' DA FARE</span><div style="width:64px;height:4px;background:var(--bg);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;background:#E11D48;width:'+Math.min(100,Math.round(due/total*100))+'%"></div></div>':'<span style="font-size:11px;font-weight:600;color:var(--text-soft);font-family:\'Manrope\',sans-serif">IN ORDINE</span>')+
                          '</div>'+
                        '</div>'+
                        '<span class="material-symbols-outlined" onclick="event.stopPropagation();toggleFavBankIt(\''+b.id+'\',this)" style="font-size:18px;cursor:pointer;color:var(--text-faint);margin-right:4px" title="Aggiungi ai preferiti">star</span>'+'<button style="padding:6px 14px;background:rgba(16,185,129,.1);color:var(--accent-green);border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;cursor:pointer;white-space:nowrap">Apri</button>'+
                      '</div>';
                    });
                    statsHtml+='</div>';

                    // Discovery
                    statsHtml+='<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0">Scoperta</h3><span style="font-size:11px;font-weight:700;color:var(--text-soft);font-family:\'Manrope\',sans-serif;text-transform:uppercase">AI Powered</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
                    allDiscovery.forEach(function(b){
                      statsHtml+='<div class="hv-border-green-lift" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;cursor:pointer" onclick="wbOpenBankIt(\''+b.id+'\')">'+
                        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><span class="material-symbols-outlined" style="color:var(--accent-green);font-size:28px">'+(b.icon||'auto_awesome')+'</span><span style="font-size:11px;font-weight:700;background:var(--accent-green);color:#fff;padding:2px 6px;border-radius:4px;font-family:\'Manrope\',sans-serif;text-transform:uppercase">'+(b.type||'BETA')+'</span></div>'+
                        '<div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Banca')+'</div><div style="font-size:13px;color:var(--text-soft);margin-bottom:12px">'+esc(b.desc||b.description||'')+'</div>'+
                        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px"><span style="font-size:11px;font-weight:600;font-family:\'Manrope\',sans-serif;color:var(--text-soft)">'+(b.words||b.word_count||0)+' parole</span><span style="font-size:11px;font-weight:700;color:var(--accent-green);font-family:\'Manrope\',sans-serif">Apri</span></div></div>';
                    });
                    statsHtml+='</div></div><div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:12px;padding:20px"><div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:6px"><h3 style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-green);margin:0">Importa le tue</h3><span class="material-symbols-outlined" style="font-size:15px;color:var(--accent-green);cursor:help" title="Importa parole da file di testo, PDF o documenti. I file caricati appariranno qui come banche parole che puoi sfogliare e studiare.">info</span></div></div>';
                    var recentImports = [];
                    try { recentImports = JSON.parse(localStorage.getItem('sottotitoli-recent-imports-it') || '[]'); } catch(e) {}
                    if (recentImports.length) {
                      recentImports.slice(0, 5).forEach(function(ri){
                        statsHtml+='<div class="hv-bg" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:6px;margin-bottom:4px" onclick="wbOpenBankIt(\''+ri.id+'\')"><span class="material-symbols-outlined" style="font-size:18px;color:var(--text-soft)">upload_file</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">'+esc(ri.name||'Banca')+'</div><div style="font-size:11px;color:var(--text-soft)">'+esc(ri.date||'')+'</div></div><span style="font-size:11px;font-weight:700;color:var(--accent-green);font-family:\'Manrope\',sans-serif;white-space:nowrap">'+(ri.word_count||0)+' p</span></div>';
                      });
                    } else {
                      statsHtml+='<p style="text-align:center;color:var(--text-faint);padding:16px;font-size:13px">Nessuna importazione. Carica un file per iniziare.</p>';
                    }
                    statsHtml+='<div style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><button onclick="wbShowImport()" style="width:100%;padding:10px;background:var(--accent-green);color:var(--chip-active-text,#fff);border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><span class="material-symbols-outlined" style="font-size:18px">upload_file</span> Importa File</button></div></div></div>';

                    // Full library
                    statsHtml+='<div><h3 style="font-size:13px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.03em;color:var(--text-soft);margin:0 0 16px">Libreria Completa</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
                    banks.slice(0,8).forEach(function(b){
                      statsHtml+='<div class="hv-border-green" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;cursor:pointer" onclick="wbOpenBankIt(\''+b.id+'\')"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><span style="font-size:11px;font-weight:700;background:rgba(16,185,129,.1);color:var(--accent-green);padding:2px 6px;border-radius:4px;font-family:\'Manrope\',sans-serif">'+(b.cefr_level||'—')+'</span></div><div style="font-weight:700;color:var(--text);margin-bottom:4px">'+esc(b.name||'Banca')+'</div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-soft)"><span>'+(b.word_count||0)+' parole</span><span style="font-weight:600;color:var(--accent-green)">Apri</span></div></div>';
                    });
                    statsHtml+='</div>'+
                      '<div class="wb-card" style="border:2px dashed var(--line);background:transparent;display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;margin-top:12px" onclick="newWordbank()"><div style="text-align:center;color:var(--text-faint);font-size:11px;font-weight:600"><i class="fa-solid fa-plus" style="margin-right:4px;font-size:11px"></i> Crea nuova banca</div></div>'+
                    '</div>';
                    // ── Folder layout replaces the standard word-bank cards ──
                    var wbfItRoot = document.createElement('div');
                    wbfItRoot.className = 'wbf-view';
                    wbfItRoot.setAttribute('data-wbf-lang', 'it');
                    wbfItRoot.innerHTML =
                      '<div class="wbf-toolbar">'+
                        '<span class="wbf-toolbar-title">Collezioni</span>'+
                      '</div>'+
                      '<div id="wbFoldersGridIt"><div class="wbf-loading"><div class="wbf-spinner"></div><span data-i18n="wb_folders_loading">Caricamento cartelle…</span></div></div>';
                    // Render ONLY the stats bar (filled async by the #wbItStatsBar fetch above) + the folder view
                    document.getElementById('wordbanksItOverview').innerHTML = '<div id="wbItStatsBar" style="margin-bottom:24px"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"><div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">…</div></div></div></div>' +
                      '<div style="margin-bottom:24px;background:linear-gradient(135deg,rgba(6,182,212,.06),transparent);border:1px solid rgba(6,182,212,.18);border-radius:14px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">'+
                        '<div><h4 style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 4px;font-family:&quot;Inter&quot;,sans-serif" data-i18n="wb_expand_vocab">Ready to expand your vocabulary?</h4><p style="font-size:13px;color:var(--text-soft);max-width:400px;line-height:1.4;margin:0" data-i18n="wb_expand_vocab_desc">Import text files, PDFs, or documents to automatically extract and categorize new vocabulary by CEFR level.</p></div>'+
                        '<button onclick="wbShowImport()" class="wb-btn" data-i18n="wb_import_file"><span class="material-symbols-outlined" style="font-size:15px">upload_file</span> Importa File</button>'+
                      '</div>' + wbfItRoot.outerHTML;
                    document.getElementById('wbItContent').style.display='none';
                    // Render folders once the folders module is available (defined later in the page)
                    (function renderFoldersIt(){
                      if (window.renderWbFolders && document.getElementById('wbFoldersGridIt')) { window.renderWbFolders('it', document.getElementById('wbFoldersGridIt')); return; }
                      setTimeout(renderFoldersIt, 150);
                    })();
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
                    else if(tries>30){ clearInterval(poll); appAlert('Apri banca: '+id, 'Apri banca', '📂'); }
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
