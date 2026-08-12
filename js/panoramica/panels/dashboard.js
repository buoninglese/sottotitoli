// js/panoramica/panels/dashboard.js — Panoramica (Dashboard) panel
// Full original HTML extracted from panoramica-v1.html
import { getSupabase } from '../shared/supabase.js';
import { formatNumber } from '../shared/formatters.js';
import { emit, on } from '../shared/events.js';

var container = null;
var initialized = false;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel active" id="pnl-panoramica">
          <section class="panel-head"><h2>Panoramica</h2></section>
          <!-- Hero Banner — Lumina glass-morphism design -->
          <article class="hero-banner" id="heroBanner" style="position:relative;overflow:hidden;border-radius:48px;margin-bottom:40px;min-height:520px">
            <style>
              #heroBanner{background:rgba(30,31,38,.25);backdrop-filter:blur(48px);border:1px solid rgba(255,255,255,.05)}
              #heroBanner::before{content:'';position:absolute;inset:-50%;background:conic-gradient(from 180deg at 50% 50%,transparent 0%,rgba(6,182,212,.06) 10%,transparent 20%,rgba(5,150,105,.05) 40%,transparent 50%,rgba(217,119,6,.04) 70%,transparent 80%);animation:hero-prism-rotate 30s linear infinite;z-index:0}
              @keyframes hero-prism-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
              .glass-card{background:rgba(30,31,38,.4);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.05);border-radius:28px;transition:all .3s ease}
              .glass-card:hover{background:rgba(255,255,255,.06);border-color:rgba(6,182,212,.15)}
              .glass-card .gc-icon-box{transition:all .3s ease}
              .glass-card:hover .gc-icon-box.gc-cyan{background:var(--cyan);color:#003640}
              .glass-card:hover .gc-icon-box.gc-teal{background:var(--teal);color:#003731}
              /* Light mode */
              [data-theme="light"] #heroBanner{background:rgba(255,255,255,.5);backdrop-filter:blur(48px);border-color:rgba(139,92,246,.1)}
              [data-theme="light"] #heroBanner::before{background:conic-gradient(from 180deg at 50% 50%,transparent 0%,rgba(99,102,241,.05) 10%,transparent 20%,rgba(5,150,105,.04) 40%,transparent 50%,rgba(217,119,6,.03) 70%,transparent 80%)}
              [data-theme="light"] .glass-card{background:rgba(255,255,255,.6);backdrop-filter:blur(16px);border-color:rgba(0,0,0,.06)}
              [data-theme="light"] .glass-card:hover{background:rgba(255,255,255,.85);border-color:rgba(99,102,241,.15)}
              /* ── Mobile: stack columns, shrink padding ── */
              @media(max-width:900px){
                #heroBanner .hero-inner-row{flex-direction:column;gap:40px}
                #heroBanner .hero-inner{padding:32px 24px;gap:40px}
                #heroBanner .hero-streak-value{font-size:36px}
                #heroBanner .hero-streak-card{padding:24px}
                #heroBanner{min-height:auto;border-radius:32px}
              }
              @media(max-width:500px){
                #heroBanner .hero-inner{padding:24px 16px;gap:28px}
                #heroBanner .hero-streak-value{font-size:28px}
                #heroBanner .hero-streak-card{padding:18px}
                #heroBanner .hero-glass-card{padding:18px}
                #heroBanner .hero-glass-title{font-size:16px}
              }
            </style>
            <div class="hero-inner" style="position:relative;z-index:1;padding:64px;display:flex;flex-direction:column;gap:64px">
              <div class="hero-inner-row" style="display:flex;gap:64px;align-items:flex-start">
              <!-- Left Column -->
              <div style="flex:7;display:flex;flex-direction:column;gap:32px">
                <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:99px;background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);width:fit-content">
                  <span style="width:7px;height:7px;border-radius:50%;background:var(--cyan);animation:pulse 2s infinite"></span>
                  <span style="font-size:9px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.12em;font-family:'Inter',sans-serif" data-i18n="hero_suggested">Suggerito per Te</span>
                </div>
                <h2 style="font-size:clamp(36px,5vw,56px);font-weight:200;margin:0;letter-spacing:-.04em;color:var(--text);line-height:1.05"><span data-i18n="welcome_back">Bentornato,</span> <span id="heroName" style="font-weight:600">Utente</span></h2>
                <p id="heroText" style="font-size:20px;color:var(--text-soft);margin:0;max-width:560px;line-height:1.6;font-weight:400;opacity:.9">Completa alcune sessioni per trasformare il tuo modo di parlare in feedback utile su fluidità, vocabolario e progressi.</p>
                <div style="position:relative;max-width:420px">
                  <span class="material-symbols-outlined" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--text-soft);opacity:.5;font-size:20px">search</span>
                  <input type="text" placeholder="Cerca nel vocabolario…" data-i18n-placeholder="hero_search_placeholder" style="width:100%;padding:16px 16px 16px 48px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);backdrop-filter:blur(12px);color:var(--text);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='rgba(255,255,255,.1)'" onkeydown="if(event.key==='Enter'){var w=this.value.trim();if(!w)return;var vbPanel=document.getElementById('pnl-vocabulary-builder');var vbNav=document.querySelector('[data-panel=vocabulary-builder]');if(vbNav)vbNav.click();setTimeout(function(){var enTab=document.querySelector('#pnl-vocabulary-builder .tab-link[data-subtab=wb-expand]');if(enTab)enTab.click();setTimeout(function(){var inp=document.getElementById('wbExpandSearch');if(inp){inp.value=w;if(window.renderExpandSuggestions)renderExpandSuggestions();}},200)},100)}">
                </div>
                <div class="hero-chips" id="heroChips"></div>
              </div>
              <!-- Right Column: Streak + Continue Learning -->
              <div style="flex:5;display:flex;flex-direction:column;gap:24px;justify-content:center">
                <div class="glass-card hero-streak-card" style="padding:32px;display:flex;align-items:center;justify-content:space-between;cursor:default">
                  <div>
                    <p style="font-size:11px;font-weight:700;color:var(--cyan);opacity:.7;text-transform:uppercase;letter-spacing:.15em;font-family:'Inter',sans-serif;margin:0 0 4px" data-i18n="hero_streak">Serie di apprendimento</p>
                    <p class="hero-streak-value" style="font-size:48px;font-weight:200;color:var(--text);margin:0;font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em" id="heroStreakDays">—<span style="font-size:18px;font-weight:300;opacity:.5;margin-left:4px">giorni</span></p>
                  </div>
                  <div id="heroStreakBox" style="width:64px;height:64px;border-radius:24px;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;background:rgba(6,182,212,.08);border:1px solid rgba(255,255,255,.05)">
                    <div id="heroStreakGlow" style="position:absolute;inset:-4px;background:rgba(6,182,212,.15);filter:blur(16px);border-radius:28px;z-index:-1"></div>
                    <span class="material-symbols-outlined" style="color:var(--cyan);font-size:32px;font-variation-settings:'FILL'1">local_fire_department</span>
                  </div>
                </div>
                <p style="font-size:11px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.2em;font-family:'Inter',sans-serif;margin:0" data-i18n="hero_continue">Continua ad apprendere</p>
                <div style="display:flex;flex-direction:column;gap:16px" id="heroCards">
                  <div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7">
                    <div style="flex:1;min-width:0">
                      <p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:'Inter',sans-serif;margin:0 0 4px" data-i18n="hero_transcript">Trascrizione</p>
                      <p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:'Inter',sans-serif">Caricamento…</p>
                      <p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0">Caricamento…</p>
                    </div>
                    <div class="gc-icon-box gc-cyan" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--cyan)">
                      <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL'1">play_arrow</span>
                    </div>
                  </div>
                  <div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7">
                    <div style="flex:1;min-width:0">
                      <p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:'Inter',sans-serif;margin:0 0 4px" data-i18n="hero_word_bank">Banca Parole</p>
                      <p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:'Inter',sans-serif">Caricamento…</p>
                      <p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0">Caricamento…</p>
                    </div>
                    <div class="gc-icon-box gc-teal" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal)">
                      <span class="material-symbols-outlined" style="font-size:22px">add</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </article>
          <!-- Metric Boxes -->
          <section class="stats-row">
            <article class="metric-card" data-metric="totalSessions" onclick="selectMetricCard(this)" style="cursor:pointer;container-type:inline-size">
              <p class="metric-label" data-i18n="metric_total_sessions">Sessioni totali</p>
              <div class="metric-value" style="display:flex;align-items:baseline;gap:8px"><span>—</span></div>
            </article>
            <article class="metric-card selected" data-metric="totalMinutes" onclick="selectMetricCard(this)" style="cursor:pointer;container-type:inline-size">
              <p class="metric-label" data-i18n="metric_spoken_time">Tempo parlato</p>
              <div class="metric-value">—</div>
            </article>
            <article class="metric-card" data-metric="totalWords" onclick="selectMetricCard(this)" style="cursor:pointer;container-type:inline-size">
              <p class="metric-label" data-i18n="metric_unique_words">Parole uniche</p>
              <div class="metric-value">—</div>
            </article>
            <article class="metric-card" data-metric="avgLexDiv" onclick="selectMetricCard(this)" style="cursor:pointer;container-type:inline-size">
              <p class="metric-label" data-i18n="metric_lexical_div">Div. lessicale</p>
              <div class="metric-value">—</div>
            </article>
          </section>
          <!-- Chart Section -->
          <style>
            #dailyChartCard .chart-bar { transition: all .3s ease; }
            #dailyChartCard .chart-bar > div {
              border-radius: 12px 12px 0 0;
              transition: height .5s cubic-bezier(.34,1.56,.64,1), background .4s ease, box-shadow .4s ease;
            }
            #dailyChartCard .chart-tooltip {
              position: absolute;
              bottom: calc(100% + 6px);
              left: 50%;
              transform: translateX(-50%);
              background: var(--text);
              color: var(--bg);
              padding: 4px 10px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              pointer-events: none;
              opacity: 0;
              transition: opacity .15s ease;
              z-index: 10;
            }
            #dailyChartCard .chart-tooltip.show { opacity: 1; }
          </style>
          <article style="background:var(--card);border:1px solid var(--line);border-radius:32px;padding:32px" id="dailyChartCard">
            <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;flex-wrap:wrap;gap:20px">
              <div>
                <h3 id="dailyChartTitle" style="font-size:36px;font-weight:900;color:var(--text);margin:0 0 16px;letter-spacing:-.02em;font-family:'Inter',sans-serif" data-i18n="chart_session_minutes">Session minutes</h3>
                <p id="dailyChartSubtitle" style="font-size:20px;color:var(--text-soft);opacity:.9;margin:0;max-width:500px;line-height:1.6;font-weight:400">Analisi della tua costanza verbale negli ultimi 14 giorni.</p>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div id="dailyChartTotal" style="font-size:56px;font-weight:900;color:var(--cyan);line-height:1;letter-spacing:-.03em;font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;margin-bottom:8px">—</div>
                <div id="dailyChartLabel" style="font-size:12px;font-weight:400;color:var(--text-soft);opacity:.9;text-transform:uppercase;letter-spacing:.3em;font-family:'Inter',sans-serif" data-i18n="chart_minutes_total">Minutes Total</div>
              </div>
            </div>
            <div id="dailyChart" style="display:flex;align-items:flex-end;justify-content:stretch;height:192px;padding:0 12px;position:relative;gap:4px">
              <span style="color:var(--text-faint);font-size:14px">Caricamento…</span>
            </div>
            <div style="display:flex;justify-content:space-between;height:20px;margin-top:8px;padding:0 12px;font-size:10px;color:var(--text-faint)" id="dailyChartLabels">
              <span></span><span></span><span></span>
            </div>
          </article>
        </div>
`;
}

export async function init() {
  if (initialized) return;
  initialized = true;
  await refreshAll();
  if (window.initSparklineTooltips) window.initSparklineTooltips();
  on('session:saved', refreshAll);
  on('session:deleted', refreshAll);
}

export function destroy() {
  initialized = false;
  container = null;
}

export function rerender() { refreshAll(); }

function refreshAll() { refreshHero().catch(function(e){console.warn('refreshHero:',e.message);}); refreshChart().catch(function(e){console.warn('refreshChart:',e.message);}); refreshMetrics(); }

// ── Helpers ──
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var min = Math.floor(diff / 60000);
  var hrs = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);
  if (min < 1) return 'adesso';
  if (min < 60) return min + ' min fa';
  if (hrs < 24) return hrs + ' ore fa';
  if (days < 30) return days + ' giorni fa';
  return new Date(dateStr).toLocaleDateString('it-IT');
}

async function refreshHero() {
  var sb = getSupabase();
  var userId = null;
  if (sb) {
    try { var s = await sb.auth.getSession(); userId = s.data?.session?.user?.id || null; } catch(e) {}
  }

  // ── Fetch profile from Supabase (bypass stale window globals) ──
  var profile = window._sottotitoliProfile || window.profile;
  if (userId && sb && (!profile || !profile.streak_days)) {
    try {
      var profileResp = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!profileResp.error && profileResp.data) {
        profile = profileResp.data;
        // Normalize display_name
        if (!profile.display_name) profile.display_name = profile.full_name || '';
      }
    } catch(e) {}
  }

  // ── Profile name ──
  var nameEl = document.getElementById('heroName');
  if (nameEl) nameEl.textContent = (profile && profile.display_name) || (profile && profile.full_name) || (profile && profile.email && profile.email.split('@')[0]) || 'Utente';

  // ── Session stats (prefer data-service, fall back to window globals) ──
  var stats = null;
  if (window.SottotitoliData && window.SottotitoliData.getSessionStats) {
    try { stats = await window.SottotitoliData.getSessionStats(); } catch(e) {}
  }
  // Fallback: window globals
  var statsEN = window.statsEN || {};
  var statsIT = window.statsIT || {};

  var totalSessions = stats ? stats.totalSessions : ((statsEN.total_sessions || 0) + (statsIT.total_sessions || 0));
  var totalMinutes = stats ? stats.totalMinutes : Math.round((statsEN.total_minutes || 0) + (statsIT.total_minutes || 0));
  var totalWords = stats ? stats.totalWords : ((statsEN.total_words || 0) + (statsIT.total_words || 0));
  var avgLexDiv = stats ? stats.avgLexDiv : (statsEN.avg_lexical_diversity || statsIT.avg_lexical_diversity || 0);
  var streakDays = (profile && profile.streak_days) || 0;

  // ── Metric cards ──
  var cards = document.querySelectorAll('.metric-card');
  cards.forEach(function(c) {
    var metric = c.getAttribute('data-metric');
    var val = c.querySelector('.metric-value');
    if (!val) return;
    if (metric === 'totalSessions') val.innerHTML = '<span>' + formatNumber(totalSessions) + '</span>';
    else if (metric === 'totalMinutes') val.textContent = totalMinutes + ' min';
    else if (metric === 'totalWords') val.innerHTML = '<span>' + formatNumber(totalWords) + '</span>';
    else if (metric === 'avgLexDiv') val.innerHTML = '<span>' + (typeof avgLexDiv === 'number' && avgLexDiv < 1 ? (avgLexDiv * 100).toFixed(0) : avgLexDiv) + '</span><span style="font-size:.4em;opacity:.5">%</span>';
  });

  // ── Streak ──
  var sd = document.getElementById('heroStreakDays');
  if (sd) {
    if (streakDays > 0) {
      sd.innerHTML = streakDays + '<span style="font-size:18px;font-weight:300;opacity:.5;margin-left:4px">giorni</span>';
    } else {
      sd.innerHTML = '—<span style="font-size:18px;font-weight:300;opacity:.5;margin-left:4px">giorni</span>';
    }
  }

  // ── Hero "Continue Learning" cards ──
  await renderHeroCards(userId);
}

async function renderHeroCards(userId) {
  var container = document.getElementById('heroCards');
  if (!container) return;
  var sb = getSupabase();

  try {
    var html = '';
    var studyLang = window.SOTTOTITOLI_STUDY_LANG || localStorage.getItem('sottotitoli-study-lang') || 'en';

    // ── Most recent session ──
    var recentSession = null;
    if (userId && sb) {
      // Prefer data-service if available
      if (window.SottotitoliData && window.SottotitoliData.getSessions) {
        try { var sList = await window.SottotitoliData.getSessions(studyLang, 1); recentSession = sList && sList[0]; } catch(e) {}
      }
      // Fallback: direct Supabase query
      if (!recentSession) {
        try {
          var sessionResp = await sb.from('sessions')
            .select('id,name,started_at,words_count,duration_seconds')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(1);
          if (!sessionResp.error && sessionResp.data && sessionResp.data.length > 0) recentSession = sessionResp.data[0];
        } catch(e) {}
      }
    }

    if (recentSession) {
      var sName = recentSession.name || 'Session ' + new Date(recentSession.started_at).toLocaleDateString('it-IT');
      var ago = timeAgo(recentSession.started_at);
      var words = recentSession.words_count || 0;
      html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="var nav=document.querySelector(\'[data-panel=trascrizioni]\');if(nav)nav.click();setTimeout(function(){if(window.trOpenEditor)trOpenEditor(\''+escHtml(recentSession.id)+'\')},300)">'+
        '<div style="flex:1;min-width:0">'+
        '<p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:\'Inter\',sans-serif;margin:0 0 4px"><span data-i18n="hero_transcript">Trascrizione</span></p>'+
        '<p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(sName)+'</p>'+
        '<p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0">'+ago+' · '+words+' <span data-i18n="hero_words">parole</span></p>'+
        '</div>'+
        '<div class="gc-icon-box gc-cyan" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--cyan)">'+
        '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\'1">description</span></div>'+
        '</div>';
    } else {
      html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7" onclick="var nav=document.querySelector(\'[data-panel=trascrizioni]\');if(nav)nav.click()">'+
        '<div style="flex:1;min-width:0">'+
        '<p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:\'Inter\',sans-serif;margin:0 0 4px"><span data-i18n="hero_transcript">Trascrizione</span></p>'+
        '<p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif"><span data-i18n="hero_new_session_title">Avvia una nuova sessione</span></p>'+
        '<p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0"><span data-i18n="hero_new_session_desc">Cattura sottotitoli in tempo reale</span></p>'+
        '</div>'+
        '<div class="gc-icon-box gc-cyan" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--cyan)">'+
        '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\'1">mic</span></div>'+
        '</div>';
    }

    // ── Most recent word bank ──
    var wbWithWords = [];
    if (userId && sb && window.SottotitoliData && window.SottotitoliData.getWordbanks) {
      try {
        var banks = await window.SottotitoliData.getWordbanks(studyLang);
        wbWithWords = banks ? banks.filter(function(b){ return (b.word_count || 0) > 0; }) : [];
      } catch(e) {}
    }
    // Fallback: direct query (verified schema: user_wordbanks has lang, NO word_count/updated_at)
    if (wbWithWords.length === 0 && userId && sb) {
      try {
        var wbResp = await sb.from('user_wordbanks')
          .select('id,name')
          .eq('user_id', userId)
          .eq('lang', studyLang)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!wbResp.error && wbResp.data && wbResp.data.length > 0) wbWithWords = wbResp.data;
      } catch(e) {}
    }

    if (wbWithWords.length > 0) {
      var wb = wbWithWords[0];
      html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="var nav=document.querySelector(\'[data-panel=wordbanks]\');if(nav)nav.click()">'+
        '<div style="flex:1;min-width:0">'+
        '<p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:\'Inter\',sans-serif;margin:0 0 4px"><span data-i18n="hero_word_bank">Banca Parole</span></p>'+
        '<p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(wb.name)+'</p>'+
        '<p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0">'+(wb.word_count||0)+' <span data-i18n="hero_terms">termini</span></p>'+
        '</div>'+
        '<div class="gc-icon-box gc-teal" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal)">'+
        '<span class="material-symbols-outlined" style="font-size:22px">menu_book</span></div>'+
        '</div>';
    } else {
      html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7" onclick="var nav=document.querySelector(\'[data-panel=wordbanks]\');if(nav)nav.click();setTimeout(function(){if(window.wbShowCreate)wbShowCreate()},400)">'+
        '<div style="flex:1;min-width:0">'+
        '<p style="font-size:10px;font-weight:700;color:var(--text-soft);opacity:.5;text-transform:uppercase;letter-spacing:.15em;font-family:\'Inter\',sans-serif;margin:0 0 4px"><span data-i18n="hero_word_bank">Banca Parole</span></p>'+
        '<p class="hero-glass-title" style="font-size:20px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif"><span data-i18n="hero_new_bank_title">Crea una nuova banca parole</span></p>'+
        '<p style="font-size:13px;color:var(--text-soft);opacity:.5;margin:4px 0 0"><span data-i18n="hero_new_bank_desc">Raccogli e organizza il tuo vocabolario</span></p>'+
        '</div>'+
        '<div class="gc-icon-box gc-teal" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal)">'+
        '<span class="material-symbols-outlined" style="font-size:22px">style</span></div>'+
        '</div>';
    }

    container.innerHTML = html;
  } catch(e) { /* best effort — keep Caricamento placeholders */ }
}

async function refreshChart() {
  var chartEl = document.getElementById('dailyChart');
  if (!chartEl) return;
  try {
    var sb = getSupabase();
    if (!sb) { chartEl.innerHTML = '<span style="color:var(--text-faint);font-size:14px;padding:40px">Accedi per vedere il grafico</span>'; return; }
    // Get user ID for row-level filtering
    var userId = null;
    try { var authResp = await sb.auth.getSession(); userId = authResp.data?.session?.user?.id || null; } catch(e) {}
    if (!userId) { chartEl.innerHTML = '<span style="color:var(--text-faint);font-size:14px;padding:40px">Accedi per vedere il grafico</span>'; return; }

    var since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    var resp = await sb.from('sessions')
      .select('started_at, duration_seconds')
      .eq('user_id', userId)
      .gte('started_at', since)
      .order('started_at', { ascending: true });
    if (resp.error) throw resp.error;
    var sessions = resp.data || [];
    var days = {};
    for (var i = 0; i < 14; i++) {
      var d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    sessions.forEach(function(s) {
      var key = s.started_at ? s.started_at.slice(0, 10) : null;
      if (key && days[key] !== undefined) days[key] += Math.round((s.duration_seconds || 0) / 60);
    });
    var values = Object.values(days);
    var maxVal = Math.max.apply(null, values.concat([1]));
    var total = values.reduce(function(a,b){return a+b;},0);
    var totalEl = document.getElementById('dailyChartTotal');
    if (totalEl) totalEl.textContent = total;
    chartEl.innerHTML = values.map(function(v, i) {
      var h = maxVal > 0 ? Math.max(6, (v / maxVal) * 172) : 6;
      return '<div class="chart-bar" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative"><div class="chart-tooltip">' + v + ' min</div><div style="width:100%;max-width:40px;height:' + h + 'px;background:var(--cyan);opacity:' + (i >= 11 ? 1 : 0.35 + (i * 0.03)) + ';box-shadow:0 0 12px rgba(6,182,212,' + (i >= 11 ? 0.2 : 0.05) + ')"></div></div>';
    }).join('');
  } catch(e) { console.warn('Chart failed:', e.message); }
}

function refreshMetrics() {
  // Metric cards already updated in refreshHero
}
