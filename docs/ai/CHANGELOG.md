# Changelog

## [2026-08-12] Legacy Globals Restoration — every panel button works again (v210)

### Fixed
- **js/panoramica/shared/legacy-globals.js** (new) — restores all `window.*` functions the panel HTML inline handlers expect. The ES-module refactor had extracted the panel HTML but left the implementations in the old `panoramica-v1.html` mega-script → dozens of `Uncaught ReferenceError` on click. Restored: profile referral/avatar set, `selectMetricCard` + per-metric chart, vocab expand search (Datamuse), bank selector/create, CEFR topic DOM actions, wordbank review bulk set, `newWordbank`, `showToastMsg`, and recreated the `wbImportPopup`/`wbCreatePopup` markup that was lost entirely.
- Supabase 400s fixed against verified schema: `user_wordbanks` (`language`→`lang`, no `word_count`/`updated_at`), `session_ai_reports` (no `session_count`), `ai_report_requests` insert (`module_id`/`module_key`→`family_key`).
- CSP `connect-src` extended with `api.datamuse.com` + `api.dictionaryapi.dev`.
- Verified in browser: all metric cards switch + chart redraws, import popup opens, Datamuse returns suggestions, zero page errors. Cache buster `?v=13`→`?v=14`.

## [2026-08-12] Progressive Panel Build — interactive after one panel (v208)

### Changed
- **js/panoramica/app.js** — Replaced parallel `preloadAllPanels()` (all 8 panels before reveal, loader up ~400ms+) with `buildPanel(name)`. `init()` builds ONLY the initial panel, hides the loader, shows it, then builds the other 7 in the background. A queued click on a not-yet-built panel reveals it the moment it finishes building.
- Closed the last dead window: clicks during preload used to register invisibly because `#panelContainer` is `display:none` while `.js-loading`. Now the page is interactive after ONE panel (~50–170ms).
- Per-panel error isolation kept: `init()` failures log and continue. Cache buster `?v=12` → `?v=13`.
- Root-cause chain so far: 20s init delay (v206: panels first, data in background) → early-click ReferenceError (v207: head-defined `showPanel` stub) → invisible preload window (v208: progressive build).

## [2026-08-12] Fast-Click Fix — showPanel defined before the sidebar exists (v207)

### Fixed
- **panoramica.html** — `showPanel()` is now a ~25-line inline script in `<head>`, parsed before the sidebar buttons exist. Previously it was only defined when the ES module `app.js` finished executing, so a click in the first ~0.1–1.5s threw `ReferenceError: showPanel is not defined` and silently did nothing (proven via Playwright pageError capture). Early clicks now either work immediately or queue in `window._pendingPanel` and are applied by `init()` after preload.
- **js/panoramica/app.js** — Removed the duplicate `showPanel`/`showPanelNow` definitions. The head script is now the single owner of switching logic; app.js only sets `window.__panelSwitchHook` to track `currentPanel` and emit `panel:switch`. Cache buster `?v=11` → `?v=12`.
- Root-cause chain so far: 20s init delay (v206: panels render first, data loads in background) + early-click ReferenceError (v207: head-defined stub). After load, switching is pure `display` toggling and cannot fail.

## [2026-08-11] Panoramica Architecture Restructure — Monolith to ES Modules

### Changed
- **panoramica.html** — Reduced from 12,411 lines / 828KB to ~2,000 lines / 118KB (85.7% reduction)
- All 10 dashboard panels extracted into `js/panoramica/panels/*.js` — one ES module per panel
- 6 shared utility modules in `js/panoramica/shared/` (dom, supabase, formatters, components, events, state)
- New panel router `js/panoramica/app.js` replaces the 6,000-line mega-script
- Sidebar navigation uses event delegation on `.sidebar` container
- i18n MutationObserver fixed — uses `_pendingApply` retry instead of silently dropping mutations
- Quiz Maker removed entirely (both copies, ~1,000 lines)
- Dashboard panel uses full original HTML (hero banner, vocab search, streak card, glass cards, metrics, chart)
- Sessions, Word Banks, Vocab Builder, Report AI, Settings, Help, Profile, Grammar Hub, AI Voice panels render full original HTML
- Panel switching: explicit `panelContainer.innerHTML = ''` before each render
- Backup preserved as `panoramica-v1.html`
- See `AGENTS.md` for updated architecture docs

## [2026-08-06] Word Bank Overview — Bento Grid Layout

### Changed
- **panoramica.html** — Restructured the Overview subtab (`#sub-wb-overview-panel`) layout from a 2×2 card grid to a bento grid (12-column asymmetric layout inspired by stitch mockup)
- Row 1: CEFR Distribution (8 cols) + Known Stats sidebar (4 cols)
- Row 2: Favorite Collections + Import CTA (8 cols) + Quick Tip card (4 cols)
- Row 3: Full Library (full width, 12 cols)
- CSS rewritten to use page CSS variables (`--panel`, `--text`, `--cyan`, etc.) for day/night mode support
- All element IDs preserved: `wbCefrDistAll`, `wbCefrCountAll`, `wbCefrDistKnown`, `wbCefrCountKnown`, `wbPinnedGrid`, `wbFullLibrary`, and all `*Total` elements
- `wb-glass` class preserved for JS compatibility with `renderWbOverviewSections()`
- Mobile: single-column at ≤900px

## [2026-08-05] Documentation System Overhaul

### Added
- `docs/ai/` folder with 11 interlinked agent reference docs
- New `docs/ai/README.md` documentation index
- Architecture, coding procedures, solve-mistakes, CSS theme guide, testing checklist, deploy runbook, brand voice, business info, glossary, pages directory

### Changed
- `AGENTS.md` rewritten as definitive hub with cross-references
- `CLAUDE.md` simplified to redirect stub
- `README.md` updated with documentation map
- `docs/ROADMAP.md` updated to reflect current priorities
- 12 outdated docs moved to `docs/archive/`
- `DESIGN-INDEX.md` removed (superseded by DESIGN.md)

## [Unreleased — Previous]

### Added
- README files for all three repositories
- `.gitignore` files for all three repositories
- `.env.example` files for websocket and learning services
- `SECURITY.md` with vulnerability reporting and key management policy
- `CONTRIBUTING.md` with setup and PR checklist
- `CHANGELOG.md` (this file)
- `js/config.example.js` — configuration template for frontend

### Changed
- `sitemap.xml` — updated URLs from caption.ninja to sottotitoli
- `robots.txt` — fixed stale sitemap URL
- `404.html` — replaced Appland template branding with Sottotitoli
- `CLAUDE.md` — replaced Caption.Ninja docs with Sottotitoli-specific agent guidance
- `js/auth.js` — redirect URLs now read from config

### Fixed
- Redirect URLs in auth no longer hardcoded
- OpenAI errors no longer leaked to clients
