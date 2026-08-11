// js/panoramica/panels/grammar-hub.js — pnl-grammar-hub panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-grammar-hub">
          <section class="panel-head"><h2>Grammar Hub</h2></section>
          <section class="panel-tabs"><div class="tabs" role="tablist">
            <button role="tab" aria-selected="true" class="tab-link active" data-subtab="gh-dashboard" style="color:var(--cyan)" data-i18n="gram_dashboard">Dashboard</button>
            <button role="tab" aria-selected="false" class="tab-link" data-subtab="gh-explorer" data-i18n="gram_explorer">Explorer</button>
            <button role="tab" aria-selected="false" class="tab-link" data-subtab="gh-strategy" style="color:var(--accent-purple)" data-i18n="gram_strategy">Learning Strategy</button>
          </div></section>
          <!-- Dashboard subtab -->
          <div role="tabpanel" class="subtab-pane active" id="sub-gh-dashboard">

            

<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Strategic Intervention Timeline</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Calendario automatico degli interventi basato sui tuoi errori ricorrenti, in quattro fasi progressive.</p>
    </div>
    <div>
<!-- Strategic Intervention Timeline -->
            <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px 28px;margin-bottom:28px;position:relative;overflow:hidden">
              <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:28px">
                <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;font-family:'Manrope',sans-serif;padding:4px 12px;background:var(--bg);border-radius:99px">Automated Schedule</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;position:relative;padding:0 12px">
                <div style="position:absolute;height:2px;width:calc(100% - 48px);background:var(--line);top:50%;left:24px;transform:translateY(-50%)"></div>
                <!-- Phase 01 -->
                <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center">
                  <div style="width:44px;height:44px;border-radius:50%;background:rgba(16,185,129,.1);border:2px solid #10B981;display:flex;align-items:center;justify-content:center;margin-bottom:10px">
                    <span class="material-symbols-outlined" style="font-size:22px;color:#10B981">check_circle</span>
                  </div>
                  <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:'Manrope',sans-serif;letter-spacing:.04em;margin-bottom:2px">Phase 01</span>
                  <span style="font-size:11px;font-weight:700;color:var(--text)">Detection</span>
                </div>
                <!-- Phase 02 — Current -->
                <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center">
                  <div style="width:44px;height:44px;border-radius:50%;background:var(--cyan);display:flex;align-items:center;justify-content:center;margin-bottom:10px;box-shadow:0 4px 16px rgba(6,182,212,.4)">
                    <span class="material-symbols-outlined" style="font-size:22px;color:#fff">psychology</span>
                  </div>
                  <span style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;font-family:'Manrope',sans-serif;letter-spacing:.04em;margin-bottom:2px">Current</span>
                  <span style="font-size:11px;font-weight:700;color:var(--text)">Pattern Mapping</span>
                </div>
                <!-- Phase 03 -->
                <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;opacity:.5">
                  <div style="width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--line);display:flex;align-items:center;justify-content:center;margin-bottom:10px">
                    <span class="material-symbols-outlined" style="font-size:22px;color:var(--text-soft)">model_training</span>
                  </div>
                  <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:'Manrope',sans-serif;letter-spacing:.04em;margin-bottom:2px">Phase 03</span>
                  <span style="font-size:11px;font-weight:700;color:var(--text-soft)">Active Drill</span>
                </div>
                <!-- Phase 04 -->
                <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;opacity:.5">
                  <div style="width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--line);display:flex;align-items:center;justify-content:center;margin-bottom:10px">
                    <span class="material-symbols-outlined" style="font-size:22px;color:var(--text-soft)">verified</span>
                  </div>
                  <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:'Manrope',sans-serif;letter-spacing:.04em;margin-bottom:2px">Phase 04</span>
                  <span style="font-size:11px;font-weight:700;color:var(--text-soft)">Validation</span>
                </div>
              </div>
            </div>
    </div>
  </div>
</section>



<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Training Queue</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Elenco degli argomenti grammaticali in fase di allenamento attivo, con priorità e stato di padronanza.</p>
    </div>
    <div>
<!-- Training Queue Table -->
            <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:28px">
              <div style="padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px">
                <span class="material-symbols-outlined" style="color:var(--cyan)">analytics</span>
                <div>
                  <p style="font-size:13px;color:var(--text-soft);margin:0">Pattern attivi in allenamento</p>
                </div>
              </div>
              <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr style="border-bottom:1px solid var(--line)">
                      <th style="padding:12px 20px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;text-align:left">Grammar Point</th>
                      <th style="padding:12px 20px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;text-align:left">Start</th>
                      <th style="padding:12px 20px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;text-align:left">Priority</th>
                      <th style="padding:12px 20px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;text-align:left">Mastery</th>
                      <th style="padding:12px 20px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;text-align:left">Next Review</th>
                    </tr>
                  </thead>
                  <tbody id="ghTrainingBody" style="font-size:13px">
                    <tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text-faint)">Caricamento…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
    </div>
  </div>
</section>



<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Precision Strategy</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Cluster di errori rilevati e strategia di intervento personalizzata per ridurre le ricadute.</p>
    </div>
    <div>
<!-- Error Clusters Grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px" id="ghClusters"></div>

            
<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Sonic Precision Strategy</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Consiglio personalizzato basato sull'attività recente per migliorare la precisione grammaticale.</p>
    </div>
    <div>
<!-- Recommendation -->
            <div style="background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:28px;position:relative;overflow:hidden;margin-bottom:12px">
              <div style="position:absolute;top:0;right:0;padding:20px;opacity:.06;pointer-events:none">
                <span class="material-symbols-outlined" style="font-size:120px">psychology</span>
              </div>
              <div style="position:relative;z-index:1;max-width:560px">
                
                <p style="font-size:13px;color:var(--text-soft);margin:0 0 20px;line-height:1.6">Dall'attività recente, abbiamo rilevato <strong>collisioni frequenti</strong> tra subordinate inglesi e congiuntivo italiano. Dai priorità all'allenamento mirato per ridurre la frequenza di ricaduta.</p>
                <button style="padding:12px 28px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;text-transform:uppercase;letter-spacing:.04em" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(6,182,212,.35)'" onmouseout="this.style.transform='';this.style.boxShadow=''">Start Priority Intervention</button>
              </div>
            </div>

            <script>
              (function(){
                var clusters = [
                  { name:'Subjunctive Mood', desc:'Uso incoerente nelle subordinate che esprimono desiderio/dubbio.', hits:15, trend:-12, intensity:'4.8/hr', relapse:'High', priority:'critical', pct:68, start:'Oct 12', review:'Oggi' },
                  { name:'Pronoun Placement', desc:'Disallineamento dei pronomi combinati diretti/indiretti.', hits:12, trend:4, intensity:'2.1/hr', relapse:'Med', priority:'high', pct:42, start:'Oct 15', review:'Tomorrow' },
                  { name:'Passive Voice', desc:'Costruzione passiva in contesti non appropriati.', hits:8, trend:2, intensity:'1.5/hr', relapse:'Low', priority:'medium', pct:15, start:'Oct 20', review:'Oct 28' },
                  { name:'Conditional Tense', desc:'Confusione tra condizionale presente e passato.', hits:6, trend:-3, intensity:'0.8/hr', relapse:'Low', priority:'medium', pct:8, start:'Oct 22', review:'Oct 30' }
                ];
                var priorityColors = { critical:'#E11D48', high:'#F59E0B', medium:'var(--text-soft)', low:'var(--text-soft)' };
                var priorityBg = { critical:'rgba(225,29,72,.1)', high:'rgba(245,158,11,.1)', medium:'var(--bg)', low:'var(--bg)' };

                // Render training table
                var tbody = document.getElementById('ghTrainingBody');
                if (tbody) {
                  tbody.innerHTML = clusters.map(function(c){
                    return '<tr style="border-bottom:1px solid var(--line);transition:background .15s" onmouseover="this.style.background=\\'var(--bg)\\'" onmouseout="this.style.background=\\'\\'">'+
                      '<td style="padding:14px 20px;font-weight:600;color:var(--text)">'+c.name+'</td>'+
                      '<td style="padding:14px 20px;color:var(--text-soft)">'+c.start+', 2023</td>'+
                      '<td style="padding:14px 20px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;font-family:\\'Manrope\\',sans-serif;text-transform:uppercase;letter-spacing:.04em;color:'+priorityColors[c.priority]+';background:'+priorityBg[c.priority]+';border:1px solid '+priorityColors[c.priority]+'">'+c.priority+'</span></td>'+
                      '<td style="padding:14px 20px"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;height:3px;background:var(--line);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+c.pct+'%;background:var(--cyan);border-radius:2px"></div></div><span style="font-size:11px;font-weight:700;color:var(--cyan);font-family:\\'Manrope\\',sans-serif">'+c.pct+'%</span></div></td>'+
                      '<td style="padding:14px 20px;font-weight:600;color:'+(c.review==='Oggi'?'#E11D48':'var(--text-soft)')+'">'+c.review+'</td>'+
                    '</tr>';
                  }).join('');
                }

                // Render clusters
                var clustersEl = document.getElementById('ghClusters');
                if (clustersEl) {
                  clustersEl.innerHTML = clusters.slice(0,2).map(function(c){
                    var trendIcon = c.trend >= 0 ? 'trending_up' : 'trending_down';
                    var trendColor = c.trend >= 0 ? '#10B981' : '#E11D48';
                    var trendSign = c.trend >= 0 ? '+' : '';
                    var isCritical = c.priority === 'critical';
                    var accentColor = isCritical ? '#E11D48' : '#F59E0B';
                    var gradientDir = isCritical ? 'rgba(225,29,72,.06)' : 'rgba(245,158,11,.06)';
                    var fillBtnStyle = isCritical
                      ? 'padding:10px;border-radius:10px;border:none;background:var(--cyan);color:#fff;cursor:pointer;font-size:12px;font-weight:600;font-family:\\'Manrope\\',sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;box-shadow:0 2px 8px rgba(6,182,212,.25)'
                      : 'padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;font-size:12px;font-weight:600;font-family:\\'Manrope\\',sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s';
                    var fillBtnHover = isCritical
                      ? ' onmouseover="this.style.transform=\\'translateY(-2px)\\';this.style.boxShadow=\\'0 4px 14px rgba(6,182,212,.4)\\'" onmouseout="this.style.transform=\\'\\';this.style.boxShadow=\\'0 2px 8px rgba(6,182,212,.25)\\'"'
                      : ' onmouseover="this.style.borderColor=\\'var(--cyan)\\';this.style.color=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\';this.style.color=\\'var(--text)\\'"';
                    return '<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:all .2s;display:flex;flex-direction:column" onmouseover="this.style.transform=\\'translateY(-2px)\\';this.style.boxShadow=\\'0 8px 24px rgba(0,0,0,.08)\\'" onmouseout="this.style.transform=\\'\\';this.style.boxShadow=\\'\\'">'+
                      '<div style="padding:20px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(135deg,'+gradientDir+' 0%,transparent 100%)">'+
                        '<div>'+
                          '<span style="font-size:9px;font-weight:700;color:'+accentColor+';text-transform:uppercase;letter-spacing:.06em;font-family:\\'Manrope\\',sans-serif;display:flex;align-items:center;gap:4px;margin-bottom:6px"><span class="material-symbols-outlined" style="font-size:14px">'+(isCritical?'priority_high':'warning')+'</span>'+(isCritical?'Critical Cluster':'Systematic Pattern')+'</span>'+
                          '<h3 style="font-size:22px;font-weight:800;color:var(--text);margin:0 0 4px;letter-spacing:-.01em">'+c.name+'</h3>'+
                          '<p style="font-size:12px;color:var(--text-soft);margin:0">'+c.desc+'</p>'+
                        '</div>'+
                        '<div style="text-align:right;flex-shrink:0"><div style="font-size:32px;font-weight:800;color:var(--text)">'+c.hits+'</div><div style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:\\'Manrope\\',sans-serif">Total Hits</div></div>'+
                      '</div>'+
                      '<div style="display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line)">'+
                        '<div style="background:var(--card);padding:14px;text-align:center;border-right:1px solid var(--line)"><div style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:\\'Manrope\\',sans-serif;margin-bottom:4px">Accuracy Trend</div><div style="font-weight:700;color:'+trendColor+';display:flex;align-items:center;justify-content:center;gap:4px"><span class="material-symbols-outlined" style="font-size:14px">'+trendIcon+'</span>'+trendSign+c.trend+'%</div></div>'+
                        '<div style="background:var(--card);padding:14px;text-align:center;border-right:1px solid var(--line)"><div style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:\\'Manrope\\',sans-serif;margin-bottom:4px">Training Intensity</div><div style="font-weight:700;color:var(--text)">'+c.intensity+'</div></div>'+
                        '<div style="background:var(--card);padding:14px;text-align:center"><div style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:\\'Manrope\\',sans-serif;margin-bottom:4px">Relapse Freq.</div><div style="font-weight:700;color:'+(c.relapse==='High'?'#E11D48':c.relapse==='Med'?'#F59E0B':'var(--text-soft)')+'">'+c.relapse+'</div></div>'+
                      '</div>'+
                      '<div style="padding:16px 24px;background:var(--bg);display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:1">'+
                        '<button style="padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;font-size:12px;font-weight:600;font-family:\\'Manrope\\',sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s" onmouseover="this.style.borderColor=\\'var(--cyan)\\';this.style.color=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\';this.style.color=\\'var(--text)\\'"><span class="material-symbols-outlined" style="font-size:20px">menu_book</span>Learn</button>'+
                        '<button style="padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;font-size:12px;font-weight:600;font-family:\\'Manrope\\',sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s" onmouseover="this.style.borderColor=\\'var(--cyan)\\';this.style.color=\\'var(--cyan)\\'" onmouseout="this.style.borderColor=\\'var(--line)\\';this.style.color=\\'var(--text)\\'"><span class="material-symbols-outlined" style="font-size:20px">fitness_center</span>Train</button>'+
                        '<button style="'+fillBtnStyle+'"'+fillBtnHover+'><span class="material-symbols-outlined" style="font-size:20px">verified</span>Test</button>'+
                      '</div>'+
                    '</div>';
                  }).join('');
                }
              })();
            </script>
    </div>
  </div>
</section>

</div>
          <!-- Explorer subtab -->
          <div role="tabpanel" class="subtab-pane" id="sub-gh-explorer">

            
<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Diagnostic Focus Areas</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Aree grammaticali da monitorare e analizzare in base ai tuoi pattern di errore.</p>
    </div>
    <div>
<!-- Diagnostic Focus Areas -->
            <div style="margin-bottom:28px">
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:700;font-family:'Manrope',sans-serif;background:var(--cyan);color:#fff;cursor:pointer">Subjunctive Mood</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Direct Objects</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Prepositions</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Auxiliary Verbs</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Pronoun Placement</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Passive Voice</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Conditional Tense</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Gerunds</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Articles</span>
                <span style="padding:8px 18px;border-radius:99px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;border:1px solid var(--line);color:var(--text);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'">Relative Clauses</span>
              </div>
            </div>
    </div>
  </div>
</section>

<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Diagnostic &amp; Predictive Analytics</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Modellazione avanzata dei pattern e previsione del livello di padronanza.</p>
    </div>
    <div>
<!-- Diagnostic & Predictive Analytics -->
            <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:28px">
              <div style="padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:12px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;font-family:'Manrope',sans-serif;letter-spacing:.04em">Active Pattern:</span>
                  <select style="padding:5px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer">
                    <option selected>Subjunctive Mood</option>
                    <option>Pronoun Placement</option>
                    <option>Prepositions</option>
                  </select>
                </div>
              </div>
              <div style="padding:24px 28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
                <!-- Column 1: Training Parameters -->
                <div style="display:flex;flex-direction:column;gap:16px">
                  <h3 style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0">Training Parameters</h3>
                  <div style="display:flex;flex-direction:column;gap:12px">
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px"><span style="font-size:12px;font-weight:600;color:var(--text)">Training Intensity</span><span style="font-size:12px;font-weight:700;color:var(--cyan)">4.8/hr</span></div>
                      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden"><div style="height:100%;background:var(--cyan);width:80%;border-radius:2px"></div></div>
                    </div>
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px"><span style="font-size:12px;font-weight:600;color:var(--text)">Cognitive Interference</span><span style="font-size:12px;font-weight:700;color:#E11D48">High</span></div>
                      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden"><div style="height:100%;background:#E11D48;width:74%;border-radius:2px"></div></div>
                    </div>
                    <div>
                      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px"><span style="font-size:12px;font-weight:600;color:var(--text)">Pattern Persistence</span><span style="font-size:12px;font-weight:700;color:#F59E0B">Medium</span></div>
                      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden"><div style="height:100%;background:#F59E0B;width:55%;border-radius:2px"></div></div>
                    </div>
                  </div>
                  <div style="margin-top:8px;padding:14px 16px;background:rgba(6,182,212,.05);border:1px solid rgba(6,182,212,.12);border-radius:10px">
                    <p style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.04em;font-family:'Manrope',sans-serif;margin:0 0 8px">Current Momentum</p>
                    <div style="display:flex;align-items:center;gap:12px">
                      <div style="position:relative;width:52px;height:52px;flex-shrink:0">
                        <svg viewBox="0 0 56 56" style="transform:rotate(-90deg);width:100%;height:100%">
                          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"/>
                          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--cyan)" stroke-width="4" stroke-dasharray="150.8" stroke-dashoffset="45.2"/>
                        </svg>
                        <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--cyan)">70%</span>
                      </div>
                      <div><p style="font-size:11px;font-weight:600;color:var(--text);margin:0">Target Frequency</p><p style="font-size:10px;color:var(--text-soft);margin:2px 0 0">+12% vs last week</p></div>
                    </div>
                  </div>
                </div>
                <!-- Column 2: Strategic Importance -->
                <div style="display:flex;flex-direction:column;gap:16px;border-left:1px solid var(--line);border-right:1px solid var(--line);padding:0 24px">
                  <h3 style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0">Strategic Importance</h3>
                  <div style="display:flex;flex-direction:column;gap:12px">
                    <div style="display:flex;gap:10px;align-items:flex-start">
                      <span class="material-symbols-outlined" style="color:var(--cyan);font-size:18px">target</span>
                      <div><p style="font-size:11px;font-weight:600;color:var(--text);margin:0 0 2px">Short-term Objective</p><p style="font-size:11px;color:var(--text-soft);margin:0">Crucial for passing the B2 Speaking Diagnostic.</p></div>
                    </div>
                    <div style="display:flex;gap:10px;align-items:flex-start">
                      <span class="material-symbols-outlined" style="color:var(--cyan);font-size:18px">verified_user</span>
                      <div><p style="font-size:11px;font-weight:600;color:var(--text);margin:0 0 2px">Long-term Objective</p><p style="font-size:11px;color:var(--text-soft);margin:0">Essential for achieving native-level nuance in professional correspondence.</p></div>
                    </div>
                  </div>
                  <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--line)">
                    <p style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.04em;font-family:'Manrope',sans-serif;margin:0 0 4px">Projected Stability</p>
                    <div style="font-size:18px;font-weight:700;color:#10B981">Nov 18 - Nov 24</div>
                    <p style="font-size:10px;color:var(--text-soft);margin:2px 0 0">Based on current session velocity</p>
                  </div>
                </div>
                <!-- Column 3: Path to Mastery -->
                <div style="display:flex;flex-direction:column;gap:16px">
                  <h3 style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0">Path to Mastery</h3>
                  <div style="position:relative;height:140px;border:1px solid var(--line);border-radius:10px;padding:16px;background-image:radial-gradient(circle at 2px 2px,rgba(0,0,0,.03) 1px,transparent 0);background-size:24px 24px">
                    <svg style="width:100%;height:100%" viewBox="0 0 200 100">
                      <path d="M 10 80 Q 100 70 190 40" fill="none" stroke="var(--line)" stroke-dasharray="4 2" stroke-width="2"/>
                      <path d="M 10 80 Q 80 40 190 10" fill="none" stroke="var(--cyan)" stroke-width="3"/>
                      <circle cx="10" cy="80" fill="#E11D48" r="4"/>
                      <circle cx="190" cy="10" fill="#10B981" r="4"/>
                    </svg>
                    <div style="position:absolute;bottom:8px;left:12px">
                      <div style="font-size:8px;font-weight:600;color:var(--text-soft)">Current Trajectory</div>
                      <div style="font-size:8px;font-weight:600;color:var(--cyan)">Accelerated (+20% focus)</div>
                    </div>
                  </div>
                  <div style="padding:14px 16px;background:var(--bg);border-radius:10px">
                    <p style="font-size:11px;font-weight:600;color:var(--text);margin:0 0 2px">Mastery Forecast Logic</p>
                    <p style="font-size:10px;color:var(--text-soft);margin:0;line-height:1.5">Increasing study frequency by <strong>+20% weekly focus</strong> shifts the stability date forward by 6 days.</p>
                  </div>
                </div>
              </div>
            </div>
    </div>
  </div>
</section>

<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Grammar Mastery</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Livello di padronanza per struttura grammaticale, con spiegazioni ed esempi comparativi.</p>
    </div>
    <div>
<!-- Grammar Mastery Card -->
            <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:28px">
              <div style="padding:28px 32px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,rgba(6,182,212,.04),transparent)">
                <div style="display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:24px">
                  <div style="display:flex;gap:8px">
                    <button style="padding:10px 20px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s" onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'" onmouseout="this.style.borderColor='var(--line)';this.style.color='var(--text)'"><span class="material-symbols-outlined" style="font-size:16px">picture_as_pdf</span> Download A4</button>
                    <button style="padding:10px 24px;border:none;border-radius:10px;background:var(--cyan);color:#fff;font-size:12px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(6,182,212,.3)" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''"><span class="material-symbols-outlined" style="font-size:16px">play_circle</span> Practice Now</button>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
                  <div style="display:flex;flex-direction:column;gap:16px">
                    <div>
                      <h3 style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0 0 10px">Explanation</h3>
                      <p style="font-size:13px;color:var(--text);line-height:1.7;margin:0">In Italian, the subjunctive (<em>congiuntivo</em>) is used to express <strong>subjectivity</strong>. Unlike the indicative, which deals with facts, the subjunctive is the mood of doubt, uncertainty, fear, desire, or personal opinion.</p>
                    </div>
                    <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:18px 20px">
                      <h3 style="font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0 0 12px">Linguistic Formula</h3>
                      <div style="font-size:12px;font-family:'JetBrains Mono',monospace;display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:var(--text)">
                        <span style="padding:4px 8px;background:var(--card);border:1px solid var(--line);border-radius:6px">[Subject 1]</span>
                        <span style="font-weight:700;color:var(--cyan)">+</span>
                        <span style="padding:4px 8px;background:var(--card);border:1px solid var(--line);border-radius:6px">[Verb of Doubt/Emotion]</span>
                        <span style="font-weight:700;color:var(--cyan)">+</span>
                        <span style="font-weight:700;text-decoration:underline;text-decoration-thickness:2px">che</span>
                        <span style="font-weight:700;color:var(--cyan)">+</span>
                        <span style="padding:4px 8px;background:var(--card);border:1px solid var(--line);border-radius:6px">[Subject 2]</span>
                        <span style="font-weight:700;color:var(--cyan)">+</span>
                        <span style="padding:4px 8px;background:var(--cyan);color:#fff;border-radius:6px">[Subjunctive Verb]</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0 0 14px">Step-by-Step Logic</h3>
                    <div style="display:flex;flex-direction:column;gap:12px">
                      <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:32px;height:32px;border-radius:50%;background:var(--cyan);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;flex-shrink:0">1</div>
                        <div><p style="font-weight:600;color:var(--text);margin:0 0 2px;font-size:13px">Identify the trigger verb</p><p style="font-size:11px;color:var(--text-soft);margin:0">Look for verbs like <em>pensare, credere, volere, sperare</em>.</p></div>
                      </div>
                      <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:32px;height:32px;border-radius:50%;background:var(--cyan);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;flex-shrink:0">2</div>
                        <div><p style="font-weight:600;color:var(--text);margin:0 0 2px;font-size:13px">Check for 'che' conjunction</p><p style="font-size:11px;color:var(--text-soft);margin:0">Ensure there is a change of subject between the main and dependent clause.</p></div>
                      </div>
                      <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:32px;height:32px;border-radius:50%;background:var(--cyan);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;flex-shrink:0">3</div>
                        <div><p style="font-weight:600;color:var(--text);margin:0 0 2px;font-size:13px">Apply the correct tense</p><p style="font-size:11px;color:var(--text-soft);margin:0">Match the subjunctive tense to the timeframe of the main verb.</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style="padding:28px 32px">
                <h3 style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.06em;font-family:'Manrope',sans-serif;margin:0 0 16px">Examples Comparison</h3>
                <div style="overflow:hidden;border-radius:10px;border:1px solid var(--line)">
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                      <tr style="background:var(--bg)">
                        <th style="padding:12px 18px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;font-family:'Manrope',sans-serif;text-align:left;border-bottom:1px solid var(--line)">English Context</th>
                        <th style="padding:12px 18px;font-size:9px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em;font-family:'Manrope',sans-serif;text-align:left;border-bottom:1px solid var(--line)">Italian Corrected Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:12px 18px;color:var(--text-soft)">I hope that he <strong>comes</strong>.</td>
                        <td style="padding:12px 18px;font-weight:600">Spero che lui <span style="color:var(--cyan);font-weight:700;text-decoration:underline">venga</span>.</td>
                      </tr>
                      <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:12px 18px;color:var(--text-soft)">I think that you <strong>are</strong> right.</td>
                        <td style="padding:12px 18px;font-weight:600">Penso che tu <span style="color:var(--cyan);font-weight:700;text-decoration:underline">abbia</span> ragione.</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 18px;color:var(--text-soft)">It's necessary that we <strong>go</strong>.</td>
                        <td style="padding:12px 18px;font-weight:600">È necessario che noi <span style="color:var(--cyan);font-weight:700;text-decoration:underline">andiamo</span>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
    </div>
  </div>
</section>
<!-- Recommendation -->
            <div style="background:var(--cyan);color:#fff;border-radius:16px;padding:32px;position:relative;overflow:hidden">
              <div style="position:absolute;top:-20px;right:-20px;opacity:.08;pointer-events:none">
                <span class="material-symbols-outlined" style="font-size:200px">auto_awesome</span>
              </div>
              <div style="position:relative;z-index:1;max-width:560px">
                
                <p style="font-size:13px;opacity:.85;margin:0 0 20px;line-height:1.6">Based on your latest 48h activity, we've identified a <strong style="color:#fff">high-frequency collision</strong> between English relative clauses and Italian Subjunctive moods. Prioritize the "Test" module for <strong style="color:#fff;text-decoration:underline">Subjunctive Mood</strong> to solidify your B2 transition.</p>
                <div style="display:flex;gap:8px">
                  <button style="padding:12px 28px;background:#fff;color:var(--cyan);border:none;border-radius:100px;font-size:12px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer;text-transform:uppercase;letter-spacing:.04em">Start Priority Intervention</button>
                  <button style="padding:12px 24px;background:transparent;color:#fff;border:2px solid rgba(255,255,255,.3);border-radius:100px;font-size:12px;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='transparent'">View Full Report</button>
                </div>
              </div>
            </div>
    </div>
  </div>
</section>
</div>
          <!-- Learning Strategy subtab -->
          <div role="tabpanel" class="subtab-pane" id="sub-gh-strategy">

            
<section style="padding:0 0 48px;border-bottom:2px solid var(--line);margin-bottom:48px">
  <div class="prof-grid" style="display:grid;gap:32px">
    <div class="prof-label">
      <h3 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 8px;letter-spacing:-.02em">Insights</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.5;margin:0">Panoramica, affidabilità e prossimi passi basati sull'analisi dei tuoi dati di sessione.</p>
    </div>
    <div>
<section class="alt-card-grid" id="insightsOverviewGrid">
              <article class="alt-card"><h3><span data-i18n="insights_panoramica">Panoramica</span><span class="cefr-info-icon" data-cefr-info="Distribuzione CEFR del tuo vocabolario attivo e passivo">ⓘ</span></h3><p id="insightsOverviewSummary" style="font-size:14px;color:var(--text-soft);line-height:1.6">Caricamento…</p></article>
              <article class="alt-card"><h3><span data-i18n="insights_affidabilita">Affidabilità</span><span class="cefr-info-icon" data-cefr-info="Precisione basata sul numero di sessioni completate">ⓘ</span></h3><p id="insightsOverviewConfidence" style="font-size:14px;color:var(--text-soft);line-height:1.6">Caricamento…</p><p id="insightsOverviewConfidenceNote" style="font-size:11px;color:var(--text-faint);margin-top:6px">Sono indicazioni direzionali, non valutazioni definitive.</p></article>
              <article class="alt-card"><h3><span data-i18n="insights_next_step">Prossimo passo</span><span class="cefr-info-icon" data-cefr-info="Suggerimento personalizzato basato sui tuoi dati recenti">ⓘ</span></h3><p id="insightsOverviewNext" style="font-size:14px;color:var(--text-soft);line-height:1.6">Caricamento…</p></article>
              <article class="alt-card"><h3><span data-i18n="insights_focus_areas">🎯 Aree di miglioramento</span><span class="cefr-info-icon" data-cefr-info="Aree da sviluppare identificate dalle tue sessioni">ⓘ</span></h3><div class="q-row" id="insightsFocusAreas" style="margin-top:8px"><span style="font-size:13px;color:var(--text-faint)">Completa l'onboarding per vedere le tue aree di miglioramento.</span></div></article>
            </section>
    </div>
  </div>
</section>

          </div>
        </div>
`;
}

export async function init() {
  // Grammar Hub is a static content panel with inline event handlers.
  // The intervention timeline, phase cards, and accordion toggles are
  // self-contained in the template HTML. No dynamic data loading needed yet.
  // Future: wire up Supabase grammar_errors table for real error data.
}
export function destroy() { container = null; }
