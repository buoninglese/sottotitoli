# Changelog

> ## ⚠️ ARCHIVED — ES-module refactor (2026-08-12)
> The entries below from v206–v210 describe an **ES-module refactor** (`js/panoramica/app.js` + `panoramica/panels/*.js` + `panoramica/shared/*.js`) that **never shipped**. `panoramica.html` never imported `app.js`, so the deployed site always ran the ~10,700-line inline monolith. The refactor files were dead code and have been **moved to** `~/Desktop/sottotitoli-archived/dead-js/panoramica-v2-attempt/`.
> **Real current state: monolith at v178.** These v2xx notes describe work that was never activated — treat them as historical, not as a description of the live code.

## [2026-08-13] Wrapped Copy Desk — 4 copy voices for the year recap (dev tool)

### Added
- New dev tool `dev/wrapped-copy-desk.html` (linked from `dev/dashboards.html` as card #14): an **option desk** for the copy of the "Il tuo anno in numeri" Wrapped recap — the "meh" copy now has real alternatives to choose from.
- **4 full-recap copy voices**, every string covered (hero + dynamic branches, totals fact/fun, all 7 personas, CEFR, category/palette, peak + chips, share):
  - **Current** — production baseline (verbatim).
  - **A · Gen-Z / Wrapped** — slang, meme-forward, "main character" energy (Spotify-Wrapped-like).
  - **B · Coach / Motivational** — warm second person, "you built this".
  - **C · Minimal / Data-poetic** — understated, numbers first, few emojis.
- **Live preview** renders the selected voice into the real `wsc` mockup (reuses `theme-wrapped.css`), with theme pills (Gen-Z default), 📊/🎉 toggle and a data simulator; the **desk** shows all 4 voices side-by-side per field, click a cell (or a voice tab) to apply it to the preview.
- **Export** produces `wrapped-content-<voice>.json` (`{ wrappedContent }` shape, compatible with `wrapped-studio.html`) so a picked winner can be ported straight into the studio/production.
- Dev-only: production copy in `panoramica.html` / `js/i18n.js` untouched — pick winners here first, then port them.

## [2026-08-13] Sidebar — removed right border line on wrapped themes (v209)

### Fixed
- The left sidebar had a **1px right border** in all four wrapped themes (Modern / Modern Light / Gen-Z / Gen-Z Dark), which sat right next to the rounded `.main-panel` and broke the "rounded box" look the user wanted.
- Cause: `css/theme-wrapped.css` — the generic wrapped layer set `.sidebar { border-right: var(--sidebar-border-w) solid var(--sidebar-border-c) }` (tokens defaulted to `1px` per theme) plus a hardcoded `[data-theme="genz"] .sidebar { border-right: 1px solid rgba(255,255,255,.15) !important }`.
- Fix: zeroed `--sidebar-border-w` (1px → 0) in all four wrapped theme token blocks and changed the Gen-Z hardcoded rule to `border-right: 0 !important`. Base light/dark themes were unaffected (they never had the border).
- Verified in browser: `getComputedStyle(.sidebar).borderRightWidth === 0px` for all four wrapped themes. `theme-wrapped.css` cache-buster `?v=10 → ?v=11`.

## [2026-08-13] Learner — reoriented for Italians learning English + EN/IT subtabs + Progress dashboard (v197)

### Changed — this site is for Italians learning English
- **Two language subtabs** 🇬🇧 English / 🇮🇹 Italian on top of the Learner (persisted per-user, defaults to the app's study lang). Every pane (Path, Practice, Progress) + the Mission is now **per-language**:
  - **English tab** (primary): trains English words from `user_wordbanks lang='en'` + `review_words lang='en'`, translations/explanations in Italian, TTS + speech recognition use **en-US**.
  - **Italian tab** (reverse): trains Italian words, translations in English, TTS/recognition **it-IT**.
- **Engine is now direction-aware**: the player keeps its `it`/`en` slots (target word / translation) but each session carries `session.lang`, and `speak()`/`makeRecognition()`/speak-hint/match-description follow it. Language-specific copy ("Premi e parla in inglese", "Tocca la parola inglese…") via new i18n keys.
- **Fixed "Allena doesn't open the quiz":** word-bank ids are UUIDs, and the inline handler emitted `openBankTest(<uuid>)` as a bare identifier → `ReferenceError`. Bank cards now emit `openBankTest('<uuid>')` (quoted). Verified: clicking the card opens the session with no error.
- **Data layer is per-language**: `srcBanks(lang)`, `srcReview(kind, lang)`, `srcReviewAll(lang)` (full set for stats), `realPool(lang)`. `toItems` puts the target word in `it` and its translation in `en`. `openReview`/`openMission`/`newMission` take the active lang; mission cache key is per-language.
- **Practice uses real words** of the active language when signed in (falls back to the bundled course for logged-out preview).
- **Progress tab redesigned** (no more "childish"): real-data dashboard — XP/streak/today/sessions/missions stats, **per-language cards** (word-bank count + words, review words, avg mastery, due/fragile/new/mastered queue, **CEFR distribution bars**), a quick-open review queue, and recent-mistakes chips. `endSession` now marks `bank:<id>`/`review:<id>`/`mission:<id>` separately so session counts are correct.
- **Edge function `generate-learner-content`** now takes `target` ('en'|'it'): seeds from the target language's banks/review, generates content in the target language with translations in the explanation language (EN→Italian, IT→English), title/objective in Italian. Output schema is language-neutral (`word`/`translation`/`example_word`/`example_translation`).
- **i18n**: `learner_lang_en/it`, `learner_tap_mic_en`, `learner_match_desc_en`, `learner_review_mastered`, `learner_pr_*`, `learner_mistakes`. **CSS**: `.learner-langtabs`/`.learner-langtab`, `.pr-*` dashboard styles. learner.css `?v=6`, learner.js `?v=4`.
- ⚠️ Still not deployed (as of v195): the `learner_lessons` migration + `generate-learner-content` function.

## [2026-08-13] Learner — Phase 2: AI "Mission" path (v195)

### Added — objectives-driven, AI-generated lessons
- **Mission card at the top of the real path.** Logged-in users see a 🎯 "La tua missione" hero card: generates a personalized lesson with OpenAI **gpt-4o-mini**, seeded with the user's **real words** (word banks + spaced review) and adapted to their profile (`goal_primary`, `domain`, `native_lang`, `learning_profile`) and an **estimated CEFR band** (weighted average of their words' CEFR). A cached mission shows its title + SMART objective + Start; a ↻ button regenerates.
- **New edge function** `supabase/functions/generate-learner-content/index.ts` (JWT-authenticated like `vocab-lookup`, persists via service role). Reads profile + seed words server-side, builds the lesson (title/subtitle/objective + 6–10 words with examples + 4–6 turn dialogue), **persists to `learner_lessons`** and returns the row. Cost/speed: gpt-4o-mini.
- **New table** `supabase/migrations/20260813_learner_lessons.sql` — `learner_lessons(id, user_id, lesson_type, focus, title, subtitle, objective, content JSONB, source_profile, status, created_at, updated_at)` + RLS (own rows only).
- **Client flow** in `js/learner.js`: `missionCached/missionSave/generateMission/openMission/newMission` — caches the last lesson in `localStorage['sottotitoli-learner-mission']` so replay is free; plays through the existing engine (listen → speak → match → MC → **conversation**), `+10 XP` bonus, marks `mission:<id>` done.
- **Config**: `generateLearnerContentUrl` in `config.example.js` + `config.js`.
- **i18n**: `learner_mission*` keys (it + en). **CSS**: `.lr-mission-*` card styles. learner.css `?v=5`, learner.js `?v=3`.
- ⚠️ The edge function + table are **not yet deployed** — the card shows the error toast until `supabase functions deploy generate-learner-content` + the migration are applied. Until then the (cached) flow is fully testable with a stubbed fetch.

## [2026-08-13] Learner — real-data Phase 1: word banks + spaced review + site-style redesign (v193)

### Added — Learner now trains on YOUR words, not a fixed course
- **Word-bank bento (path tab):** when signed in, the path shows a card grid of every `user_wordbanks` row ("Le tue word bank"), each card = a trainable session (`openBankTest`). Cards show 🇮🇹/🇬🇧 lang badge + live word count (exact count query on `user_wordbank_words`) + a ✓ when trained. Clicking samples ≤12 words, enriches them (MyMemory translation + dictionary-proxy definition, cached), builds listen → speak → match → multiple-choice steps, and plays them through the existing lesson engine.
- **Spaced review cards:** the same path shows `review_words` breakdowns — ⏰ **Due now** (`next_review_at.lte.now` OR `is_new`), 🧩 **Fragile** (`mastery_score<40` OR `lapses>=2`), ✨ **New** (`is_new=true`) — each opens `openReview(kind)` with real review words as the source.
- **Real distractor pool:** multiple-choice options are now drawn from `realPool()` — the union of all the user's actual Italian words (banks + review) instead of the bundled course vocab.
- **Data layer:** `js/learner.js` gains `srcSb/srcUid/srcIsAuthed/learnerStudyLang/srcBanks/srcBankWords/srcReview/enrichWord/realPool` (all lazy + cached under `SRC`/`ENR`, reset on every `refresh()` via `srcReset()`).
- **Bundled course demoted to logged-out preview:** `renderBundledPath` only shows when no session (with a "Sign in to train with your real progress" hint); logged-in users with no banks/review see an empty state prompting them to build a word bank.
- **Layout redesign to fit the site:** new `lr-*` bento styles in `css/learner.css` (section heads with gradient tick, bank grid cards, review cards with count pills, dashed preview note) — card/panel aesthetic driven by the theme tokens, matching the rest of the app. cache-buster `?v=4` (css) / `?v=2` (js).
- **i18n:** new `learner_*` keys (wordbanks, review_due/fragile/new + subs, train, word_count, no_banks, login_hint, empty_path, bank_done, review_done…) in it + en.

## [2026-08-13] Gen-Z hero — vivid frosted glass (A+B) (v189)

### Changed
- **Gen-Z (bright) hero no longer renders grey.** The hardcoded `[data-theme="genz"] #heroBanner` background (`#667eea→#764ba2→#f093fb` — the mid-stop `#764ba2` is a desaturated grey-mauve) plus the 40%-opacity white/yellow `::before` wash washed the saturation out to grey.
- Now it's the **vivid frosted glass** (option A colors + option B glass, chosen in `dev/genz-hero-mockup.html`): `background:linear-gradient(135deg,rgba(255,46,159,.42),rgba(123,47,247,.42) 55%,rgba(47,123,255,.42))` + `backdrop-filter:blur(26px)`, lighter `::before` wash (opacity .22), keeping the white border/34px radius/shadow.
- `--hero-bg` token for genz updated to the same vivid stops (used by the generic layer / theme-studio). `css/theme-wrapped.css` cache-buster `?v=2`.

## [2026-08-13] Learner panel layout — fits the main box, no more long scroll (v187)

### Fixed
- **Learner now fits inside the main panel box** instead of growing into a very long page scroll. `#pnl-learner.active` becomes a flex column with `height:100%` + `overflow:hidden`; the hero and tabs stay pinned, and only the active sub-tab pane (`#sub-learner-*`) scrolls internally (`flex:1; overflow-y:auto`).
- **Compact path:** smaller unit cards, lesson nodes (52px→44px), connectors (26px→16px) and reduced margins, so the internal scroll is much shorter.
- **Lesson overlay fixed back to full-viewport.** The app's `.content-panel` `paneIn` animation persists `transform:translateY(0)`, which made the panel a containing block and trapped the `position:fixed` lesson overlay inside the panel (which, combined with the tall panel, contributed to the long-scroll feel inside lessons). `#pnl-learner` now uses a transform-free fade (`@keyframes learnerPaneIn`) so the overlay covers the whole viewport again.
- `css/learner.css` cache-buster bumped to `?v=3`.

## [2026-08-13] Learner tab — Duolingo-style guided Italian course (v185)

### Added
- **New sidebar tab "Learner"** (Learning section, `school` icon) — port of the `language-learning-app` (LinguaLeap) concept into the app, adapted to teach **Italian** (target language).
- **New files:** `js/learner-data.js` (Italian course data: 7 units / 21 lessons across Principiante · Intermedio · Avanzato, each with vocabulary + phrases + conversations), `js/learner.js` (engine), `css/learner.css` (themed via app CSS vars).
- **Path view:** daily goal, XP, streak hero + unit cards with lesson nodes (locked / available / done) and a 🏆 unit test node.
- **Lesson player** (full-screen overlay): listen (TTS it-IT) → speak (Web Speech it-IT) → matching → multiple choice → conversation, with progress bar, instant feedback and confetti on completion.
- **Practice tab:** quick quiz / pronunciation / matching drawn from learned words.
- **Progress tab:** XP, streak, lessons/units completed, per-level bars, mistake review list.
- Progress persists in `localStorage["sottotitoli-learner"]` (XP, streak, daily goal, completed lessons, unit test results, mistakes).
- i18n: `sidebar_learner` + ~40 `learner_*` keys in IT/EN; injected chrome translated via per-element `translateElement` (avoids the app's `I18n.apply` `_isTranslating` race). `#learner` hash deep-link supported.

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
