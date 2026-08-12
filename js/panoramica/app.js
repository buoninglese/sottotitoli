// js/panoramica/app.js — Panel router + initialization
// Replaces the 6,000-line mega-script. Each panel is a separate ES module.
// See /memories/session/plan.md for architecture details.

import { showToast } from './shared/dom.js';
import { waitForSupabase, getSupabase } from './shared/supabase.js';
import { formatDate, formatDuration, formatNumber, statusBadge } from './shared/formatters.js';
import { emit, on } from './shared/events.js';
import { store, updateStore, syncWindowGlobals } from './shared/state.js';
import './shared/legacy-globals.js'; // restores window.* handlers lost in the refactor

// ── Panel imports (preloaded — all available instantly, no race conditions) ──
import * as dashboardPanel from './panels/dashboard.js';
import * as profilePanel from './panels/profile.js';
import * as sessionsPanel from './panels/sessions.js';
import * as wordbanksPanel from './panels/wordbanks.js';
import * as vocabBuilderPanel from './panels/vocab-builder.js';
import * as reportAiPanel from './panels/report-ai.js';
import * as settingsPanel from './panels/settings.js';
import * as helpPanel from './panels/help.js';

// ── Panel registry ──
var panels = {
  'panoramica': { module: dashboardPanel, loaded: false },
  'profilo': { module: profilePanel, loaded: false },
  'trascrizioni': { module: sessionsPanel, loaded: false },
  'wordbanks': { module: wordbanksPanel, loaded: false },
  'vocabulary-builder': { module: vocabBuilderPanel, loaded: false },
  'report-ai': { module: reportAiPanel, loaded: false },
  'impostazioni': { module: settingsPanel, loaded: false },
  'aiuto': { module: helpPanel, loaded: false }
};

var currentPanel = null;
var panelContainer = null;

// ── Panel switching ──
// The REAL showPanel() is defined in an inline script in panoramica.html
// <head>, so it exists before the sidebar buttons are parsed — early clicks
// can never throw "ReferenceError: showPanel is not defined". It queues
// pre-preload requests in window._pendingPanel.
// Here we only hook it to track currentPanel + emit panel:switch.
window.__panelSwitchHook = function (from, to) {
  currentPanel = to;
  emit('panel:switch', { from: from, to: to });
};

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

// ── Build ONE panel: wrapper + render + script injection + subtab wiring + init ──
// Panels are built progressively: init() builds the initial panel first (fast,
// loader gone in <100ms), then the rest in the background. If a panel finishes
// while it is the queued request (user clicked it before it existed), show it
// immediately.
async function buildPanel(name) {
  var entry = panels[name];
  if (!entry || !entry.module) return;

  var wrap = document.getElementById('panel-' + name);
  if (wrap) return; // already built

  wrap = document.createElement('div');
  wrap.id = 'panel-' + name;
  wrap.style.display = 'none';
  if (panelContainer) panelContainer.appendChild(wrap);

  if (entry.module.render) {
    await entry.module.render(wrap);
    entry.loaded = true;
  }

  // ── Universal script injection (innerHTML scripts don't execute) ──
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

  // Init (failures isolated — one bad panel never blocks the page)
  if (entry.module.init) {
    try { await entry.module.init(); } catch (e) { console.warn('Panel ' + name + ' init failed:', e); }
  }

  // If the user requested this panel before it existed, reveal it now
  if (window._pendingPanel === name) {
    window._pendingPanel = null;
    window.showPanel(name);
  }
}

// ── Main initialization ──
async function init() {
  panelContainer = document.getElementById('panelContainer');

  // Show loading state
  var mp = document.querySelector('.main-panel');
  if (mp) mp.classList.add('js-loading');

  // Decide which panel to show first (honor queued click + URL hash)
  var hash = window.location.hash.replace('#', '');
  var initialPanel = window._pendingPanel || (hash && panels[hash] ? hash : null) || 'panoramica';
  window._pendingPanel = null;

  // ═══ STEP 1: Build ONLY the initial panel (~50ms), then reveal the page ═══
  // The loader disappears as soon as the first panel exists — clicks after this
  // point always have a visible target. Remaining panels build in the background.
  try { await buildPanel(initialPanel); } catch (e) { console.error('Panel ' + initialPanel + ' failed:', e); }

  var loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'none';
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }
  window.showPanel(initialPanel);

  // ═══ STEP 2: Build the other 7 panels in the background (non-blocking) ═══
  // A queued click on a not-yet-built panel is revealed the moment it finishes.
  Object.keys(panels).forEach(function (name) {
    if (name === initialPanel) return;
    buildPanel(name).catch(function (e) { console.error('Panel ' + name + ' failed:', e); });
  });

  // ═══ STEP 3: Load user data ASYNCHRONOUSLY (non-blocking — panels update when ready) ═══
  loadUserData().then(function (meta) {
    // Data arrived — refresh current panel if it supports rerender
    if (currentPanel && panels[currentPanel] && panels[currentPanel].module.rerender) {
      try { panels[currentPanel].module.rerender(); } catch (e) {}
    }
  });

  // Listen for i18n changes to update panels
  window.addEventListener('i18n-changed', function (e) {
    // Re-render current panel if it supports it
    if (currentPanel && panels[currentPanel] && panels[currentPanel].module.rerender) {
      try { panels[currentPanel].module.rerender(); } catch (e) {}
    }
  });

  console.log('Panoramica router initialized. Active panel:', currentPanel);
}

// ── Load all user data in the background. Panels render without it and
//    refresh when it arrives (via rerender + panel:switch listeners). ──
async function loadUserData() {
  // Wait for Supabase
  var sb = await waitForSupabase();
  if (!sb) { console.warn('Supabase not loaded — rendering offline'); return null; }

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
      return meta;
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
    // Fetch all user data CONCURRENTLY.
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
  return meta;
}

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
