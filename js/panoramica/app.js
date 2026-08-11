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

// ── Panel switching (CSS toggle — DOM stays, no destroy/re-render, like original) ──
function switchPanel(name) {
  if (currentPanel === name) return;

  var next = panels[name];
  if (!next || !next.module) { console.warn('Unknown panel:', name); return; }

  if (!panelContainer) {
    panelContainer = document.getElementById('panelContainer');
    if (!panelContainer) { console.error('panelContainer not found'); return; }
  }

  // Hide current panel
  if (currentPanel) {
    var prevWrap = document.getElementById('panel-' + currentPanel);
    if (prevWrap) prevWrap.style.display = 'none';
  }

  // Target panel wrapper (pre-rendered by preloadAllPanels)
  var wrapId = 'panel-' + name;
  var wrap = document.getElementById(wrapId);

  // If panel not preloaded yet (clicked during loading), skip quietly
  if (!wrap) return;

  // Show target panel
  wrap.style.display = '';

  // Re-apply active class (theme-2.js removes it from ALL .content-panel on every click)
  var panelEl = wrap.querySelector('.content-panel');
  if (panelEl) panelEl.classList.add('active');

  var previousPanel = currentPanel;
  currentPanel = name;
  window._currentPanel = name;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(function (link) {
    var panel = link.getAttribute('data-panel');
    if (panel === name) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  // Update hash
  if (window.location.hash !== '#' + name) {
    history.replaceState(null, '', '#' + name);
  }

  emit('panel:switch', { from: previousPanel, to: name });
}

// ── Hash-based routing ──
function handleHash() {
  var hash = window.location.hash.replace('#', '');
  // Map old hash patterns to panel names
  var hashMap = {
    'report-ai': 'report-ai',
    'impostazioni': 'impostazioni',
    'aiuto': 'aiuto',
    'profilo': 'profilo'
  };
  var panel = hashMap[hash] || hash;
  if (panels[panel]) {
    switchPanel(panel);
  }
}

// ── Set up sidebar navigation (direct handlers — no event delegation for Safari compat) ──
function setupNavigation() {
  var links = document.querySelectorAll('.sidebar-link[data-panel]');
  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var panel = link.getAttribute('data-panel');
      if (panel) {
        switchPanel(panel);
      }
    });
  });
}

// ── Set up user dropdown panel links ──
function setupDropdownLinks() {
  // The dropdown links use inline onclick that dispatches events.
  // We intercept those and route through switchPanel instead.
  document.addEventListener('click', function (e) {
    // Check for dropdown items that reference panels via data-panel attribute lookups
    // These were inline onclicks in the original — kept for backward compat
  });
}

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

  // Render all panels in parallel
  await Promise.all(names.map(async function (name) {
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
      try {
        await entry.module.render(wrap);
        entry.loaded = true;
      } catch (e) {
        console.error('render error for', name, ':', e);
        wrap.innerHTML = '<p style="padding:40px;color:var(--text-faint);text-align:center">Errore nel caricamento.</p>';
        return;
      }
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

    // Init
    if (entry.module.init) {
      try { await entry.module.init(); } catch (e) { console.error('init error for', name, ':', e); }
    }

    done++;
  }));

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
    try { window._sottotitoliProfile = await SottotitoliData.getProfile(); } catch (e) { console.warn('getProfile failed:', e.message); window._sottotitoliProfile = null; }
    window.profile = window._sottotitoliProfile;
    try { window.statsEN = await SottotitoliData.getSessionStats('en'); } catch (e) { console.warn('statsEN failed:', e.message); window.statsEN = null; }
    try { window.statsIT = await SottotitoliData.getSessionStats('it'); } catch (e) { console.warn('statsIT failed:', e.message); window.statsIT = null; }
    try { window.refs = await SottotitoliData.getReferralStats(); } catch (e) { console.warn('refs failed:', e.message); window.refs = null; }
    try { window.reports = await SottotitoliData.getAIReports(); } catch (e) { console.warn('reports failed:', e.message); window.reports = []; }
    try { window.tokens = await SottotitoliData.getAITokens(); } catch (e) { console.warn('tokens failed:', e.message); window.tokens = 0; }
    try { window.credits = await SottotitoliData.getCredits(); } catch (e) { console.warn('credits failed:', e.message); window.credits = null; }
    try { window._sottotitoliPrefs = await SottotitoliData.getPreferences(); } catch (e) { console.warn('prefs failed:', e.message); window._sottotitoliPrefs = null; }
    try { window.cefrBreakdown = await SottotitoliData.getCEFRBreakdown(); } catch (e) { console.warn('cefr failed:', e.message); window.cefrBreakdown = null; }

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

  // Set up navigation
  setupNavigation();
  setupDropdownLinks();

  // ── Preload ALL panels (no lazy loading — everything renders upfront) ──
  await preloadAllPanels();

  // Hide loading screen (multiple methods for reliability)
  var loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'none';
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }

  // Route to initial panel
  var hash = window.location.hash.replace('#', '');
  var initialPanel = hash && panels[hash] ? hash : 'panoramica';
  switchPanel(initialPanel);

  // Listen for hash changes
  window.addEventListener('hashchange', handleHash);

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

// ── Start ──
init().catch(function (e) {
  console.error('Panoramica init failed:', e);
  var mp = document.querySelector('.main-panel');
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }
});
