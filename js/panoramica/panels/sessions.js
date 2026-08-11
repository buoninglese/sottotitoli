// js/panoramica/panels/sessions.js — pnl-trascrizioni panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-trascrizioni">
          <section class="panel-head"><h2 data-i18n="trascrizioni">Trascrizioni</h2></section>

          <!-- Controls Bar -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap">
            <div style="display:flex;gap:8px;flex-wrap:wrap" id="trFilterChips">
              <button class="tr-filter-chip active" data-filter="all" style="padding:8px 18px;background:var(--cyan);color:#fff;border:none;border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_all">All</button>
              <button class="tr-filter-chip" data-filter="favorites" style="padding:8px 18px;background:var(--bg);color:var(--text-soft);border:1px solid var(--line);border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_favorites">★ Preferiti</button>
              <button class="tr-filter-chip" data-filter="7days" style="padding:8px 18px;background:var(--bg);color:var(--text-soft);border:1px solid var(--line);border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_last_7days">Ultimi 7 giorni</button>
              <button class="tr-filter-chip" data-filter="en" style="padding:8px 18px;background:var(--bg);color:var(--text-soft);border:1px solid var(--line);border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_english_only">English only</button>
              <button class="tr-filter-chip" data-filter="it" style="padding:8px 18px;background:var(--bg);color:var(--text-soft);border:1px solid var(--line);border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_italian_only">Italian only</button>
              <button class="tr-filter-chip" data-filter="translated" style="padding:8px 18px;background:var(--bg);color:var(--text-soft);border:1px solid var(--line);border-radius:99px;font-size:13px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" data-i18n="tr_with_translation">With translation</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <div style="position:relative">
                <span class="material-symbols-outlined" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--text-soft)">search</span>
                <input id="trSearchInput" placeholder="Search sessions..." style="padding:8px 12px 8px 34px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px;width:200px;font-family:inherit;margin-left:4px" oninput="renderTrascrizioni()">
              </div>
              <button style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text-soft);cursor:pointer;font-size:12px;font-family:'Manrope',sans-serif;font-weight:600" onclick="trDownloadList()">
                <span class="material-symbols-outlined" style="font-size:16px">download</span> Download List
              </button>
              <div style="display:flex;background:var(--bg);border-radius:8px;padding:2px;border:1px solid var(--line)">
                <button class="tr-view-btn active" data-view="table" style="padding:6px 10px;background:var(--card);border-radius:6px;border:none;cursor:pointer;color:var(--cyan)">
                  <span class="material-symbols-outlined" style="font-size:18px">format_list_bulleted</span>
                </button>
                <button class="tr-view-btn" data-view="cards" style="padding:6px 10px;background:transparent;border-radius:6px;border:none;cursor:pointer;color:var(--text-soft)">
                  <span class="material-symbols-outlined" style="font-size:18px">grid_view</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px" id="trPagination">
            <span style="font-size:12px;color:var(--text-soft);font-family:'Manrope',sans-serif" id="trPageInfo">—</span>
            <div style="display:flex;gap:4px" id="trPageButtons"></div>
          </div>

          <!-- Table View -->
          <div id="trTableView" style="background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden">
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:var(--bg);border-bottom:1px solid var(--line)">
                    <th style="padding:12px 16px;width:32px"><input type="checkbox" id="trSelectAll" onchange="trToggleSelectAll(this)" style="accent-color:var(--cyan)"></th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Date</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Session</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Tags</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Duration</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Words</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:left">Language</th>
                    <th style="padding:12px 16px;font-family:'Manrope',sans-serif;font-size:11px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody id="trSessionsBody"></tbody>
              </table>
            </div>
            <div id="trSessionsEmpty" style="display:none;text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px">No sessions found. Start a caption or translation session.</div>
          </div>

          <!-- Bulk Actions Bar -->
          <div id="trBulkBar" style="display:none;margin-top:12px;padding:12px 16px;background:var(--card);border:1px solid var(--line);border-radius:8px;align-items:center">
            <!-- Left: Tag section -->
            <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:700;color:var(--text);font-family:'Manrope',sans-serif;white-space:nowrap" id="trBulkCount">0 selected</span>
              <span style="color:var(--text-soft);font-size:11px;font-family:'Manrope',sans-serif">—</span>
              <select id="trBulkTagSelect" style="padding:5px 10px;border:1px solid var(--line);border-radius:6px;font-size:11px;font-family:inherit;background:var(--bg);color:var(--text)">
                <option value="">Tag selected…</option>
              </select>
              <button onclick="trBulkAssignTag()" style="padding:5px 14px;background:var(--cyan);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;white-space:nowrap">Apply Tag</button>
            </div>
            <!-- Right: Delete -->
            <div style="border-left:1px solid var(--line);padding-left:16px;margin-left:8px;flex-shrink:0">
              <button onclick="trBulkDelete()" style="padding:6px 16px;background:#E11D48;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;white-space:nowrap">Delete Selected</button>
            </div>
          </div>

          <!-- Cards View -->
          <div id="trCardsView" style="display:none">
            <div id="trCardsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div>
            <div id="trCardsEmpty" style="display:none;text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px">No sessions found.</div>
          </div>

          <!-- Tag Filters + Create Tag -->
          <div style="margin-top:24px">
            <h3 style="font-size:16px;font-weight:600;margin:0 0 12px;color:var(--text)">Filter by Tag</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center" id="trTagFilters"></div>
            <div style="display:flex;gap:6px;margin-top:10px" id="trTagCreate">
              <input id="trNewTagInput" placeholder="New tag name..." style="padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font-size:12px;width:140px;font-family:inherit" onkeydown="if(event.key==='Enter')trCreateTag()">
              <button onclick="trCreateTag()" style="padding:6px 14px;background:var(--cyan);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer">+ Add Tag</button>
            </div>
          </div>

          <!-- ── Editor Panel Backdrop ── -->
          <div id="trEditorBackdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:9998" onclick="trCloseEditor()"></div>
          <!-- ── Editor Popup (centered, fits main panel) ── -->
          <div id="trEditorPanel" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(640px,90vw);max-height:85vh;background:var(--panel);border:1px solid var(--line-strong);border-radius:22px;z-index:9999;box-shadow:0 16px 48px rgba(0,0,0,.25);flex-direction:column;color:var(--text);overflow:hidden">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 28px 16px;flex-shrink:0">
              <h3 style="font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft);margin:0">Editor Panel</h3>
              <div style="display:flex;gap:8px">
                <button onclick="trCloseEditor()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-soft);padding:4px 8px">&times;</button>
              </div>
            </div>
            <!-- Content -->
            <div id="trEditorBody" style="padding:0 28px 20px;overflow-y:auto;max-height:calc(85vh - 130px)">
              <p style="text-align:center;color:var(--text-faint);padding:40px">Select a session to edit.</p>
            </div>
            <!-- Fixed Bottom -->
            <div id="trEditorFooter" style="padding:16px 28px;border-top:1px solid var(--line);flex-shrink:0"></div>
          </div>

          <script>
            (function(){
              var trFilter = 'all';
              var trView = 'table';
              var trSelectedIds = [];
              var trCurrentPage = 1;
              var trPerPage = 15;
              var trAllSessions = [];
              var trAllTags = JSON.parse(localStorage.getItem('s8t-transcript-tags')||'[]');
              var trSessionTags = JSON.parse(localStorage.getItem('s8t-session-tags')||'{}');
              var trEditingSession = null;

              function saveSessionTags(){ localStorage.setItem('s8t-session-tags', JSON.stringify(trSessionTags)); }
              function saveTags(){ localStorage.setItem('s8t-transcript-tags', JSON.stringify(trAllTags)); }

              // Filter chip clicks
              document.querySelectorAll('#trFilterChips .tr-filter-chip').forEach(function(btn){
                btn.addEventListener('click', function(){
                  document.querySelectorAll('#trFilterChips .tr-filter-chip').forEach(function(b){
                    b.classList.remove('active');
                    b.style.background = 'var(--bg)'; b.style.color = 'var(--text-soft)'; b.style.border = '1px solid var(--line)';
                  });
                  this.classList.add('active');
                  this.style.background = 'var(--cyan)'; this.style.color = '#fff'; this.style.border = 'none';
                  trFilter = this.getAttribute('data-filter');
                  trCurrentPage = 1;
                  renderTrascrizioni();
                });
              });

              // View toggle
              document.querySelectorAll('.tr-view-btn').forEach(function(btn){
                btn.addEventListener('click', function(){
                  document.querySelectorAll('.tr-view-btn').forEach(function(b){
                    b.classList.remove('active');
                    b.style.background = 'transparent'; b.style.color = 'var(--text-soft)';
                  });
                  this.classList.add('active');
                  this.style.background = 'var(--card)'; this.style.color = 'var(--cyan)';
                  trView = this.getAttribute('data-view');
                  document.getElementById('trTableView').style.display = trView === 'table' ? '' : 'none';
                  document.getElementById('trCardsView').style.display = trView === 'cards' ? '' : 'none';
                  renderTrascrizioni();
                });
              });

              window.trToggleSelectAll = function(cb){
                trSelectedIds = cb.checked ? trAllSessions.map(function(s){ return s.id; }) : [];
                renderTrascrizioni();
              };

              window.trDownloadList = function(){
                if (!trAllSessions.length) return;
                var csv = 'Date,Session,Duration,Words,Language\\n';
                trAllSessions.forEach(function(s){
                  csv += [new Date(s.started_at).toLocaleDateString(), (s.name||''), fmtDuration(s.duration_seconds), s.words_count||'', (s.language_pair||'')].join(',') + '\\n';
                });
                var blob = new Blob([csv], {type:'text/csv'});
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'transcripts.csv'; a.click();
              };

              function getSessionTags(sid){ return trSessionTags[sid] || []; }

              window.renderTrascrizioni = function(){
                var search = (document.getElementById('trSearchInput')||{}).value || '';
                var now = new Date();
                var filtered = trAllSessions.filter(function(s){
                  if (trFilter === 'favorites') return s.favorite;
                  if (trFilter === '7days') { var d = new Date(s.started_at); return (now-d)/86400000 < 7; }
                  if (trFilter === 'en') return (s.language_pair||'').indexOf('en')===0 && (s.language_pair||'').indexOf('→')<0;
                  if (trFilter === 'it') return (s.language_pair||'').indexOf('it')===0 || (s.language_pair||'').indexOf('→it')>0;
                  if (trFilter === 'translated') return (s.language_pair||'').indexOf('→')>0;
                  // Tag filter
                  if (trFilter && trFilter.indexOf('tag:')===0) {
                    var tag = trFilter.substring(4);
                    var tags = getSessionTags(s.id);
                    return tags.indexOf(tag) !== -1;
                  }
                  return true;
                }).filter(function(s){
                  if (!search) return true;
                  var n = ((s.name||'') + ' ' + (s.language_pair||'')).toLowerCase();
                  return n.indexOf(search.toLowerCase()) !== -1;
                });
                // Sort by date desc
                filtered.sort(function(a,b){ return (b.started_at||'').localeCompare(a.started_at||''); });

                var totalPages = Math.ceil(filtered.length / trPerPage);
                if (trCurrentPage > totalPages) trCurrentPage = Math.max(1, totalPages);
                var page = filtered.slice((trCurrentPage-1)*trPerPage, trCurrentPage*trPerPage);

                // Table
                var tbody = document.getElementById('trSessionsBody');
                var empty = document.getElementById('trSessionsEmpty');
                if (!page.length) {
                  tbody.innerHTML = '';
                  empty.style.display = '';
                } else {
                  empty.style.display = 'none';
                  tbody.innerHTML = page.map(function(s){
                    var name = s.name || ('Session ' + new Date(s.started_at).toLocaleDateString('it-IT'));
                    var date = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'}) : '—';
                    var dur = s.duration_seconds ? fmtDuration(s.duration_seconds) : '—';
                    var words = s.words_count || '—';
                    var lang = s.language_pair || (s.session_type==='caption'?'EN':'EN→IT');
                    var checked = trSelectedIds.indexOf(s.id)!==-1;
                    var isFav = s.favorite;
                    var favIcon = isFav ? '★' : '☆';
                    var favColor = isFav ? 'color:#e8b84b' : 'color:var(--text-faint)';
                    var tags = getSessionTags(s.id);
                    var tagsHTML = tags.map(function(t){ return '<span style="display:inline-block;padding:2px 8px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:10px;font-weight:700;border-radius:4px;margin-right:4px;font-family:\\'Manrope\\',sans-serif">'+t+'</span>'; }).join('') || '<span style="font-size:10px;color:var(--text-faint)">—</span>';
                    return '<tr style="border-bottom:1px solid var(--line);transition:background .15s" onmouseover="this.style.background=\\'var(--bg)\\'" onmouseout="this.style.background=\\'\\'">'+
                      '<td style="padding:14px 16px"><input type="checkbox" '+(checked?'checked':'')+' onchange="trToggleSession(\\''+s.id+'\\',this.checked)" style="accent-color:var(--cyan)"></td>'+
                      '<td style="padding:14px 16px;font-size:13px;color:var(--text);white-space:nowrap">'+date+'</td>'+
                      '<td style="padding:14px 16px"><span style="font-weight:600;color:var(--text)">'+name+'</span> <span class="material-symbols-outlined" onclick="event.stopPropagation();trEditName(this,\\''+s.id+'\\')" style="font-size:14px;color:var(--text-soft);cursor:pointer;vertical-align:-2px" title="Rename">edit</span></td>'+
                      '<td style="padding:14px 16px">'+tagsHTML+'</td>'+
                      '<td style="padding:14px 16px;color:var(--text);font-size:13px">'+dur+'</td>'+
                      '<td style="padding:14px 16px;color:var(--text);font-size:13px">'+words+'</td>'+
                      '<td style="padding:14px 16px"><span style="padding:3px 10px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:11px;font-weight:700;border-radius:4px;font-family:\\'Manrope\\',sans-serif">'+lang+'</span></td>'+
                      '<td style="padding:14px 16px;text-align:right;white-space:nowrap"><span onclick="event.stopPropagation();trToggleFav(\\''+s.id+'\\')" style="font-size:16px;cursor:pointer;'+favColor+';margin-right:10px" title="Favorite">'+favIcon+'</span><button onclick="event.stopPropagation();trOpenEditor(\\''+s.id+'\\')" style="font-size:13px;font-weight:700;color:var(--cyan);background:none;border:none;cursor:pointer;font-family:\\'Manrope\\',sans-serif;margin-right:8px">Edit</button><button onclick="event.stopPropagation();trViewSession(\\''+s.id+'\\')" style="font-size:13px;font-weight:600;color:var(--text-soft);background:none;border:none;cursor:pointer">View</button></td>'+
                    '</tr>';
                  }).join('');
                }

                // Cards
                var cardsGrid = document.getElementById('trCardsGrid');
                var cardsEmpty = document.getElementById('trCardsEmpty');
                if (trView === 'cards') {
                  if (!page.length) {
                    cardsGrid.innerHTML = '';
                    cardsEmpty.style.display = '';
                  } else {
                    cardsEmpty.style.display = 'none';
                    cardsGrid.innerHTML = page.map(function(s){
                      var name = s.name || ('Session ' + new Date(s.started_at).toLocaleDateString('it-IT'));
                      var date = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'}) : '—';
                      var dur = s.duration_seconds ? fmtDuration(s.duration_seconds) : '—';
                      var words = s.words_count || '—';
                      var lang = s.language_pair || 'EN';
                      var isFav = s.favorite;
                      var favIcon = isFav ? '★' : '☆';
                      var favColor = isFav ? 'color:#e8b84b' : 'color:var(--text-faint)';
                      var tags = getSessionTags(s.id);
                      var tagsHTML = tags.length ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">'+tags.map(function(t){ return '<span style="padding:2px 8px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:10px;font-weight:700;border-radius:4px;font-family:\\'Manrope\\',sans-serif">'+t+'</span>'; }).join('')+'</div>' : '';
                      return '<div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\'">'+
                        '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">'+
                          '<div style="font-weight:700;color:var(--text);font-size:15px;flex:1">'+name+'</div>'+
                          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'+
                            '<span onclick="event.stopPropagation();trToggleFav(\\''+s.id+'\\')" style="font-size:16px;cursor:pointer;'+favColor+'" title="Favorite">'+favIcon+'</span>'+
                            '<span style="padding:3px 8px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:10px;font-weight:700;border-radius:4px;font-family:\\'Manrope\\',sans-serif;white-space:nowrap">'+lang+'</span>'+
                          '</div>'+
                        '</div>'+
                        '<div style="font-size:12px;color:var(--text-soft);margin-bottom:8px">'+date+'</div>'+
                        tagsHTML+
                        '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-soft);margin-top:10px">'+
                          '<span><span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">schedule</span> '+dur+'</span>'+
                          '<span style="font-weight:500">Words: '+words+'</span>'+﻿
                          '<span onclick="event.stopPropagation();trOpenEditor(\\''+s.id+'\\')" style="margin-left:auto;font-size:12px;font-weight:700;color:var(--cyan);cursor:pointer;font-family:\\'Manrope\\',sans-serif">Edit</span>'+
                          '<span onclick="event.stopPropagation();trViewSession(\\''+s.id+'\\')" style="font-size:12px;font-weight:600;color:var(--text-soft);cursor:pointer;font-family:\\'Manrope\\',sans-serif">View</span>'+
                        '</div>'+
                      '</div>';
                    }).join('');
                  }
                }

                // Pagination
                document.getElementById('trPageInfo').textContent = 'Showing '+(filtered.length?((trCurrentPage-1)*trPerPage+1):0)+' to '+Math.min(trCurrentPage*trPerPage,filtered.length)+' of '+filtered.length+' sessions';
                var pgBtns = document.getElementById('trPageButtons');
                if (totalPages <= 1) { pgBtns.innerHTML = ''; } else {
                  var h = '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft);font-family:inherit" '+(trCurrentPage===1?'disabled':'')+' onclick="trGoPage('+(trCurrentPage-1)+')"><span class="material-symbols-outlined" style="font-size:16px">chevron_left</span></button>';
                  for (var i=1;i<=totalPages;i++){
                    h += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid '+(i===trCurrentPage?'var(--cyan)':'var(--line)')+';border-radius:8px;background:'+(i===trCurrentPage?'var(--cyan)':'none')+';color:'+(i===trCurrentPage?'#fff':'var(--text)')+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit" onclick="trGoPage('+i+')">'+i+'</button>';
                  }
                  h += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft);font-family:inherit" '+(trCurrentPage===totalPages?'disabled':'')+' onclick="trGoPage('+(trCurrentPage+1)+')"><span class="material-symbols-outlined" style="font-size:16px">chevron_right</span></button>';
                  pgBtns.innerHTML = h;
                }

                // Render tag filter chips
                renderTagFilters();
              };

              function renderTagFilters(){
                var el = document.getElementById('trTagFilters');
                var html = '';
                trAllTags.forEach(function(tag){
                  var active = trFilter === 'tag:'+tag;
                  html += '<button data-tag="'+tag+'" style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:'+(active?'var(--cyan)':'var(--bg)')+';color:'+(active?'#fff':'var(--text)')+';border:'+(active?'2px solid var(--cyan)':'2px solid var(--line)')+';border-radius:8px;font-size:12px;font-weight:600;font-family:\\'Manrope\\',sans-serif;cursor:pointer;transition:all .15s" onclick="trFilterByTag(this,\\''+tag+'\\')" onmouseover="if(!this.classList.contains(\\'active\\')){this.style.borderColor=\\'var(--cyan)\\';this.style.color=\\'var(--cyan)\\'}" onmouseout="if(!this.classList.contains(\\'active\\')){this.style.borderColor=\\'var(--line)\\';this.style.color=\\'var(--text)\\'}">'+tag+'</button>';
                });
                el.innerHTML = html;
              }

              window.trFilterByTag = function(btn, tag){
                if (trFilter === 'tag:'+tag) { trFilter = 'all'; }
                else { trFilter = 'tag:'+tag; }
                document.querySelectorAll('#trFilterChips .tr-filter-chip').forEach(function(b){
                  b.classList.remove('active');
                  b.style.background = 'var(--bg)'; b.style.color = 'var(--text-soft)'; b.style.border = '1px solid var(--line)';
                });
                trCurrentPage = 1;
                renderTrascrizioni();
              };

              window.trCreateTag = function(){
                var input = document.getElementById('trNewTagInput');
                var tag = (input.value||'').trim();
                if (!tag) return;
                if (trAllTags.indexOf(tag) !== -1) { alert('Tag already exists.'); return; }
                trAllTags.push(tag);
                saveTags();
                input.value = '';
                renderTrascrizioni();
              };

              // Inline name editing
              window.trEditName = function(el, sid){
                var oldName = el.textContent;
                var input = document.createElement('input');
                input.value = oldName;
                input.style.cssText = 'font-weight:600;color:var(--text);font-size:14px;border:1px solid var(--cyan);border-radius:4px;padding:4px 8px;width:200px;font-family:inherit;background:var(--card)';
                input.onblur = function(){
                  var newName = this.value.trim() || oldName;
                  el.textContent = newName;
                  el.parentNode.replaceChild(el, this);
                  // Save to Supabase
                  var session = trAllSessions.find(function(s){ return s.id === sid; });
                  if (session) { session.name = newName; }
                  if (window.sottotitoliSupabase) {
                    window.sottotitoliSupabase.auth.getSession().then(function(r){
                      if (r.data?.session) {
                        window.sottotitoliSupabase.from('sessions').update({ name: newName }).eq('id', sid).then(function(){});
                      }
                    }).catch(function(){});
                  }
                };
                input.onkeydown = function(e){ if (e.key==='Enter') this.blur(); };
                el.parentNode.replaceChild(input, el);
                input.focus();
                input.select();
              };

              // Editor Panel
              window.trOpenEditor = function(sid){
                var session = trAllSessions.find(function(s){ return s.id === sid; });
                if (!session) return;
                trEditingSession = session;
                var name = session.name || ('Session ' + new Date(session.started_at).toLocaleDateString('it-IT'));
                var date = session.started_at ? new Date(session.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'}) : '—';
                var time = session.started_at ? new Date(session.started_at).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) : '—';
                var dur = session.duration_seconds ? fmtDuration(session.duration_seconds) : '—';
                var words = session.words_count || '—';
                var lang = session.language_pair || 'EN';
                var isFav = session.favorite;
                var favIcon = isFav ? '★' : '☆';
                var favColor = isFav ? '#e8b84b' : 'var(--text-faint)';
                var transcript = (session.transcript_text || '').substring(0, 200);
                if (session.transcript_text && session.transcript_text.length > 200) transcript += '…';
                var tags = getSessionTags(sid);
                var tagsHTML = tags.map(function(t){
                  return '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:rgba(6,182,212,.15);color:var(--cyan);border:1px solid rgba(6,182,212,.3);border-radius:99px;font-size:11px;font-weight:600;font-family:\\'Manrope\\',sans-serif;white-space:nowrap">'+t+'<button onclick="trRemoveTag(\\''+sid+'\\',\\''+t+'\\')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:14px;opacity:.6">&times;</button></span>';
                }).join('');

                var panel = document.getElementById('trEditorPanel');
                var body = document.getElementById('trEditorBody');
                var footer = document.getElementById('trEditorFooter');

                body.innerHTML =
                  '<div style="margin-bottom:20px">'+
                    '<label style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--text-soft);display:block;margin-bottom:6px">Transcript Title</label>'+
                    '<div style="display:flex;align-items:center;gap:8px">'+
                      '<input id="trEditorName" value="'+name.replace(/"/g,'&quot;')+'" style="flex:1;font-size:18px;font-weight:700;color:var(--cyan);border:none;border-bottom:2px solid rgba(6,182,212,.2);padding:4px 0;background:transparent;font-family:inherit;outline:none" onchange="trSaveEditorField(\\'name\\', this.value)">'+
                      '<span onclick="trToggleFav(\\''+sid+'\\')" style="font-size:20px;cursor:pointer;color:'+favColor+';flex-shrink:0" title="Toggle favorite">'+favIcon+'</span>'+
                      '<span class="material-symbols-outlined" onclick="trDeleteSession(\\''+sid+'\\')" style="font-size:18px;color:#E11D48;cursor:pointer;flex-shrink:0" title="Delete">delete</span>'+
                    '</div>'+
                  '</div>'+
                  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">'+
                    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:14px;text-align:center"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft)">Duration</span><div style="font-size:18px;font-weight:700;color:var(--text);margin-top:4px">'+dur+'</div></div>'+
                    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:14px;text-align:center"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft)">Words</span><div style="font-size:18px;font-weight:700;color:var(--text);margin-top:4px">'+words+'</div></div>'+
                    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:14px;text-align:center"><span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft)">Date &amp; Time</span><div style="font-size:13px;font-weight:700;color:var(--text);margin-top:4px;line-height:1.4">'+date+'<br>'+time+'</div></div>'+
                  '</div>'+
                  // Transcription preview — always visible
                  '<div style="margin-bottom:20px"><label style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft);display:block;margin-bottom:6px">Transcript Preview</label><div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--text-soft);line-height:1.6;max-height:120px;overflow-y:auto">'+(transcript || '<span style="color:var(--text-faint);font-style:italic">No transcript available</span>')+'</div></div>'+
                  '<div style="margin-bottom:20px">'+
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
                      '<span style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft)">Tags</span>'+
                      '<div style="display:flex;gap:4px">'+
                        '<select id="trEditorTagSelect" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:11px;font-family:inherit;background:var(--bg);color:var(--text)"><option value="">+ Assign tag</option>'+trAllTags.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('')+'</select>'+
                        '<button onclick="trAssignTag()" style="padding:4px 10px;background:var(--cyan);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;font-family:\\'Manrope\\',sans-serif;cursor:pointer">Add</button>'+
                        '<span id="trEditorInlineTag" style="display:none;padding:4px 10px;border:1px dashed var(--cyan);border-radius:99px;font-size:11px;font-weight:600;font-family:\\'Manrope\\',sans-serif;color:var(--cyan);cursor:text;min-width:60px;white-space:nowrap" contenteditable="true" onkeydown="if(event.key===\\'Enter\\'){event.preventDefault();var t=this.textContent.trim();if(t&&trAllTags.indexOf(t)===-1){trAllTags.push(t);saveTags();var sel=document.getElementById(\\'trEditorTagSelect\\');if(sel){var o=document.createElement(\\'option\\');o.value=t;o.textContent=t;sel.appendChild(o);sel.value=t;trAssignTag()}this.textContent=\\'\\';this.style.display=\\'none\\'}}" onblur="var t=this.textContent.trim();if(t&&trAllTags.indexOf(t)===-1){trAllTags.push(t);saveTags();var sel=document.getElementById(\\'trEditorTagSelect\\');if(sel){var o=document.createElement(\\'option\\');o.value=t;o.textContent=t;sel.appendChild(o);sel.value=t;trAssignTag()}this.textContent=\\'\\';this.style.display=\\'none\\'}" placeholder="New tag..."></span>'+                        '<button onclick="var el=document.getElementById(\\'trEditorInlineTag\\');el.style.display=\\'inline-block\\';el.focus()" style="padding:4px 8px;background:none;color:var(--cyan);border:1px solid var(--cyan);border-radius:6px;font-size:11px;font-weight:600;font-family:\\'Manrope\\',sans-serif;cursor:pointer">+ New</button>'+
                      '</div>'+
                    '</div>'+
                    '<div style="display:flex;flex-wrap:wrap;gap:6px">'+tagsHTML+'</div>'+
                  '</div>'+
                  '<div style="margin-bottom:16px">'+
                    '<label style="font-size:10px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;color:var(--text-soft);display:block;margin-bottom:6px">Language</label>'+
                    '<div style="padding:6px 12px;background:rgba(6,182,212,.1);color:var(--cyan);font-size:12px;font-weight:700;border-radius:4px;display:inline-block;font-family:\\'Manrope\\',sans-serif">'+lang+'</div>'+
                  '</div>';

                footer.innerHTML = '<div style="display:flex;gap:8px"><button onclick="var es=trAllSessions.find(function(x){return x.id===\\''+sid+'\\'});if(es&&es.transcript_text){var txt=transcriptWithTimestamps(es.transcript_text,es.duration_seconds,es.words_count);var b=new Blob([txt],{type:\\'text/plain;charset=utf-8\\'});var a=document.createElement(\\'a\\');a.href=URL.createObjectURL(b);a.download=(es.name||\\'transcript\\').replace(/[^a-z0-9]/gi,\\'_\\')+\\'.txt\\';a.click()}else{alert(\\'No transcript available.\\')}" style="flex:1;padding:14px;background:var(--cyan);color:#fff;border:none;border-radius:8px;font-weight:700;font-family:\\'Manrope\\',sans-serif;cursor:pointer;font-size:13px;text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;justify-content:center;gap:8px"><span class="material-symbols-outlined" style="font-size:18px">download</span> TXT</button><button onclick="trViewSession(\\''+sid+'\\')" style="flex:1;padding:14px;background:var(--card);color:var(--cyan);border:2px solid var(--cyan);border-radius:8px;font-weight:700;font-family:\\'Manrope\\',sans-serif;cursor:pointer;font-size:13px;text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;justify-content:center;gap:8px"><span class="material-symbols-outlined" style="font-size:18px">picture_as_pdf</span> PDF</button></div>';

                panel.style.display = 'flex';
                document.getElementById('trEditorBackdrop').style.display = 'block';
              };

              window.trCreateTagFromEditor = function(){
                var tag = prompt('New tag name:');
                if (!tag || !(tag=tag.trim())) return;
                if (trAllTags.indexOf(tag)!==-1) { alert('Tag already exists.'); return; }
                trAllTags.push(tag);
                saveTags();
                // Auto-assign the new tag to the editing session
                if (trEditingSession) {
                  var tags = getSessionTags(trEditingSession.id);
                  if (tags.indexOf(tag) === -1) { tags.push(tag); trSessionTags[trEditingSession.id] = tags; saveSessionTags(); }
                  trOpenEditor(trEditingSession.id);
                }
                renderTrascrizioni();
              };

              window.trDeleteSession = function(sid){
                if (!confirm('Delete this session? This cannot be undone.')) return;
                trCloseEditor();
                if (window.sottotitoliSupabase) {
                  window.sottotitoliSupabase.auth.getSession().then(function(r){
                    if (r.data?.session) window.sottotitoliSupabase.from('sessions').delete().eq('id', sid).then(function(){});
                    trAllSessions = trAllSessions.filter(function(s){ return s.id !== sid; });
                    renderTrascrizioni();
                  }).catch(function(){});
                }
              };

              window.trCloseEditor = function(){
                document.getElementById('trEditorPanel').style.display = 'none';
                document.getElementById('trEditorBackdrop').style.display = 'none';
                trEditingSession = null;
              };

              window.trAssignTag = function(){
                if (!trEditingSession) return;
                var sel = document.getElementById('trEditorTagSelect');
                var tag = sel.value;
                if (!tag) return;
                var tags = getSessionTags(trEditingSession.id);
                if (tags.indexOf(tag) !== -1) return;
                tags.push(tag);
                trSessionTags[trEditingSession.id] = tags;
                saveSessionTags();
                trOpenEditor(trEditingSession.id);
                renderTrascrizioni();
              };

              window.trRemoveTag = function(sid, tag){
                var tags = getSessionTags(sid);
                trSessionTags[sid] = tags.filter(function(t){ return t !== tag; });
                saveSessionTags();
                trOpenEditor(sid);
                renderTrascrizioni();
              };

              window.trSaveEditorField = function(field, val){
                if (!trEditingSession) return;
                if (field === 'name') {
                  trEditingSession.name = val;
                  if (window.sottotitoliSupabase) {
                    window.sottotitoliSupabase.auth.getSession().then(function(r){
                      if (r.data?.session) window.sottotitoliSupabase.from('sessions').update({ name: val }).eq('id', trEditingSession.id).then(function(){});
                    }).catch(function(){});
                  }
                }
                renderTrascrizioni();
              };

              // Inline name editing via edit icon
              window.trEditName = function(iconEl, sid){
                var row = iconEl.closest('tr');
                var nameSpan = row.querySelector('td:nth-child(3) span');
                if (!nameSpan) return;
                var oldName = nameSpan.textContent;
                var input = document.createElement('input');
                input.value = oldName;
                input.style.cssText = 'font-weight:600;color:var(--text);font-size:14px;border:1px solid var(--cyan);border-radius:4px;padding:4px 8px;width:200px;font-family:inherit;background:var(--card)';
                function saveName(newVal){
                  var finalName = (newVal||'').trim() || oldName;
                  nameSpan.textContent = finalName;
                  if (input.parentNode) input.parentNode.replaceChild(nameSpan, input);
                  if (finalName !== oldName) {
                    var session = trAllSessions.find(function(sess){ return sess.id === sid; });
                    if (session) session.name = finalName;
                    if (window.sottotitoliSupabase) {
                      window.sottotitoliSupabase.auth.getSession().then(function(r){
                        if (r.data?.session) window.sottotitoliSupabase.from('sessions').update({ name: finalName }).eq('id', sid).then(function(){});
                      }).catch(function(){});
                    }
                  }
                }
                input.onblur = function(){ saveName(this.value); };
                input.onkeydown = function(e){ if (e.key==='Enter'){ this.blur(); } if (e.key==='Escape'){ saveName(oldName); } };
                nameSpan.parentNode.replaceChild(input, nameSpan);
                input.focus();
                input.select();
              };

              // Favorite toggle
              window.trToggleFav = function(sid){
                var session = trAllSessions.find(function(s){ return s.id === sid; });
                if (!session) return;
                session.favorite = !session.favorite;
                // Also update the session in allSessions (transcript picker) if present
                if (typeof allSessions !== 'undefined' && allSessions) {
                  var pickerSession = allSessions.find(function(s){ return s.id === sid; });
                  if (pickerSession) pickerSession.favorite = session.favorite;
                }
                if (window.sottotitoliSupabase) {
                  window.sottotitoliSupabase.auth.getSession().then(function(r){
                    if (r.data?.session) window.sottotitoliSupabase.from('sessions').update({ favorite: session.favorite }).eq('id', sid).then(function(){});
                  }).catch(function(){});
                }
                // Update picker star icon inline (if picker modal is built)
                var pickerRow = document.querySelector('#transcriptPickerList label[data-sid="' + sid + '"]');
                if (pickerRow) {
                  var starSpan = pickerRow.querySelector('span[title="Toggle favorite"]');
                  if (starSpan) {
                    starSpan.textContent = session.favorite ? '★' : '☆';
                    starSpan.style.color = session.favorite ? '#f59e0b' : '';
                  }
                }
                renderTrascrizioni();
              };

              // Bulk tag assignment
              window.trBulkAssignTag = function(){
                var sel = document.getElementById('trBulkTagSelect');
                var tag = sel.value;
                if (!tag || !trSelectedIds.length) return;
                trSelectedIds.forEach(function(sid){
                  var tags = getSessionTags(sid);
                  if (tags.indexOf(tag)===-1) { tags.push(tag); trSessionTags[sid] = tags; }
                });
                saveSessionTags();
                sel.value = '';
                renderTrascrizioni();
              };

              // Bulk delete
              window.trBulkDelete = function(){
                if (!trSelectedIds.length) return;
                if (!confirm('Delete '+trSelectedIds.length+' selected session(s)? This cannot be undone.')) return;
                if (window.sottotitoliSupabase) {
                  window.sottotitoliSupabase.auth.getSession().then(function(r){
                    if (!r.data?.session) return;
                    trSelectedIds.forEach(function(sid){
                      window.sottotitoliSupabase.from('sessions').delete().eq('id', sid).then(function(){});
                    });
                    trAllSessions = trAllSessions.filter(function(s){ return trSelectedIds.indexOf(s.id)===-1; });
                    trSelectedIds = [];
                    renderTrascrizioni();
                  }).catch(function(){});
                }
              };

              function updateBulkBar(){
                var bar = document.getElementById('trBulkBar');
                var countEl = document.getElementById('trBulkCount');
                var tagSel = document.getElementById('trBulkTagSelect');
                if (trSelectedIds.length) {
                  bar.style.display = 'flex';
                  countEl.textContent = trSelectedIds.length + ' selected';
                  // Populate tag dropdown
                  tagSel.innerHTML = '<option value="">Tag selected…</option>' + trAllTags.map(function(t){ return '<option value="'+t+'">'+t+'</option>'; }).join('');
                } else {
                  bar.style.display = 'none';
                }
              }

              window.trToggleSession = function(id, checked){
                if (checked) { if (trSelectedIds.indexOf(id)===-1) trSelectedIds.push(id); }
                else { trSelectedIds = trSelectedIds.filter(function(x){ return x!==id; }); }
                updateBulkBar();
              };

              window.trToggleSelectAll = function(cb){
                trSelectedIds = cb.checked ? trAllSessions.map(function(s){ return s.id; }) : [];
                updateBulkBar();
                renderTrascrizioni();
              };

              window.trGoPage = function(p){ trCurrentPage = p; renderTrascrizioni(); };
              // ── Timestamp helper: splits transcript into sentences with estimated [MM:SS] ──
              function fmtTimestamp(sec) {
                var m = Math.floor(sec / 60);
                var s = Math.floor(sec % 60);
                return '[' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + ']';
              }
              function transcriptWithTimestamps(rawText, durationSec, wordCount) {
                if (!rawText) return '';
                if (!durationSec || durationSec <= 0 || !wordCount || wordCount <= 0) return rawText;
                // Split into sentences (. ! ? followed by space or end)
                var sentences = rawText.match(/[^.!?\\n]+[.!?]*(\\s|$)/g) || [rawText];
                if (sentences.length <= 1) return rawText;
                var totalWords = wordCount;
                var secPerWord = durationSec / Math.max(1, totalWords);
                var elapsed = 0;
                return sentences.map(function(sent) {
                  var wc = (sent.trim().match(/\\S+/g) || []).length;
                  var ts = fmtTimestamp(elapsed);
                  elapsed += wc * secPerWord;
                  return ts + '  ' + sent.trim();
                }).join('\\n');
              }

              window.transcriptWithTimestamps = transcriptWithTimestamps;
              window.trViewSession = function(id){
                // Find session directly from trAllSessions (not trEditingSession — that requires opening editor first)
                var s = trAllSessions.find(function(x){ return x.id === id; });
                if (!s) { alert('Session not found.'); return; }
                if (!s.transcript_text) { alert('No transcript available.'); return; }
                var name = s.name || ('Session '+new Date(s.started_at).toLocaleDateString('it-IT'));
                var date = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'}) : '\\u2014';
                var dur = '\\u2014';
                if (s.duration_seconds) { var m = Math.floor(s.duration_seconds/60), sec = s.duration_seconds%60; dur = m+':'+(sec<10?'0':'')+sec; }
                var words = s.words_count || 0;
                var lang = s.language_pair || '\\u2014';
                var tsText = transcriptWithTimestamps(s.transcript_text, s.duration_seconds, s.words_count);
                // Wrap [MM:SS] timestamps in styled spans for visual distinction
                var text = tsText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\[(\\d{2}:\\d{2})\\]/g,'<span class="ts">[$1]</span>').replace(/\\n/g,'<br>');
                var html = '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>'+name+' \\u2014 Sottotitoli.pro</title>'+
                  '<style>body{font-family:Inter,sans-serif;max-width:720px;margin:60px auto;padding:0 24px;color:#111;line-height:1.7}'+
                  '.header{text-align:center;margin-bottom:48px;padding-bottom:32px;border-bottom:2px solid #06b6d4}'+
                  '.logo{font-size:28px;font-weight:800;letter-spacing:-.03em;color:#0891b2;margin:0 0 8px}'+
                  '.logo span{font-weight:900;color:#7c3aed}.title{font-size:22px;font-weight:600;margin:0 0 6px}'+
                  '.meta{display:flex;justify-content:center;gap:32px;font-size:13px;color:#6b7280;margin-top:16px}'+
                  '.meta strong{color:#111}.transcript{white-space:pre-wrap;font-size:15px}'+
                  '.ts{color:#06b6d4;font-weight:600;font-family:\\'JetBrains Mono\\',monospace;font-size:13px;margin-right:12px}'+
                  '.footer{text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af}'+
                  '@media print{body{margin:0;padding:20px}}</style></head><body>'+
                  '<div class="header"><h1 class="logo">sottotitoli<span>.pro</span></h1>'+
                  '<h2 class="title">'+name+'</h2>'+
                  '<div class="meta"><span>'+date+'</span><span><strong>'+dur+'</strong></span><span><strong>'+words+'</strong> parole</span><span>'+lang+'</span></div></div>'+
                  '<div class="transcript">'+text+'</div>'+
                  '<div class="footer">Generated by sottotitoli.pro \\u2014 '+new Date().toLocaleDateString('it-IT')+'</div>'+
                  '</body></html>';
                var w = window.open('','_blank');
                w.document.write(html);
                w.document.close();
              };
              window.trDownloadTranscriptPDF = function(id){
                var s = trEditingSession;
                if (!s || !s.transcript_text) { alert('No transcript available.'); return; }
                var name = s.name || ('Session '+new Date(s.started_at).toLocaleDateString('it-IT'));
                var date = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'}) : '—';
                var dur = '—';
                if (s.duration_seconds) { var m = Math.floor(s.duration_seconds/60), sec = s.duration_seconds%60; dur = m+':'+(sec<10?'0':'')+sec; }
                var words = s.words_count || 0;
                var lang = s.language_pair || '—';
                var text = (s.transcript_text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                var html = '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>'+name+' — Sottotitoli.pro</title>'+
                  '<style>body{font-family:Inter,sans-serif;max-width:720px;margin:60px auto;padding:0 24px;color:#111;line-height:1.7}'+
                  '.header{text-align:center;margin-bottom:48px;padding-bottom:32px;border-bottom:2px solid #06b6d4}'+
                  '.logo{font-size:28px;font-weight:800;letter-spacing:-.03em;color:#0891b2;margin:0 0 8px}'+
                  '.logo span{font-weight:900;color:#7c3aed}.title{font-size:22px;font-weight:600;margin:0 0 6px}'+
                  '.meta{display:flex;justify-content:center;gap:32px;font-size:13px;color:#6b7280;margin-top:16px}'+
                  '.meta strong{color:#111}.transcript{white-space:pre-wrap;font-size:15px}'+
                  '.footer{text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af}'+
                  '@media print{body{margin:0;padding:20px}}</style></head><body>'+
                  '<div class="header"><h1 class="logo">sottotitoli<span>.pro</span></h1>'+
                  '<h2 class="title">'+name+'</h2>'+
                  '<div class="meta"><span>'+date+'</span><span><strong>'+dur+'</strong></span><span><strong>'+words+'</strong> parole</span><span>'+lang+'</span></div></div>'+
                  '<div class="transcript">'+text+'</div>'+
                  '<div class="footer">Generated by sottotitoli.pro — '+new Date().toLocaleDateString('it-IT')+'</div>'+
                  '</body></html>';
                var w = window.open('','_blank');
                w.document.write(html);
                w.document.close();
                setTimeout(function(){ w.print(); }, 500);
              };

              function loadSessions(){
                if (window.SottotitoliData && window.SottotitoliData.getSessions) {
                  window.SottotitoliData.getSessions().then(function(sessions){
                    trAllSessions = sessions || [];
                    renderTrascrizioni();
                  }).catch(function(){});
                } else {
                  setTimeout(loadSessions, 300);
                }
              }
              loadSessions();

              function fmtDuration(sec){
                if (!sec) return '—';
                var m = Math.floor(sec/60), s = sec%60;
                return m+':'+(s<10?'0':'')+s;
              }
            })();
          </script>
        </div>
`;
}

export async function init() {
  var sb = window.sottotitoliSupabase;
  var tableBody = document.getElementById('trTableBody');
  if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">' + (sb ? 'Caricamento sessioni...' : 'Accedi per visualizzare le sessioni.') + '</td></tr>';
  if (sb) loadAndRenderSessions();

  // Filter chips
  var filterChips = document.getElementById('trFilterChips');
  if (filterChips) {
    filterChips.addEventListener('click', function(e) {
      var chip = e.target.closest('.tr-filter-chip');
      if (!chip) return;
      filterChips.querySelectorAll('.tr-filter-chip').forEach(function(c) {
        c.style.background = 'var(--bg)'; c.style.color = 'var(--text-soft)'; c.style.border = '1px solid var(--line)';
      });
      chip.style.background = 'var(--cyan)'; chip.style.color = '#fff'; chip.style.border = 'none';
      loadAndRenderSessions(chip.getAttribute('data-filter'));
    });
  }

  // View toggles (table/cards)
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.tr-view-btn');
    if (!btn) return;
    var mode = btn.getAttribute('data-view');
    var tableWrap = document.getElementById('trTableWrap');
    var cardsWrap = document.getElementById('trCardsWrap');
    if (tableWrap) tableWrap.style.display = mode === 'cards' ? 'none' : '';
    if (cardsWrap) cardsWrap.style.display = mode === 'cards' ? 'flex' : 'none';
    document.querySelectorAll('.tr-view-btn').forEach(function(b) {
      b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
      b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
    });
  });

  // Session viewer modal — delegated
  document.addEventListener('click', function(e) {
    var row = e.target.closest('.tr-session-row');
    if (!row) return;
    var id = row.getAttribute('data-id');
    if (!id) return;
    viewSessionModal(id);
  });

  // Bulk select/delete
  var bulkBar = document.getElementById('trBulkBar');
  var bulkDel = document.getElementById('trBulkDelete');
  var bulkDesel = document.getElementById('trBulkDeselect');
  if (bulkDel) bulkDel.addEventListener('click', bulkDeleteSessions);
  if (bulkDesel) bulkDesel.addEventListener('click', function() {
    document.querySelectorAll('.tr-row-check').forEach(function(cb) { cb.checked = false; });
    updateBulkBar();
  });
}

export function destroy() { container = null; }

// ── Data loading ──
async function loadAndRenderSessions(filter) {
  filter = filter || 'all';
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  var tbody = document.getElementById('trTableBody');
  try {
    var query = sb.from('sessions').select('id, name, created_at, duration_seconds, words_count, wpm, language_pair, transcript_text').order('created_at', { ascending: false }).limit(100);
    if (filter === '7days') query = query.gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
    if (filter === 'en') query = query.ilike('language_pair', 'en%');
    if (filter === 'it') query = query.ilike('language_pair', '%it%');
    var resp = await query;
    if (resp.error) throw resp.error;
    var sessions = resp.data || [];
    renderSessionsTable(sessions);
  } catch(e) { console.error('Sessions load:', e); if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Errore nel caricamento.</td></tr>'; }
}

function renderSessionsTable(sessions) {
  var tbody = document.getElementById('trTableBody');
  if (!tbody) return;
  if (!sessions.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Nessuna sessione trovata.</td></tr>'; return; }
  tbody.innerHTML = sessions.map(function(s) {
    var name = s.name || 'Senza nome';
    var date = s.created_at ? new Date(s.created_at).toLocaleDateString('it-IT', {day:'numeric',month:'short',year:'numeric'}) : '—';
    var dur = s.duration_seconds ? Math.round(s.duration_seconds/60) + 'm' : '—';
    return '<tr class="tr-session-row" data-id="' + s.id + '" style="border-bottom:1px solid var(--line);cursor:pointer;transition:background .15s" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'\'">' +
      '<td style="padding:12px;font-weight:600;color:var(--text)">' + esc(name) + '</td>' +
      '<td style="padding:12px;color:var(--text-soft);white-space:nowrap">' + date + '</td>' +
      '<td style="padding:12px;color:var(--text-soft)">' + esc(s.language_pair || '—') + '</td>' +
      '<td style="padding:12px;color:var(--text-soft)">' + dur + '</td>' +
      '<td style="padding:12px;color:var(--text-soft)">' + (s.words_count || '—') + '</td>' +
      '<td style="padding:12px;color:var(--text-soft)">' + (s.wpm || '—') + '</td>' +
      '</tr>';
  }).join('');
}

function viewSessionModal(id) {
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('sessions').select('*').eq('id', id).single().then(function(r) {
    if (r.error || !r.data) return;
    var s = r.data;
    var transcript = s.transcript_text || 'Nessuna trascrizione disponibile.';
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<div><h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">' + esc(s.name || 'Sessione') + '</h3>' +
      '<p style="margin:4px 0 0;font-size:12px;color:var(--text-soft)">' + (s.words_count||'—') + ' parole · ' + (s.wpm||'—') + ' WPM</p></div>' +
      '<button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim)">&times;</button></div>' +
      '<div style="max-height:60vh;overflow-y:auto;white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)">' + esc(transcript) + '</div></div>';
    modal.addEventListener('click', function(e) { if (e.target === modal || e.target.closest('button')) modal.remove(); });
    document.body.appendChild(modal);
  }).catch(function(e) { console.error('Session view:', e); });
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function updateBulkBar() {
  var checked = document.querySelectorAll('.tr-row-check:checked');
  var bar = document.getElementById('trBulkBar');
  if (bar) bar.style.display = checked.length ? 'flex' : 'none';
  var count = document.getElementById('trBulkCount');
  if (count) count.textContent = checked.length + ' selezionati';
}

async function bulkDeleteSessions() {
  var checked = document.querySelectorAll('.tr-row-check:checked');
  if (!checked.length) return;
  if (!confirm('Eliminare ' + checked.length + ' sessioni?')) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  var ids = Array.from(checked).map(function(cb) { return cb.getAttribute('data-id'); });
  try { for (var i=0;i<ids.length;i++) await sb.from('sessions').delete().eq('id',ids[i]); loadAndRenderSessions(); } catch(e) { console.error(e); }
}
