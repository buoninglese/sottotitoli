# AGENT TASK — Rebuild the panoramica sidebar nav as hash routing

> **Hand this whole file to the implementing agent.** It is self-contained: it does
> not depend on any prior conversation. Read it top to bottom, then execute.

---

## 0) KICKOFF PROMPT (what the agent is being asked to do)

You are working in the repository `sottotitoli` — a **static** HTML/CSS/JS web app
(no build step, no framework, deployed from `main` to GitHub Pages). UI text is
Italian; code comments are English.

Your task: **replace the custom JavaScript click-router that switches the left
sidebar tabs on `panoramica.html` with the standard, robust "hash routing"
pattern.** The tabs currently misfire intermittently ("you have to click a tab
several times before it responds"). The goal is to make tab switching bulletproof
by letting the **browser** drive navigation through the URL hash, instead of custom
click handling.

Do **exactly** the edits in section 5. Do **not** redesign anything else. Then run
every check in section 6 and confirm they pass. If any check fails, fix it before
finishing. If you cannot make a check pass, **stop and report** — do not invent new
architecture.

---

## 1) WHY (root cause — so you understand the goal, not to re-investigate)

A browser only fires a `click` event when `mousedown` **and** `mouseup` happen on
the same element. The current nav also had a hover animation that moved the link,
and it wired click handlers only at the very end of a long async page-load. Both
make clicks unreliable. The moving-hover part is already fixed in CSS. This task
fixes the routing part, permanently, by removing the reliance on the `click` event
altogether:

- The links become real anchors: `<a href="#trascrizioni">`.
- Clicking an anchor makes the **browser** set `location.hash` — this happens
  natively and **cannot be "lost"**, even mid page-load, even before JS is ready.
- A single `hashchange` listener renders whichever panel the hash names.
- Back/forward buttons and deep links (`panoramica.html#impostazioni`) work for free.

This is how mainstream apps do sidebar/tab navigation. It deletes ~50 lines of
fragile bookkeeping (delegation, `pendingPanel`, "wire early / re-assert late").

---

## 2) SCOPE — files you may edit

1. `js/panoramica/app.js`  — replace the routing layer (full new file provided).
2. `panoramica.html`       — change 9 sidebar link `href`s + bump 2 version strings.

**Do NOT touch anything else.** Specifically do NOT edit:
`js/panoramica/panels/*.js`, `js/panoramica/shared/*.js`, `css/theme-2.css`
(it is shared by 6 other pages), `css/panoramica.css`, `js/data-service.js`,
or any other page. Do NOT add a build step or any dependency.

---

## 3) HARD CONSTRAINTS (must all stay true)

- Keep the `data-panel="<key>"` attribute on every sidebar link — other inline code
  in `panoramica.html` and the `showPanel` function read it.
- Keep `window.switchPanel(name)` working as a global — the top-bar user-dropdown
  buttons call it via inline `onclick="switchPanel('impostazioni')"`, and external
  deep links use `panoramica.html#aiuto`.
- Keep the disabled **AI Voice** link inert. It has inline
  `style="...pointer-events:none;..."` — leave that; leave its `href="#"` as-is.
- Do NOT change `preloadAllPanels()`, `updateDropdown()`, the data-loading block,
  or the `i18n-changed` listener in `app.js`. Only the routing/nav parts change.
- Panel keys (the 10 valid values, used as both `data-panel` and hash) are exactly:
  `panoramica`, `wordbanks`, `vocabulary-builder`, `grammar-hub`, `trascrizioni`,
  `report-ai`, `ai-voice`, `profilo`, `impostazioni`, `aiuto`.
- The panel DOM wrappers have ids of the form `panel-<key>` (e.g. `panel-trascrizioni`).
  The hash is the bare key (e.g. `#trascrizioni`). Do not conflate them.
- After editing `app.js` you MUST bump its cache-buster in `panoramica.html`
  (`?v=2` → `?v=3`) or browsers will keep the old file. Also bump the visible
  version marker (`v199` → `v200`) so a fresh load is verifiable at a glance.

---

## 4) TARGET DESIGN (how it will work after your change)

- The **URL hash is the single source of truth** for the active panel.
- `panelFromHash()` reads `location.hash`, returns a valid key (default `panoramica`).
- `showPanel(name)` does the DOM work: hide all `panel-*` wrappers, show the target,
  set the `.active`/`aria-current` state on the matching sidebar link, emit the event.
  It is idempotent and returns early if the panel isn't rendered yet.
- `route()` = `showPanel(panelFromHash())`.
- `window.addEventListener('hashchange', route)` — the ONLY thing that triggers a
  panel change. Registered at module load, so it is live immediately.
- `window.switchPanel(name)` (for dropdowns / back-compat) simply sets
  `location.hash = '#'+name`, which fires `hashchange` → `route()`. One code path.
- Sidebar links are `<a href="#<key>">` — the browser sets the hash on click. There
  is **no** JavaScript click handler on the sidebar anymore.
- At the end of `init()` (after panels are rendered) call `route()` once. If the user
  clicked a tab during load, the browser already put it in the hash, so it is honored.

---

## 5) EXACT CHANGES

### 5A) `js/panoramica/app.js` — REPLACE THE ENTIRE FILE with this

> Replacing the whole file is intentional and safest. The only differences vs the
> current file are: removed `pendingPanel`, removed `setupSidebar` + its two calls,
> `switchPanel` split into `panelFromHash`/`showPanel`/`route`, and the bottom
> wires `hashchange` + a hash-setting `window.switchPanel`. Everything else
> (imports, `panels`, `updateDropdown`, `preloadAllPanels`, `init`'s data loading)
> is unchanged — do not "improve" it.

```javascript
// js/panoramica/app.js — Panel router + initialization
// Each panel is a separate ES module. Navigation is hash-based: the URL hash is
// the single source of truth for the active panel. Sidebar links are real
// <a href="#key"> anchors, so the BROWSER sets the hash on click — clicks can't
// be lost, and back/forward + deep links work for free.

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

// ── Routing: the URL hash is the single source of truth ──────────────────────
// Sidebar links are <a href="#key">, so the browser sets location.hash on click
// (even before this module runs). We only react to the hash — never to raw clicks.

function panelFromHash() {
  var key = (location.hash || '').replace(/^#\/?/, ''); // accepts "#key" and "#/key"
  return panels[key] ? key : 'panoramica';
}

// Do the DOM work to show a panel. Idempotent; safe to call anytime.
function showPanel(name) {
  if (!panels[name]) name = 'panoramica';
  if (currentPanel === name) return;

  var wrap = document.getElementById('panel-' + name);
  if (!wrap) return; // panels not rendered yet — init() calls route() after preload

  var previousPanel = currentPanel;

  // Hide ALL wrappers, show target
  var wrappers = document.querySelectorAll('[id^="panel-"]');
  for (var i = 0; i < wrappers.length; i++) wrappers[i].style.display = 'none';
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

// Render whatever the current hash points to.
function route() { showPanel(panelFromHash()); }

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
    // Skipped for vocabulary-builder (has its own delegation in panoramica.html)
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
  var failed = results.filter(function (r) { return r.status === 'rejected'; });
  if (failed.length > 0) {
    console.error(failed.length + ' panel(s) failed to load:');
    failed.forEach(function (r) { console.error('  ', r.reason); });
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

  // Load user data (with error resilience)
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
    // getSession (no shared state), so they are independent. Per-call try/catch
    // keeps the exact same fallback values.
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

  // ── Preload ALL panels (everything renders upfront) ──
  await preloadAllPanels();

  // Hide loading screen
  var loader = document.getElementById('pageLoader');
  if (loader) loader.style.display = 'none';
  if (mp) {
    mp.classList.remove('js-loading');
    mp.classList.add('js-ready');
  }

  // Render the panel the URL hash points to. If the user clicked a tab during
  // load, the browser already put it in the hash, so it is honored here.
  route();

  // Listen for i18n changes to update panels
  window.addEventListener('i18n-changed', function (e) {
    if (currentPanel && panels[currentPanel] && panels[currentPanel].module.rerender) {
      try { panels[currentPanel].module.rerender(); } catch (e) {}
    }
  });

  console.log('Panoramica router initialized. Active panel:', currentPanel);
}

// ── Public / programmatic navigation (topbar dropdown, back-compat) ──
// Setting the hash is the ONLY way panels change → one code path, always in sync.
window.switchPanel = function (name) {
  if (location.hash === '#' + name) { route(); return; } // already there; ensure rendered
  location.hash = '#' + name;
};

// React to hash changes from link clicks, dropdowns, back/forward, and deep links.
// Registered at module load, so navigation works from first paint.
window.addEventListener('hashchange', route);

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
```

### 5B) `panoramica.html` — change the 9 enabled sidebar link `href`s

Each sidebar link currently looks like `<a class="nav-item sidebar-link" href="#" data-panel="KEY" ...>`.
Change **only** the `href="#"` to `href="#KEY"` — using the value already in that
link's own `data-panel`. Do NOT change anything else on the line (classes, icons,
`data-panel`, `title`, badges).

Apply these exact replacements (find → replace). Each `href="#"` is on the same
line as its `data-panel`, so match by the `data-panel` to hit the right one:

| Link (identified by its `data-panel`) | change `href="#"` to |
|---|---|
| `data-panel="panoramica"`        | `href="#panoramica"` |
| `data-panel="wordbanks"`         | `href="#wordbanks"` |
| `data-panel="vocabulary-builder"`| `href="#vocabulary-builder"` |
| `data-panel="grammar-hub"`       | `href="#grammar-hub"` |
| `data-panel="trascrizioni"`      | `href="#trascrizioni"` |
| `data-panel="report-ai"`         | `href="#report-ai"` |
| `data-panel="profilo"`           | `href="#profilo"` |
| `data-panel="impostazioni"`      | `href="#impostazioni"` |
| `data-panel="aiuto"`             | `href="#aiuto"` |

**Leave the `data-panel="ai-voice"` link's `href="#"` UNCHANGED** — it is disabled
(`pointer-events:none`) and must stay inert.

Concretely, the first two become:

```html
<a class="nav-item sidebar-link active" href="#panoramica" data-panel="panoramica" aria-current="page" title="Panoramica"><div class="bg-pill"></div><span class="material-symbols-outlined">grid_view</span><span data-i18n="panoramica">Panoramica</span></a>
<a class="nav-item sidebar-link" href="#wordbanks" data-panel="wordbanks" title="Banche parole"><div class="bg-pill"></div><span class="material-symbols-outlined">style</span><span data-i18n="word_banks">Banche parole</span></a>
```

### 5C) `panoramica.html` — bump the app.js cache-buster

Find:  `<script type="module" src="js/panoramica/app.js?v=2"></script>`
Replace: `<script type="module" src="js/panoramica/app.js?v=3"></script>`

(If your copy still says `app.js` with no `?v=`, change it to `app.js?v=3`.)

### 5D) `panoramica.html` — bump the visible version marker

Find the topbar version span text `v199` and change it to `v200`. It is inside a
`<span class="topbar-version" ...>v199</span>`. Change only the number.

---

## 6) VERIFICATION — run ALL of these; every one must pass

### 6.1 Syntax
```bash
node --check js/panoramica/app.js
```
Expect: no output / exit 0. If it errors, you made a typo — fix it.

### 6.2 Sanity greps
```bash
# app.js must no longer contain the removed machinery:
grep -n "pendingPanel\|setupSidebar" js/panoramica/app.js   # expect: NO matches
# app.js must contain the new routing:
grep -n "panelFromHash\|function route\|hashchange" js/panoramica/app.js  # expect: matches
# every enabled sidebar link now has a real hash href:
grep -oE 'href="#[a-z-]+" data-panel="[a-z-]+"' panoramica.html   # expect: 9 lines, key matches
# cache-buster + version bumped:
grep -n 'app.js?v=3' panoramica.html    # expect: 1 match
grep -n '>v200<' panoramica.html        # expect: 1 match
```

### 6.3 Run the app and test in a browser
```bash
python3 serve.py     # serves http://localhost:8000
```
Open `http://localhost:8000/panoramica.html?bypass_auth=1` (the `bypass_auth=1`
query loads a mock session so the dashboard renders without logging in; data calls
will fail with harmless 401s — that is expected locally).

Then verify by hand:
1. Click **every** enabled tab once. Each must switch on the **first** click, the
   panel content must change, the active highlight must move, and the URL must show
   `#<key>` (e.g. `...panoramica.html?bypass_auth=1#trascrizioni`).
2. Press the browser **Back** button repeatedly → it walks back through the panels
   you visited. **Forward** walks forward. (This is the payoff of hash routing.)
3. Open a deep link fresh: `http://localhost:8000/panoramica.html?bypass_auth=1#impostazioni`
   → it must load directly on the Impostazioni (Settings) panel.
4. Open the **top-right account dropdown** (person icon) and click "Sessioni salvate",
   "Impostazioni", "Aiuto" → each switches the matching panel (this exercises the
   `window.switchPanel` path).
5. The disabled **AI Voice** tab must do nothing when clicked.
6. Open DevTools Console → there must be **no red errors** (the 401 warnings from the
   mock session are fine).
7. Hover a tab and click quickly, several tabs in a row — every single click must
   register. There must be no "click twice" behavior and the link must NOT visibly
   slide sideways on hover.

### 6.4 Automated console check (paste into DevTools Console on the page above)
```javascript
(async () => {
  const keys = ['wordbanks','trascrizioni','panoramica','profilo','impostazioni','grammar-hub','report-ai','vocabulary-builder','aiuto'];
  const vis = () => [...document.querySelectorAll('[id^="panel-"]')]
    .filter(w => getComputedStyle(w).display !== 'none')
    .map(w => w.id.replace('panel-','')).join(',');
  const out = [];
  for (const k of keys) {
    location.hash = '#' + k;
    await new Promise(r => setTimeout(r, 150));
    out.push({ key: k, shown: vis(), hash: location.hash, ok: vis() === k && location.hash === '#' + k });
  }
  console.table(out);
  console.log('ALL PANELS OK:', out.every(o => o.ok));
})();
```
Expect: `ALL PANELS OK: true`, and every row `ok: true`.

### 6.5 Repo checklist (from AGENTS.md)
- Test at desktop width (≥1200px) **and** narrow width (<1160px — the sidebar
  collapses to icons; tabs must still switch on first click).
- Test in **day and night** mode (theme toggle, top-right).
- Confirm `config.js` is NOT staged in git (`git status` — it may appear modified;
  do not add it).

---

## 7) COMMIT

Only if every check in section 6 passes:
```bash
git add js/panoramica/app.js panoramica.html
git commit -m "refactor(panoramica): hash-based sidebar routing (robust tab switching)

Replace the custom click-delegation router with standard URL-hash routing.
Sidebar links are now real <a href='#key'> anchors, so the browser sets the
hash on click natively — clicks can no longer be lost (even during load), and
back/forward + deep links work. Removes setupSidebar delegation and the
pendingPanel deferral; window.switchPanel now just sets the hash. Bump app.js
cache-buster to v3 and version marker to v200."
# Push only if the human asked you to; this repo deploys main to production.
```

## 8) ROLLBACK (if something is wrong and you must revert)
```bash
git checkout -- js/panoramica/app.js panoramica.html   # discard uncommitted changes
# or, if already committed:
git revert HEAD
```

---

## 9) WHAT SUCCESS LOOKS LIKE
Clicking any sidebar tab switches instantly on the first click, every time; the URL
reflects the current panel; back/forward and deep links work; there is no JS click
handler on the sidebar; `app.js` has no `pendingPanel`/`setupSidebar`; all checks in
section 6 pass. Do not add features beyond this. If in doubt, prefer the smallest
change that satisfies section 6.
