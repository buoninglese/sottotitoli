# Reference Mockups

This folder contains **canonical reference mockups** — the authoritative versions that define
how a feature should look and behave. When making changes, work from these files.

---

## onboarding-mockup.html

**Status:** ✅ Canonical reference — this is the blueprint for the production `onboarding.html`.

**Purpose:** 13-slide welcome/onboarding flow that collects user profile data, language goals,
and preferences before their first session. Fully functional with localStorage persistence,
browser speech-to-text, and mock AI report generation.

### Architecture

| Layer | Details |
|-------|---------|
| **Storage** | `localStorage` key `sottotitoli_onboarding` — all answers persisted on every change |
| **Retries** | `localStorage` key `sottotitoli_onboarding_retries` — retry tracking per transcript |
| **Speech** | Browser Web Speech API (`SpeechRecognition`) — no backend, no cost |
| **Mock AI** | `mockGenerateReport()` builds `aiInsights` object from `onboardData` client-side |
| **Auth** | Simulated via `DEMO_USER` object — no real Supabase calls |
| **Theme** | `data-theme` attribute on `<html>`, toggled by ☀️/🌙 button in toolbar |

### Slide Map (13 slides, 0–12)

| # | Title | Type | Key Data |
|---|-------|------|----------|
| 0 | Welcome | Consent gate | `terms_consent`, `terms_consent_at` |
| 1 | Come ci hai conosciuti? | Single-select pills | `heard_from`, `heard_from_other` |
| 2 | Cosa fai nella vita? | Single-select pills | `profession`, `profession_other` |
| 3 | Lingua madre + sito | Select + pills | `native_lang`, `native_lang_other`, `ui_language` |
| 4 | Perché parli inglese? | Multi-select pills | `why_english`, `why_english_other` |
| 5 | Lingue parlate + migliorare | Multi-select pills ×2 | `spoken_languages`, `spoken_languages_other`, `improve_languages`, `improve_languages_other` |
| 6 | Cosa trovi difficile? | Multi-select pills | `difficulties`, `difficulties_other` |
| 7 | Proviamo il microfono | Mic test | `mic_tested` (optional, not required for %) |
| 8 | Parlami di te | Textarea + speech | `intake_transcript` (≥200 words) |
| 9 | Obiettivo a lungo termine | Textarea + speech | `longterm_transcript` (≥100), `long_term_goal` |
| 10 | Traguardi a breve termine | Textarea + speech | `shortterm_transcript` (≥100), `short_term_goal` |
| 11 | Riepilogo Benvenuto | Summary | All collected data displayed |
| 12 | Dashboard + Starter Report | Insights | AI report, focus areas, newsletter opt-in |

### Completion Requirements (6 fields for 100%)

1. `native_lang` — Lingua madre (slide 3)
2. `difficulties` — Difficoltà in inglese (slide 6)
3. `why_english` — Perché parli inglese (slide 4)
4. `intake_transcript` — Parlami di te ≥200 parole (slide 8)
5. `longterm_transcript` — Obiettivo a lungo termine ≥100 parole (slide 9)
6. `shortterm_transcript` — Traguardi a breve termine ≥100 parole (slide 10)

### Key Functions

| Function | Purpose |
|----------|---------|
| `goToSlide(idx)` | Navigate between slides, blocks if consent missing |
| `selectPill(el, mode, max)` | Single/multi pill selection, toggles "Altro" inputs |
| `findOtherInput(grid)` | Walks forward siblings to find the correct "Altro" text input |
| `onTranscriptInput(type, text)` | Word count, status update, triggers dashboard refresh |
| `toggleSpeechRecord(type)` | Start/stop browser speech recognition |
| `startSpeechRecord(type)` | Creates SpeechRecognition, bullet-point formatting |
| `stopSpeechRecord()` | Stops recognition, cleans up |
| `setSpeechLang(type, lang, btn)` | Switch IT/EN for speech recognition |
| `getCompletionPercent()` | Calculates % from 6 required fields |
| `getMissingFields()` | Returns human-readable list of incomplete fields |
| `buildDashboard()` | Populates slide 12 with data or AI insights |
| `buildSummary()` | Populates slide 11 with FA-icon-labeled summary |
| `mockGenerateReport()` | Builds mock AI insights from onboardData |
| `finishOnboarding()` | Guarded by 100% check, triggers report, shows alert |
| `hasConsented()` | Checks welcome slide terms checkbox |
| `onConsentChange()` | Saves consent timestamp |
| `onMarketingConsentChange()` | Saves newsletter opt-in preference |

### "Altro" Input Mechanism

Each pill grid has a hidden `<input class="onboard-input">` sibling. When a pill with
`data-val="other_*"` is clicked, `selectPill` calls `findOtherInput(grid)` to locate
the correct input (walks forward siblings — important for slides with 2 grids like #5).

Supported "other" values: `other_heard`, `other_job`, `other_lang`, `other_why`,
`other_diff`, `other_spoken`, `other_improve`.

### Speech-to-Text

- Uses `window.SpeechRecognition || window.webkitSpeechRecognition` (Chrome/Edge only)
- Continuous + interim results, auto-restarts on silence
- Each final result gets `• ` bullet + capitalized + newline
- Language toggle (IT/EN) with `_speechLang[type]` per slide
- Toggle locked while recording (`.lang-pills.disabled`)
- Types: `intake`, `longterm`, `shortterm`

### AI Report (Mock)

`mockGenerateReport()` constructs `aiInsights`:
```js
{
  report_md: "markdown string...",
  objectives: { short_term, long_term },
  focus_areas: [{ priority, title, description }, ...],
  reliability: "string",
  next_step: "string"
}
```
Applied to dashboard via `buildDashboard()` AI insights path.

### CSS Architecture

- `:root` / `[data-theme="dark"]` CSS variables for theming
- `.overlay` — full-screen backdrop with `backdrop-filter: blur(12px)`
- `.onboard-card` — main container, `rgba` transparency (92% opacity)
- `.insight-card` — dashboard cards, glass transparency (`rgba .06` / `.03`)
- Buttons have `backdrop-filter: blur(6px)` glass effect
- Font: Inter (body) + Manrope 800 (titles)
- Icons: Font Awesome 6 Free via CDN

### How to Modify

1. **Adding a slide:** Insert the slide div with correct `data-slide`, update `TOTAL_SLIDES`,
   renumber all subsequent `data-slide` attributes, update any `currentSlide === N` references.

2. **Changing required fields:** Update the `required` array in `getCompletionPercent()` and
   labels in `getMissingFields()`.

3. **Changing word minimums:** Search for `/200` and `/100` — update HTML status lines AND
   `onTranscriptInput` JS AND `getCompletionPercent` threshold AND `validateTranscript`.

4. **Adding a new pill grid with "Altro":** Follow the pattern — `.pill-grid` div followed
   by `<input class="onboard-input" style="display:none">` as sibling. Use unique `data-val`
   and add the value to `isOtherVal()` if it starts with `other_`.

5. **Copying to production:** The production `onboarding.html` is similar but has:
   - Real Supabase auth (no `DEMO_USER`)
   - `config.js` for `STARTER_REPORT_URL`
   - `saveToSupabase()` function
   - `generateStarterReport()` that calls a real API endpoint
   - Different button CSS (separate rules per button type)
   - Overlay starts `hidden` (shown after auth)

### Known Pitfalls

- **Never use `\\'` (double backslash + quote) in JS strings** — it terminates the string.
  Always use `\'` for apostrophes inside single-quoted JS strings in HTML script tags.
- **The `findOtherInput` helper is critical** for slides with multiple pill grids.
  `grid.parentElement.querySelector('.onboard-input')` returns the FIRST input — wrong.
- **`escapeHtml(display)` will eat HTML** — don't pass icon HTML through it.
- **`getCompletionPercent()` uses specific required fields** — the old fallback formula
  (counting any object keys) was wrong and was replaced.
- **Dashboard HTML uses `—` placeholders** that JS can overwrite. The fallback path
  no longer generates hardcoded focus items.
- **Speech recognition is Chrome/Edge only.** Safari/Firefox show an alert.
