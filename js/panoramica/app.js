// js/panoramica/app.js — Panel router + initialization
// Replaces the 6,000-line mega-script. Each panel is a separate ES module.
// See /memories/session/plan.md for architecture details.

import { showToast } from './shared/dom.js';
import { waitForSupabase, getSupabase } from './shared/supabase.js';
import { formatDate, formatDuration, formatNumber, statusBadge } from './shared/formatters.js';
import { emit, on } from './shared/events.js';
import { store, updateStore, syncWindowGlobals } from './shared/state.js';

// ── Panel imports (preloaded — all available instantly, no race conditions) ──
import * as dashboardPanel from './panels/dashboard.js';
import * as profilePanel from './panels/profile.js';
import * as sessionsPanel from './panels/sessions.js';
import * as wordbanksPanel from './panels/wordbanks.js';
import * as vocabBuilderPanel from './panels/vocab-builder.js';
import * as reportAiPanel from './panels/report-ai.js';
import * as settingsPanel from './panels/settings.js';
import * as helpPanel from './panels/help.js';
import * as grammarHubPanel from './panels/grammar-hub.js';
import * as aiVoicePanel from './panels/ai-voice.js';

// ── Panel registry ──
var panels = {
  'panoramica': { module: dashboardPanel, loaded: false },
  'profilo': { module: profilePanel, loaded: false },
  'trascrizioni': { module: sessionsPanel, loaded: false },
  'wordbanks': { module: wordbanksPanel, loaded: false },
  'vocabulary-builder': { module: vocabBuilderPanel, loaded: false },
  'report-ai': { module: reportAiPanel, loaded: false },
  'impostazioni': { module: settingsPanel, loaded: false },
  'aiuto': { module: helpPanel, loaded: false },
  'grammar-hub': { module: grammarHubPanel, loaded: false },
  'ai-voice': { module: aiVoicePanel, loaded: false }
};

var currentPanel = null;
var panelContainer = null;
var pendingPanel = null; // panel requested before panels finished preloading (applied later)

// ── Panel switching (CSS toggle — same approach as the original 12K version) ──
function switchPanel(name) {
  if (currentPanel === name) return;

  var wrap = document.getElementById('panel-' + name);
  if (!wrap) {
    // Panels aren't in the DOM yet (dashboard still loading). Remember the
    // request so the click isn't lost — init() applies it once panels render.
    if (panels[name]) pendingPanel = name;
    return;
  }

  var previousPanel = currentPanel; // capture before reassignment (used in panel:switch event)

  // Hide ALL wrappers, show target — simpler and more reliable than prev/next tracking
  var wrappers = document.querySelectorAll('[id^="panel-"]');
  for (var i = 0; i < wrappers.length; i++) {
    wrappers[i].style.display = 'none';
  }
  wrap.style.display = '';

  // Ensure active class on content-panel
  var cp = wrap.querySelector('.content-panel');
  if (cp) cp.classList.add('active');

  currentPanel = name;
  window._currentPanel = name;

  // Update sidebar active state
  var links = document.querySelectorAll('.sidebar-link');
  for (var j = 0; j < links.length; j++) {
    var panel = links[j].getAttribute('data-panel');
    if (panel === name) {
      links[j].classList.add('active');
      links[j].setAttribute('aria-current', 'page');
    } else {
      links[j].classList.remove('active');
      links[j].removeAttribute('aria-current');
    }
  }

  emit('panel:switch', { from: previousPanel, to: name });
}

// ── Wire sidebar clicks via delegation on the static .sidebar element ──
// Delegation keeps the nav responsive from first paint. Uses a manual DOM walk
// instead of closest() — Safari sometimes gives a text node as e.target when
// clicking on Material Icons ligature text, and textNode.closest is undefined.
function setupSidebar() {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar._navWired) return; // idempotent
  sidebar._navWired = true;
  sidebar.addEventListener('click', function (e) {
    // Walk up from the click target to find the sidebar link (no closest()!)
    var el = e.target;
    var link = null;
    while (el && el !== sidebar) {
      if (el.getAttribute && el.getAttribute('data-panel')) {
        link = el;
        break;
      }
      el = el.parentElement;
    }
    if (!link) return;
    e.preventDefault();
    if ((link.getAttribute('style') || '').indexOf('not-allowed') !== -1) return; // disabled (e.g. AI Voice)
    switchPanel(link.getAttribute('data-panel'));
  });
}

// ── Dropdown links call switchPanel(name) directly via inline onclick (see panoramica.html) ──

// ── Update topbar dropdown with user data ──
function updateDropdown(meta, profile, credits, tokens) {
  var ddName = document.getElementById('ddName');
  if (ddName) {
    ddName.textContent = (profile && profile.display_name) || (profile && profile.full_name) || (meta && meta.full_name) || (meta && meta.email ? meta.email.split('@')[0] : 'Utente');
  }
  var ddEmail = document.getElementById('ddEmail');
  if (ddEmail && meta) ddEmail.textContent = meta.email || '';

  var ddMinutes = document.getElementById('ddMinutes');
  if (ddMinutes) ddMinutes.textContent = credits ? credits.balanceMinutes + ' min' : '—';

  var ddTokens = document.getElementById('ddTokens');
  if (ddTokens) ddTokens.textContent = tokens != null ? tokens : '—';
}

// ── Preload all panels at once (no lazy loading) ──
async function preloadAllPanels() {
  var names = Object.keys(panels);
  var total = names.length;
  var done = 0;

  // Render all panels — per-panel error isolation (one failure doesn't block others)
  var results = await Promise.allSettled(names.map(async function (name) {
    var entry = panels[name];
    if (!entry || !entry.module) return;

    var wrapId = 'panel-' + name;
    var wrap = document.getElementById(wrapId);
    if (wrap) return; // already rendered

    wrap = document.createElement('div');
    wrap.id = wrapId;
    wrap.style.display = 'none';
    if (panelContainer) panelContainer.appendChild(wrap);

    if (entry.module.render) {
      await entry.module.render(wrap);
      entry.loaded = true;
    }

    // ── Universal script injection ──
    var deadScripts = wrap.querySelectorAll('script');
    for (var i = 0; i < deadScripts.length; i++) {
      var dead = deadScripts[i];
      var live = document.createElement('script');
      live.textContent = dead.textContent;
      dead.parentNode.replaceChild(live, dead);
    }

    // Add active class
    var panelEl = wrap.querySelector('.content-panel');
    if (panelEl) panelEl.classList.add('active');

    // ── Wire subtab onclick handlers ──
    // Skipped for vocabulary-builder (has its own delegation in panoramica.html line 1510)
    if (name !== 'vocabulary-builder') {
      var subtabs = wrap.querySelectorAll('.tab-link[data-subtab]');
      for (var j = 0; j < subtabs.length; j++) {
        subtabs[j].onclick = function () {
          var tab = this;
          var parentPanel = tab.closest('.content-panel');
          if (!parentPanel) return;
          var subId = tab.getAttribute('data-subtab');
          parentPanel.querySelectorAll('.tab-link').forEach(function (t) {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          parentPanel.querySelectorAll('.subtab-pane').forEach(function (p) {
            p.classList.remove('active');
          });
          var target = document.getElementById('sub-' + subId);
          if (target) target.classList.add('active');
          return false;
        };
      }
    }

    // Init
    if (entry.module.init) {
      await entry.module.init();
    }

    done++;
  }));

  // Report failures
  var failed = results.filter(function(r) { return r.status === 'rejected'; });
  if (failed.length > 0) {
    console.error(failed.length + ' panel(s) failed to load:');
    failed.forEach(function(r) { console.error('  ', r.reason); });
    // Show error in first panel wrapper
    var firstWrap = document.querySelector('[id^="panel-"]');
    if (firstWrap) {
      firstWrap.style.display = '';
      firstWrap.innerHTML = '<div class="content-panel active" style="padding:60px 40px;text-align:center"><p style="font-size:18px;color:var(--red);font-weight:700;margin:0">Alcuni pannelli non sono riusciti a caricare (' + failed.length + ')</p><p style="font-size:13px;color:var(--text-soft);margin:8px 0 0">Ricarica la pagina o controlla la console per i dettagli.</p></div>';
    }
  }

  console.log('Preloaded ' + done + '/' + total + ' panels');
}

// ── Main initialization ──
async function init() {
  panelContainer = document.getElementById('panelContainer');

  // Show loading state
  var mp = document.querySelector('.main-panel');
  if (mp) mp.classList.add('js-loading');

  // Wait for Supabase
  var sb = await waitForSupabase();
  if (!sb) { console.warn('Supabase not loaded — rendering offline'); }

  // Wait for auth to settle
  var meta = null;
  if (typeof SottotitoliData !== 'undefined' && SottotitoliData.getUserMeta) {
    meta = await SottotitoliData.getUserMeta();
    if (!meta) {
      console.warn('No session yet, polling for auth...');
      for (var pollTries = 0; pollTries < 25; pollTries++) {
        await new Promise(function (r) { setTimeout(r, 200); });
        meta = await SottotitoliData.getUserMeta();
        if (meta) break;
      }
    }
  }

  // Return-page redirect
  if (meta) {
    var returnPage = localStorage.getItem('sottotitoli_return_page');
    if (returnPage && returnPage.indexOf('duo-s8t.html') !== -1) {
      localStorage.removeItem('sottotitoli_return_page');
      window.location.replace(returnPage);
      return;
    }
  }

  // Load settings
  var settingsData = null;
  if (typeof SottotitoliData !== 'undefined' && SottotitoliData.loadSettings) {
    settingsData = await SottotitoliData.loadSettings();
  }
  window._settingsData = settingsData;
  if (settingsData && settingsData.theme && typeof applyTheme === 'function') {
    applyTheme(settingsData.theme);
  }

  // Load user data (with error resilience — same as original)
  if (!meta) {
    console.warn('No session — rendering offline mode');
    window._sottotitoliProfile = null;
    window.profile = null;
    window.statsEN = null; window.statsIT = null;
    window.refs = null; window.reports = []; window.tokens = 0; window.credits = null;
    window._sottotitoliPrefs = null;
    window.cefrBreakdown = null;
  } else {
    // Fetch all user data CONCURRENTLY. Each call resolves its own userId via
    // getSession (no shared state, verified in data-service.js), so they are
    // independent. Was 9 sequential awaits = 9 serialized round-trips, which
    // delayed the whole dashboard on slow/cold backends. Per-call try/catch
    // keeps the exact same fallback values as before.
    var _data = await Promise.all([
      (async function () { try { return await SottotitoliData.getProfile(); } catch (e) { console.warn('getProfile failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getSessionStats('en'); } catch (e) { console.warn('statsEN failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getSessionStats('it'); } catch (e) { console.warn('statsIT failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getReferralStats(); } catch (e) { console.warn('refs failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getAIReports(); } catch (e) { console.warn('reports failed:', e.message); return []; } })(),
      (async function () { try { return await SottotitoliData.getAITokens(); } catch (e) { console.warn('tokens failed:', e.message); return 0; } })(),
      (async function () { try { return await SottotitoliData.getCredits(); } catch (e) { console.warn('credits failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getPreferences(); } catch (e) { console.warn('prefs failed:', e.message); return null; } })(),
      (async function () { try { return await SottotitoliData.getCEFRBreakdown(); } catch (e) { console.warn('cefr failed:', e.message); return null; } })()
    ]);
    window._sottotitoliProfile = _data[0];
    window.profile = window._sottotitoliProfile;
    window.statsEN = _data[1];
    window.statsIT = _data[2];
    window.refs = _data[3];
    window.reports = _data[4];
    window.tokens = _data[5];
    window.credits = _data[6];
    window._sottotitoliPrefs = _data[7];
    window.cefrBreakdown = _data[8];

    // Update dropdown
    updateDropdown(meta, window.profile, window.credits, window.tokens);

    // Retry after delay
    setTimeout(async function () {
      var ddMin = document.getElementById('ddMinutes');
      var ddTok = document.getElementById('ddTokens');
      if (ddMin && ddMin.textContent === '—') {
        try { var c = await SottotitoliData.getCredits(); if (c) ddMin.textContent = c.balanceMinutes + ' min'; } catch (e) {}
      }
      if (ddTok && ddTok.textContent === '—') {
        try { var t = await SottotitoliData.getAITokens(); if (t != null) ddTok.textContent = t; } catch (e) {}
      }
    }, 3000);

    // Update hero greeting
    var heroText = document.getElementById('heroText');
    if (heroText && meta) {
      heroText.setAttribute('data-i18n', 'your_stats_ready');
      heroText.textContent = 'Le tue statistiche di apprendimento sono pronte.';
      if (typeof I18n !== 'undefined' && I18n.apply) { I18n.apply(heroText); }
    }
  }

  // Sync window globals to shared store
  syncWindowGlobals();

  // ── Preload ALL panels (no lazy loading — everything renders upfront) ──
  await preloadAllPanels();

  // ── Sidebar clicks are already wired at module load (delegation). Re-assert
  //    in case .sidebar wasn't present earlier — idempotent. ──
  setupSidebar();

  // Hide loading screen (multiple methods for reliability)
  var loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'none';
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }

  // Route to initial panel. If the user already clicked a tab during load,
  // honor that choice; otherwise use the URL hash, else the default.
  var hash = window.location.hash.replace('#', '');
  var initialPanel = hash && panels[hash] ? hash : 'panoramica';
  switchPanel(pendingPanel || initialPanel);
  pendingPanel = null;

  // Listen for i18n changes to update panels
  window.addEventListener('i18n-changed', function (e) {
    // Re-render current panel if it supports it
    if (currentPanel && panels[currentPanel] && panels[currentPanel].module.rerender) {
      try { panels[currentPanel].module.rerender(); } catch (e) {}
    }
  });

  console.log('Panoramica router initialized. Active panel:', currentPanel);
}

// ── Expose switchPanel globally for backward compat ──
window.switchPanel = switchPanel;

// ── Wire sidebar nav immediately (delegation), BEFORE init()'s async pipeline,
//    so tabs respond from first paint even while data is still loading. ──
setupSidebar();

// ── Start ──
init().catch(function (e) {
  console.error('Panoramica init failed:', e);
  var mp = document.querySelector('.main-panel');
  var loader = document.getElementById('pageLoader');
  if (loader) {
    loader.innerHTML = '<div class="page-loader-logo" style="color:var(--red)">Errore</div><p style="font-size:14px;color:var(--text-soft);margin:12px 0 0;font-family:\'Inter\',sans-serif">Impossibile caricare la dashboard. Ricarica la pagina.</p><p style="font-size:11px;color:var(--text-faint);margin:4px 0 0;font-family:\'Inter\',sans-serif">' + (e.message || 'Errore sconosciuto') + '</p>';
  }
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }
});
