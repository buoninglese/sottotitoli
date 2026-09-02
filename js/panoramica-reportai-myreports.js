              (function(){
                var tbody = document.getElementById('raiReportsTbody');
                var paginationEl = document.getElementById('raiPagination');
                var REPORTS_PER_PAGE = 10;
                var currentPage = 1;
                var allReports = [];

                function statusBadge(status) {
                  var map = {
                    completed: { label:'Completed', bg:'rgba(16,185,129,.1)', color:'#10B981' },
                    processing: { label:'Processing', bg:'rgba(245,158,11,.1)', color:'#F59E0B', pulse:true },
                    pending: { label:'Pending', bg:'rgba(107,114,128,.1)', color:'var(--text-soft)' },
                    failed: { label:'Failed', bg:'rgba(225,29,72,.1)', color:'#E11D48' }
                  };
                  var s = map[status] || map.pending;
                  var dot = s.pulse ? '<span style="display:inline-block;width:6px;height:6px;background:'+s.color+';border-radius:50%;margin-right:6px;animation:pulse 2s infinite"></span>' : '';
                  return '<span style="display:inline-flex;align-items:center;padding:4px 12px;background:'+s.bg+';color:'+s.color+';font-size:11px;font-weight:700;border-radius:99px;text-transform:uppercase;font-family:\'Manrope\',sans-serif">'+dot+s.label+'</span>';
                }

                function renderTable() {
                  if (!allReports.length) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px">No reports yet. <a href="javascript:void(0)" onclick="document.querySelector(\'[data-subtab=rai-crea]\').click()" style="color:var(--cyan);text-decoration:underline">Generate your first report</a>.</td></tr>';
                    paginationEl.innerHTML = '';
                    return;
                  }
                  var start = (currentPage - 1) * REPORTS_PER_PAGE;
                  var page = allReports.slice(start, start + REPORTS_PER_PAGE);
                  tbody.innerHTML = page.map(function(r){
                    var name = r.summary || r.report_type || 'Report ' + (r.id || '').substring(0,8);
                    var date = r.created_at ? new Date(r.created_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short', year:'numeric'}) : '—';
                    var status = r.status || 'completed';
                    var score = r.overall_score ? r.overall_score + '/10' : '';
                    var isDone = status === 'completed';
                    var isFailed = status === 'failed';
                    return '<tr class="hv-bg" style="border-bottom:1px solid var(--line)">' +
                      '<td style="padding:16px 24px"><div style="font-weight:600">'+name+'</div>'+(score?'<div style="font-size:13px;color:var(--text-soft)">Score: '+score+'</div>':'')+'</td>' +
                      '<td style="padding:16px 24px;color:var(--text-soft);font-size:13px">'+date+'</td>' +
                      '<td style="padding:16px 24px">'+statusBadge(status)+'</td>' +
                      '<td style="padding:16px 24px;text-align:right">' +
                        '<div style="display:flex;justify-content:flex-end;gap:8px">' +
                          (isDone ? '<button title="Download PDF" style="padding:8px;background:none;border:1px solid var(--line);border-radius:8px;cursor:pointer;color:var(--text-soft)" onclick="event.stopPropagation();downloadReportPDF(\''+(r.id||'')+'\')"><span class="material-symbols-outlined" style="font-size:18px">download</span></button>' : '<button disabled style="padding:8px;background:none;border:1px solid var(--line);border-radius:8px;opacity:.3;cursor:not-allowed"><span class="material-symbols-outlined" style="font-size:18px">download</span></button>') +
                          (isDone ? '<button style="padding:6px 16px;background:var(--bg);color:var(--cyan);border:1px solid var(--cyan);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'Manrope\',sans-serif" onclick="event.stopPropagation();viewReportDetail(\''+(r.id||'')+'\')">View</button>' :
                           isFailed ? '<button style="padding:6px 16px;background:none;color:#E11D48;border:1px solid #E11D48;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'Manrope\',sans-serif" onclick="event.stopPropagation();retryReport(\''+(r.id||'')+'\')">Retry</button>' :
                           '<button disabled style="padding:6px 16px;background:none;color:var(--text-soft);border:1px solid var(--line);border-radius:8px;font-size:13px;opacity:.5;cursor:not-allowed;font-family:\'Manrope\',sans-serif">Pending</button>') +
                        '</div>' +
                      '</td>' +
                    '</tr>';
                  }).join('');

                  // Pagination
                  var totalPages = Math.ceil(allReports.length / REPORTS_PER_PAGE);
                  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
                  var html = '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft)" '+(currentPage===1?'disabled style="opacity:.3"':'onclick="void(0)"')+'><span class="material-symbols-outlined" style="font-size:18px">chevron_left</span></button>';
                  for (var i=1;i<=totalPages;i++){
                    html += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid '+(i===currentPage?'var(--cyan)':'var(--line)')+';border-radius:8px;background:'+(i===currentPage?'var(--cyan)':'none')+';color:'+(i===currentPage?'#fff':'var(--text)')+';font-size:13px;font-weight:600;cursor:pointer" data-page="'+i+'">'+i+'</button>';
                  }
                  html += '<button style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;background:none;cursor:pointer;color:var(--text-soft)" '+(currentPage===totalPages?'disabled style="opacity:.3"':'')+'><span class="material-symbols-outlined" style="font-size:18px">chevron_right</span></button>';
                  paginationEl.innerHTML = html;
                }

                function updateStats() {
                  var total = allReports.length;
                  var completed = allReports.filter(function(r){ return r.status === 'completed'; }).length;
                  var scores = allReports.filter(function(r){ return r.overall_score; }).map(function(r){ return r.overall_score; });
                  var avg = scores.length ? (scores.reduce(function(a,b){return a+b;},0)/scores.length).toFixed(1) : '—';
                  var elTotal = document.getElementById('raiStatTotal'); if (elTotal) elTotal.textContent = total;
                  var elCompleted = document.getElementById('raiStatCompleted'); if (elCompleted) elCompleted.textContent = completed;
                  var elAvg = document.getElementById('raiStatAvg'); if (elAvg) elAvg.textContent = avg !== '—' ? avg + '/10' : '—';
                }

                function loadReports() {
                  if (window.reports && window.reports.length) {
                    allReports = window.reports;
                  }
                  // Also try SottotitoliData
                  if (window.SottotitoliData && window.SottotitoliData.getAIReports) {
                    window.SottotitoliData.getAIReports().then(function(data){
                      allReports = data || [];
                      updateStats();
                      renderTable();
                    }).catch(function(){
                      updateStats();
                      renderTable();
                    });
                  } else {
                    updateStats();
                    renderTable();
                  }
                }

                // Pagination click delegation
                paginationEl.addEventListener('click', function(e){
                  var btn = e.target.closest('button');
                  if (!btn || btn.disabled) return;
                  var page = parseInt(btn.getAttribute('data-page'));
                  if (page) { currentPage = page; renderTable(); return; }
                  var icon = btn.querySelector('.material-symbols-outlined');
                  if (icon && icon.textContent === 'chevron_left') { if (currentPage>1) { currentPage--; renderTable(); } }
                  if (icon && icon.textContent === 'chevron_right') { var tp=Math.ceil(allReports.length/REPORTS_PER_PAGE); if (currentPage<tp) { currentPage++; renderTable(); } }
                });

                // View report detail — opens a modal with the full report
                window.viewReportDetail = function(id) {
                  var report = allReports.find(function(r){ return r.id == id; });
                  if (!report) { appAlert('Report non trovato.', 'Report non trovato', '📄'); return; }
                  var summary = report.summary || report.summary_text || 'Nessun contenuto disponibile.';
                  var score = report.overall_score || report.confidence || 'N/A';
                  var date = report.created_at ? new Date(report.created_at).toLocaleString('it-IT') : '—';
                  var status = report.status || 'completed';
                  var content = '<div style="font-family:Inter,sans-serif;max-height:70vh;overflow-y:auto;padding:8px">' +
                    '<p style="font-size:13px;color:var(--text-dim);margin:0 0 4px">Report ID: ' + id + ' · ' + date + '</p>' +
                    '<p style="font-size:13px;color:var(--text-dim);margin:0 0 16px">Status: ' + status + ' · Score: ' + score + '</p>' +
                    '<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:var(--text);background:var(--bg);padding:16px;border-radius:12px;border:1px solid var(--line)">' + escapeHtml(summary) + '</div>' +
                  '</div>';
                  showModal('Report Detail', content);
                };
                window.retryReport = function(id) {
                  appConfirm('Riprova questo report? I crediti verranno dedotti nuovamente.', function(){
                    var sb = window.sottotitoliSupabase;
                    if (!sb) return;
                    sb.auth.getSession().then(async function(r){
                      if (!r.data?.session) return;
                      var uid = r.data.session.user.id;
                      // Reset the request status to queued
                      await sb.from('ai_report_requests').update({ status: 'queued' }).eq('id', id).eq('user_id', uid);
                      // Delete the old report
                      await sb.from('session_ai_reports').delete().eq('request_id', id);
                      showToastMsg('🔄 Report re-queued. Controlla tra poco.');
                      loadReports();
                    }).catch(function(e){ console.warn('retryReport:', e); });
                  }, 'Riprova report', '🔄');
                };

                // ── Simple modal helper (if not already defined) ──
                window.showModal = function(title, content) {
                  var existing = document.getElementById('raiDetailModal');
                  if (existing) existing.remove();
                  var modal = document.createElement('div');
                  modal.id = 'raiDetailModal';
                  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px';
                  modal.innerHTML = '<div style="background:var(--card);border:2px solid var(--line);border-radius:20px;padding:28px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.4)">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
                      '<h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text)">' + title + '</h3>' +
                      '<button onclick="this.closest(\'#raiDetailModal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-dim);padding:4px 8px">&times;</button>' +
                    '</div>' +
                    content +
                  '</div>';
                  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
                  document.body.appendChild(modal);
                };

                function escapeHtml(str) {
                  if (!str) return '';
                  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                }

                // ── PDF Download ──
                window.downloadReportPDF = function(id) {
                  var report = allReports.find(function(r){ return r.id == id; });
                  if (!report) { appAlert('Report non trovato.', 'Report non trovato', '📄'); return; }
                  var summary = report.summary || report.summary_text || '';
                  var score = report.overall_score || '';
                  var date = report.created_at ? new Date(report.created_at).toLocaleDateString('it-IT') : '';
                  // Build a simple HTML doc and trigger print-to-PDF
                  var w = window.open('', '_blank', 'width=800,height=600');
                  if (!w) { appAlert('Popup bloccato. Consenti i popup per scaricare il PDF.', 'Popup bloccato', '⚠️'); return; }
                  w.document.write('<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Report AI - Sottotitoli</title>');
                  w.document.write('<style>body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#111;line-height:1.7}' +
                    'h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;color:#666;margin:0 0 20px}.meta{font-size:13px;color:#888;margin-bottom:24px}' +
                    '.content{white-space:pre-wrap;font-size:15px;border-top:1px solid #ddd;padding-top:20px}' +
                    '@media print{body{margin:0;padding:20px}}</style>');
                  w.document.write('</head><body>');
                  w.document.write('<h1>🤖 Report AI</h1><h2>Sottotitoli — Analisi Linguistica</h2>');
                  w.document.write('<div class="meta">Generato: ' + date + (score ? ' · Score: ' + score : '') + ' · ID: ' + id + '</div>');
                  w.document.write('<div class="content">' + escapeHtml(summary) + '</div>');
                  w.document.write('<p style="margin-top:40px;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:12px">Powered by Sottotitoli AI · sottotitoli.ai</p>');
                  w.document.write('</body></html>');
                  w.document.close();
                  setTimeout(function(){ w.print(); }, 500);
                };

                // Load on tab activation
                var observer = new MutationObserver(function(mutations){
                  mutations.forEach(function(m){
                    if (m.target.id === 'sub-rai-miei' && m.target.classList.contains('active')) {
                      loadReports();
                    }
                  });
                });
                var subRaiMiei = document.getElementById('sub-rai-miei');
                if (subRaiMiei) {
                  observer.observe(subRaiMiei, { attributes: true, attributeFilter: ['class'] });
                  // Also reload when renderAIReports() dispatches fresh data
                  subRaiMiei.addEventListener('reports-loaded', function(){ loadReports(); });
                }

                // Initial load
                loadReports();
              })();
