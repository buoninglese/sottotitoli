# ONBOARDING-S8T.MD — Onboarding Wizard Reference

> **For AI agents working with `onboarding.html`.** This file maps every slide, every function, every data key, and every pitfall. Read it before touching the file.

---

## 1. Identity

| Property | Value |
|----------|-------|
| **File** | `onboarding.html` |
| **Lines** | ~3,056 |
| **Purpose** | Multi-step onboarding wizard that collects user profile data before first use |
| **Auth required** | Yes — redirects to login if no session |
| **Local dev** | `http://localhost:8000/onboarding.html?mock=1` (bypasses auth) |
| **No build step** | Pure static HTML/CSS/JS — same as rest of project |

## 2. Slide Map (15 slides, 0-indexed)

| # | Slide | Type | Key Data Collected |
|---|-------|------|-------------------|
| 0 | Welcome + consent | Gate | `terms_consent`, `terms_consent_at` |
| 1 | How did you hear about us | Single-select pills | `heard_from`, `heard_from_other` |
| 2 | Profession | Single-select pills | `profession`, `profession_other` |
| 3 | Native language + UI language | Dropdown + single-select | `native_lang`, `native_lang_other`, `ui_language` |
| 4 | Why do you speak English | Multi-select pills | `why_english`, `why_english_other` |
| 5 | Other languages spoken + want to improve | Multi-select (max 4 each) | `spoken_languages`, `spoken_languages_other`, `improve_languages`, `improve_languages_other` |
| 6 | Difficulties in English | Multi-select pills | `difficulties`, `difficulties_other` |
| 7 | Microphone test | Interactive | `mic_tested`, `mic_permission_granted` |
| 8 | Tell me about yourself (intake) | Voice record + textarea | `intake_transcript` |
| 9 | Long-term goal | Voice record + textarea | `long_term_goal`, `longterm_transcript` |
| 10 | Short-term goals | Voice record + textarea | `short_term_goal`, `shortterm_transcript` |
| 11 | English usage situations | Multi-select pills | `english_situations` |
| 12 | Self-assessed English level | Confidence slider (A0–C1) | `english_level` |
| 13 | Summary | Read-only recap | (reads all onboardData) |
| 14 | Personalized Dashboard | AI report + insights | `marketing_consent`, `_ai_report` |

**Slide 0 consent gate:** If `terms_consent` is unchecked, navigation beyond slide 0 is blocked. `goToSlide()` enforces this — if user unchecks consent on slide 0, they're bounced back to slide 0.

## 3. Data Store — `onboardData`

All answers live in a single object stored in `localStorage` under key `sottotitoli_onboarding`.

### Complete Key Reference

```js
onboardData = {
  // Slide 0
  terms_consent: true,           // boolean
  terms_consent_at: "ISO8601",   // timestamp

  // Slide 1
  heard_from: "friends",         // single string
  heard_from_other: "",          // free text (if "other_heard" selected)

  // Slide 2
  profession: "tech",           // single string
  profession_other: "",

  // Slide 3
  native_lang: "it",            // default "it" — set in init
  native_lang_other: "",
  ui_language: "it",            // "it" | "en"

  // Slide 4
  why_english: ["work","travel"],  // array of strings
  why_english_other: "",

  // Slide 5
  spoken_languages: ["en","nl"],    // array (max 4)
  spoken_languages_other: "",
  improve_languages: ["fr"],        // array (max 4)
  improve_languages_other: "",

  // Slide 6
  difficulties: ["speaking_fluently","listening_native"],  // array
  difficulties_other: "",

  // Slide 7
  mic_tested: true,                  // boolean
  mic_permission_granted: true,      // boolean — set after getUserMedia success

  // Slide 8
  intake_transcript: "Ciao, sono...",  // free text

  // Slide 9
  long_term_goal: "",                  // free text
  longterm_transcript: "",

  // Slide 10
  short_term_goal: "",                 // free text
  shortterm_transcript: "",

  // Slide 11
  english_situations: ["Riunioni","Email"],  // array

  // Slide 12
  english_level: "intermediate",       // "a0"|"beginner"|"elementary"|"intermediate"|"upper-intermediate"|"advanced"

  // Slide 14
  marketing_consent: false,           // boolean — email weekly update

  // Internal / AI
  _last_slide: 5,                     // resume position (set by goToSlide)
  _ai_report: { objectives:{...}, focus_areas:[...], report_md:"...", reliability:"...", next_step:"..." },
  _ai_report_pending: true,           // set when AI endpoint times out during finish

  // Completion
  onboarding_completed: true,
  onboarding_completed_at: "ISO8601",
};
```

### Persistence

- `persist()` writes to `localStorage` synchronously.
- `autoSaveToSupabase()` debounces (2s) and upserts to `onboarding_responses` + `profiles` tables.
- Transcript textareas use a separate debounce (`_transcriptPersistTimers`) at 500ms to avoid cursor jumping on mobile Safari.

## 4. Completion Tracking

### Required Fields (6)

Used by `getCompletionPercent()` and `getMissingFields()`:

| Field | Label | Slide |
|-------|-------|-------|
| `native_lang` | Lingua madre | 3 |
| `difficulties` | Difficoltà in inglese | 6 |
| `why_english` | Perché parli inglese | 4 |
| `intake_transcript` | Parlami di te | 8 |
| `longterm_transcript` | Obiettivo a lungo termine | 9 |
| `shortterm_transcript` | Traguardi a breve termine | 10 |

Transcript fields only need ≥1 word (word count is a soft suggestion, not a hard block). Arrays must be non-empty. Final slide "Completa" button is disabled until 100%.

### Word-Count Nudge

Slides 8→9, 9→10, 10→11 trigger a modal if word count is below a threshold (200 for intake, 100 for goals). User can "Add more" or "Continue anyway". Nudge state tracked in `_wordNudgeSlide` / `_wordNudgeTarget`.

## 5. JavaScript Architecture

### Script Loading Order

```
1. Supabase CDN (@supabase/supabase-js@2)
2. config.js (creates window.SOTTOTITOLI_CONFIG)
3. js/auth.js (creates window.sottotitoliSupabase)
4. js/theme.js (navbar, hamburger, theme toggle)
5. [Feature detection — hides mic buttons if no SpeechRecognition]
6. [Auth guard — redirects to login or sets up mock]
7. [Main onboarding logic — ~1,900 lines]
```

### Mock Mode

`?mock=1` on localhost bypasses Supabase auth. Sets up a fake `window.sottotitoliSupabase` with a mock user (`marco@mock.it`). All DB writes are no-ops logged to console.

### Core Functions

| Function | Role |
|----------|------|
| `init()` | **Entry point.** Waits for Supabase, checks auth, checks if already completed, then shows overlay. Retries up to 30 times (6s). |
| `goToSlide(idx)` | Navigate to slide. Enforces consent gate. Stops active mic. Updates progress bar + dots. Calls `updateUI()`. |
| `nextSlide()` / `prevSlide()` | Increment/decrement. `nextSlide` triggers word-count nudge on slides 8/9/10. |
| `updateUI()` | Updates progress bar %, button visibility, nav dots, and "Completa" button state. |
| `selectPill(el, mode, maxSelect)` | Handles pill/chip selection for both single and multi modes. Manages "other" input visibility. |
| `onTranscriptInput(type, text)` | Debounced transcript handler. Updates word count display asynchronously (via `requestAnimationFrame`). |
| `buildSummary()` | Renders slide 13 summary from `onboardData`. Has a label map for Italian display names. |
| `buildDashboard()` | Renders slide 14 dashboard. Reads `aiInsights` if available, otherwise falls back to static data. |
| `finishOnboarding()` | **Final gate.** Requires 100% completion. Tries to generate AI report with 15s timeout. Sets `sottotitoli_onboarding_done` in localStorage. Redirects to `panoramica.html`. |
| `saveToSupabase(isFinal)` | Upserts to `onboarding_responses` + `profiles` tables. See database schema section. |

### Speech Recognition

| Function | Role |
|----------|------|
| `toggleSpeechRecord(type)` | Start/stop for slides 8/9/10 (intake/longterm/shortterm) |
| `startSpeechRecord(type)` | Requests mic permission, then starts continuous speech recognition with interim results |
| `stopSpeechRecord()` | Stops recognition, cleans up UI |
| `setSpeechLang(type, lang, btn)` | Toggle IT/EN for speech recognition language |

Language defaults: `_speechLang = { intake: 'it-IT', longterm: 'it-IT', shortterm: 'it-IT' }`.

### Microphone Test (Slide 7)

| Function | Role |
|----------|------|
| `toggleMicTest()` | Opens AudioContext, connects analyser, renders level bar. Sets `mic_permission_granted`. |
| `requestMicPermission()` | Re-triggers `getUserMedia` for iOS/Safari after denial. Shows iOS-specific hint. |
| `stopAllMic()` | Stops both mic test stream AND speech recognition. Called by `goToSlide` before navigation. |

### AI Starter Report

| Function | Role |
|----------|------|
| `generateStarterReport()` | POSTs `onboardData` to `STARTER_REPORT_URL` (configurable via `config.js`). Caches result in `onboardData._ai_report`. |
| `generateReportFromDashboard()` | Dashboard button handler. Calls `generateStarterReport()`, renders markdown to HTML. |
| `saveAiInsightsToSupabase(aiResult)` | Persists AI output to `onboarding_responses` + `profiles`. |
| `markedToHtml(md)` | Simple markdown→HTML converter (headers, bold, italic, lists, paragraphs). |
| `downloadReportPDF()` | Opens a print window with styled HTML of the AI report. |

### Retry Tracking

Stored in `localStorage` under `sottotitoli_onboarding_retries`:
- 3 retries max per transcript type (intake/longterm/shortterm)
- 1-hour timeout after 3 failed attempts
- `getRetryInfo(type)` / `recordRetryAttempt(type)` manage the state

### Voice Iframes (AI Conversation)

- `VOICE_PROMPTS` — bilingual (IT/EN) prompts for intake and objectives conversations
- `startVoiceSession(source)` — configures iframe with instructions, 5-min timer
- `stopVoiceSession(source)` — sends stop-conversation message, clears timer
- Listens for `message` events: `live-transcript`, `transcript`, `status`

## 6. Language Toggle System (IT ↔ EN)

**Added 2026-08-03.** Toggles all slide content between Italian and English.

### Architecture

Three parallel attribute systems:

| Attribute Pair | Target | Swap Method |
|---------------|--------|-------------|
| `data-it` / `data-en` | Simple text elements | `textContent = attr` |
| `data-it-html` / `data-en-html` | Text with inline HTML (`<strong>`, `<a>`, `<i>`) | `innerHTML = attr` |
| `data-it-placeholder` / `data-en-placeholder` | Textarea/input placeholders | `placeholder = attr` |
| `data-it-title` / `data-en-title` | Element title attributes | `title = attr` |

### CSS

```css
.lang-toggle-wrap { /* pill container, border-radius:100px */ }
.lang-toggle-btn { /* individual IT/EN buttons */ }
.lang-toggle-btn.active { /* purple background, white text */ }
```

### JS

```js
// State
var _uiLang = localStorage.getItem('sottotitoli-ui-lang') || 'it';

// Toggle
function setUiLanguage(lang) {
  // Updates toggle button active states
  // Swaps all data-it/data-en textContent
  // Swaps all data-it-html/data-en-html innerHTML
  // Swaps all data-it-placeholder/data-en-placeholder
  // Swaps all data-it-title/data-en-title
}

// Hooks into goToSlide to re-apply after DOM changes
var _origGoToSlide = goToSlide;
goToSlide = function(idx) {
  _origGoToSlide(idx);
  setTimeout(function() { setUiLanguage(_uiLang); }, 50);
};
```

### Caveats

- Elements with **only** `data-it-html` (no `data-it`) are handled separately from simple text elements — the query selectors are `[data-it][data-en]` and `[data-it-html][data-en-html]` separately.
- Dynamic text (e.g., `buildSummary()`, word nudge modal, confidence descriptions) is NOT yet localized — these functions generate Italian-only text at runtime. The data-attribute system only covers static HTML.
- The "Completa" button text is dynamically set by `updateUI()` based on completion percentage, and that text is Italian-only.

## 7. CSS / Theming

### Variable Pattern

Follows the project-wide convention:
```css
:root { /* light mode */ }
[data-theme="dark"] { /* dark mode */ }
```

Key variables: `--bg`, `--card`, `--line`, `--text`, `--text-dim`, `--text-muted`, `--accent-purple`, `--accent-green`, `--accent-blue`, `--amber`, `--pill-bg`, `--pill-active-bg`, `--input-bg`, `--input-border`, `--shadow`.

Theme is initialized in `init()`:
```js
var savedTheme = localStorage.getItem('sottotitoli-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
```

Note: `js/theme.js` is loaded but the onboarding page also explicitly sets the theme in `init()`. This is intentional — onboarding overlays everything and needs to work even if theme.js hasn't finished.

### Responsive

- **Desktop:** Card max-width 600px, slides padding 32px 36px
- **Mobile (≤640px):** Card full-width, reduced padding (24px 20px), nav dots centered below buttons, smaller fonts
- **Landscape short (≤500px height):** Compact mode — smaller icons, reduced padding
- **Coarse pointer:** Larger touch targets (pills 12px→20px padding, mic button 80px→88px, nav dots 8px→12px)
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables all animations

### Font

- **Inter** (Google Fonts) — body text
- **Manrope** (Google Fonts) — headings, buttons (weight 700/800)
- **Font Awesome 6** (CDN) — icons

## 8. Supabase Integration

### Tables

**`onboarding_responses`** (upsert on `user_id`):
```
user_id, heard_from, heard_from_other, profession, profession_other,
native_lang, native_lang_other, why_english, why_english_other,
spoken_languages, spoken_languages_other, improve_languages,
improve_languages_other, ui_language, difficulties, difficulties_other,
english_situations, english_level, mic_tested, short_term_goal,
long_term_goal, intake_conversation_transcript, longterm_transcript,
shortterm_transcript, terms_consent, terms_consent_at, marketing_consent,
onboarding_completed, onboarding_completed_at, starter_report_md,
updated_at
```

**`profiles`** (upsert on `id`):
```
id (= user_id), native_lang, domain, use_cases, learning_profile (JSON),
goal_primary, focus_preferences, onboarding_completed_at, updated_at
```

### Auth Guard

- If no session → redirects to `index.html?auth=required`
- Stores return page: `localStorage.setItem('sottotitoli_return_page', 'onboarding.html')`
- On completion: sets `localStorage.setItem('sottotitoli_onboarding_done', 'true')` BEFORE Supabase save (so gate is set even if save fails)

### Completion Check

On init, queries `onboarding_responses.onboarding_completed`. If true, shows "Already done" state with option to redo. Local flag (`onboardData.onboarding_completed`) also gates.

## 9. Page States

```
stateLoading     → "Caricamento…" spinner (default on load)
stateNoAuth      → "Accesso richiesto" + Google sign-in button
stateAlreadyDone → "Onboarding già completato" + redo / go to Panoramica
[overlay]        → The onboarding card (shown when ready)
```

Transition: `stateLoading` → (auth check) → `stateNoAuth` OR `stateAlreadyDone` OR `showOverlay()`.

## 10. Keyboard Navigation

- **ArrowRight / ArrowDown** → `nextSlide()`
- **ArrowLeft / ArrowUp** → `prevSlide()`
- Only active when overlay is visible (not on page states).

## 11. Common Pitfalls

1. **Consent gate:** If you modify slide order, remember slide 0 is the consent gate. `goToSlide()` blocks all navigation past slide 0 unless `hasConsented()` returns true.

2. **Transcript debounce:** `onTranscriptInput` uses a 500ms debounced persist. The `saveText()` function does NOT call `persist()` — `onTranscriptInput` handles that. If you add a new transcript field, follow this pattern.

3. **"Other" input visibility:** The `findOtherInput()` function walks forward siblings from the pill grid to find the next `.onboard-input`. If you restructure the DOM, this will break. The "Altro" pill value must match one of the `isOtherVal()` patterns: `other_heard`, `other_job`, `other_lang`, `other_why`, `other_diff`, `other_lang_int`, `other_spoken`, `other_improve`.

4. **Mic stops on navigation:** `goToSlide()` calls `stopAllMic()`. If you add mic-related features, register them in `stopAllMic()`.

5. **`onboarding_completed` flag:** Set in localStorage BEFORE Supabase save. This is intentional — prevents race condition where user closes tab before save completes but should still see the dashboard.

6. **Mock mode only on localhost:** `?mock=1` checks `window.location.hostname === 'localhost'`. Won't work on production.

7. **AI report timeout:** `finishOnboarding()` races the report generation against a 15s timeout. If it fails, `_ai_report_pending` is set to true and the user proceeds anyway.

8. **Dynamic text is NOT localized:** `buildSummary()`, `buildDashboard()`, `showWordNudge()`, `updateConfidenceLevel()`, `onMarketingConsentChange()`, and button state updates in `updateUI()` all generate Italian-only text dynamically. The language toggle only covers static HTML.

9. **Language toggle re-applies on slide change:** The `goToSlide` override calls `setUiLanguage` after a 50ms setTimeout. This is needed because `buildDashboard()` and `buildSummary()` rewrite innerHTML.

10. **`downloadReportPDF()` uses `document.write()`:** Opens a new window and writes HTML synchronously. Modern browsers may block the popup — test with popup blockers disabled.

## 12. Testing the Onboarding

### Quick smoke test (mock mode)
```
http://localhost:8000/onboarding.html?mock=1
```

### Fill all slides instantly
Click the "Marco mockup" button in the top-left of the card. This fills every field with realistic Italian test data and navigates to slide 13 (summary).

### Marco mockup data
- **Name:** Marco
- **Native language:** Dutch (nl)
- **Profession:** Software engineer (tech startup, Milan)
- **Languages:** Dutch (native), English (professional), Italian (learning), French (neglected)
- **Goal:** C1 Italian within 2 years, plus A2 French
- **Difficulties:** speaking fluency, listening to natives, pronunciation, vocabulary
- **Situations:** meetings, email, presentations, social conversations, reading

### Reset onboarding
```js
// In browser console:
localStorage.removeItem('sottotitoli_onboarding');
localStorage.removeItem('sottotitoli_onboarding_done');
localStorage.removeItem('sottotitoli_onboarding_retries');
location.reload();
```

## 13. External Dependencies

| Dependency | Source | Purpose |
|-----------|--------|---------|
| Supabase JS SDK v2 | CDN (`@supabase/supabase-js@2`) | Auth + DB |
| `config.js` | Local (gitignored) | `STARTER_REPORT_URL`, Supabase config |
| `js/auth.js` | Local | Google OAuth, `window.sottotitoliSupabase` |
| `js/theme.js` | Local | Theme toggle, navbar |
| Font Awesome 6 | CDN | Icons |
| Google Fonts (Inter + Manrope) | CDN | Typography |
| Web Speech API | Browser native | Speech recognition (slides 8/9/10) |
| `getUserMedia` | Browser native | Microphone test (slide 7) |
| AI Report Service | Configurable (`STARTER_REPORT_URL`) | Starter report generation |

## 14. Version History

| Date | Change |
|------|--------|
| 2026-08-03 | Added IT/EN language toggle (data-it/data-en attribute system) |
| 2026-08-03 | Fixed `downloadReportPDF()` unescaped newline in string literal |
| (prior) | Initial onboarding wizard implementation |
