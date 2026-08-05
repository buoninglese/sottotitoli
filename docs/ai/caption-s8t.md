# caption-s8t.html — Master Agent Reference

> **Last updated:** 2026-08-04  
> **File:** `/Users/sebastiankrauwel/sottotitoli/caption-s8t.html`  
> **Lines:** ~8,930  
> **Purpose:** Real-time AI captioning + translation + vocabulary + grammar + topics studio

---

## 1. Architecture Overview

`caption-s8t.html` is a **single monolithic HTML file** with no build step. It contains:

| Component | Lines | Description |
|-----------|-------|-------------|
| CSS | 15–1120, 8864–8916 | All styles, themes, responsive, animations |
| HTML markup | ~500 lines | Top bar, 5 slide panels, bottom caption bar, DUO sidebar |
| Core JS | 1523–8236 | ~6,700 lines — mic, UI, grammar, vocab, CEFR, slides, DUO+ |
| V20quint engine | 8240–8823 | ~580 lines — transcript rendering, edit/collect modes |
| External deps | 14 JS + 10 CSS | Supabase, Compromise NLP, Font Awesome, Google Fonts |

**Communication flow:** Browser mic → Web Speech API → V20quint transcript engine → WebSocket relay → back to all clients in room.

---

## 2. External Dependencies (Load Order)

Scripts load in this order — **never change this**:

```
1. Supabase SDK        (@supabase/supabase-js@2)
2. Compromise NLP      (compromise@14)
3. config.js?v=15      → window.SOTTOTITOLI_CONFIG
4. js/auth.js?v=19     → window.sottotitoliSupabase
5. js/i18n.js          → translations
6. js/theme-2.js?v=4   → day/night toggle
7. js/notifications.js → bell notifications
8. js/language-resolver.js?v=1 → S8T_LANG
9. js/real-mic.js?v=13 → mic + speech recognition
10. js/grammar-viz.js?v=2 → grammar visualization
11. js/speech-icons.js → TTS speaker buttons
12. js/cefr-gse.js     → GSE/CEFR scoring
13. js/cefr-info.js    → CEFR tooltips
14. translation-providers.js?v=1 → MyMemory + Google Translate
```

`config.js` MUST load before `auth.js`. `auth.js` creates `window.sottotitoliSupabase`.

---

## 3. CSS / Theme System

### Day/Night Mode

Theme is controlled via `data-theme` attribute on `<html>`:

```html
<html data-theme="dark">
```

`js/theme-2.js` reads `localStorage.getItem('sottotitoli-theme')` and sets the attribute. Each page defines its own `:root` and `[data-theme="dark"]` variables.

### Key CSS Variables

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| `--bg` | `#f8fafc` | `#0d1114` | Page background |
| `--card` | `#ffffff` | `#1a1d26` | Cards/surfaces |
| `--panel-bg` | `#ffffff` | `#18232e` | Slide panel backgrounds |
| `--line` | `#e2e8f0` | `#1a1c24` | Borders/dividers |
| `--text` | `#1a1a1a` | `#e8e5df` | Primary text |
| `--muted` | `#3d5260` | `#a0c0d4` | Secondary text |
| `--muted2` | `#71899e` | `#6b8a9e` | Tertiary text |
| `--accent` | `#06b6d4` | `#38bdf8` | Primary accent (cyan) |
| `--accent2` | `#0891b2` | `#7dd3fc` | Secondary accent |
| `--good` | `#059669` | — | Success/positive |
| `--warn` | `#d97706` | — | Warning |
| `--danger` | `#dc2626` | — | Error/danger |
| `--amber` | `#f59e0b` | — | Amber |

### Font Variables (`.font-crisp`)

- `--font-live`: Inter, size `clamp(28px, 4.5vw, 40px)`, weight 500
- `--font-tx`: Inter, 15px, weight 400
- `--font-body`: Inter
- `--font-mono`: JetBrains Mono

### Caption Variants

CSS classes `cap-v5`, `cap-v6`, `cap-v7` control live caption styling. Variables `--cap-v5-color` through `--cap-v7-*` control colors per variant.

---

## 4. Slide Navigation System

### 5 Slide Panels

| Index | ID | Title | Purpose |
|-------|-----|-------|---------|
| 0 | `#transcriptPanel` | Captions | Live transcript display |
| 1 | `#vocabPanel` | Vocabulary | Word bank bubbles, NGSL level coloring |
| 2 | `#wordMeaningPanel` | Word Meaning | Word details, synonyms, definitions |
| 3 | `#grammarCorrectPanel` | Grammar Fix | Grammar checking + error bank |
| 4 | `#topicPanel` | Topics | Topic donut chart + per-topic word lists |

### Navigation

```javascript
var visibleIndices = [0, 1, 2, 3, 4]; // Modified to [0, 2, 3] for non-English

function goTo(i) {
  // Scrolls to panel, fades, triggers topic interval for slide 4
  // Stops topic interval when leaving slide 4
}
```

- Slide dots at line 1247 — click to navigate
- Keyboard arrows → `goTo(idx±1)`
- Scroll tracking on `#modeScroll` syncs dot state

---

## 5. Core Application State (Module-Level Variables)

All prefixed with `var _` to indicate internal state:

### Session State
| Variable | Purpose |
|----------|---------|
| `sessionActive` (l.4164) | Whether a session is running |
| `_sessionSavedShown` | Prevents duplicate "session saved" toast |
| `_speakerIdx` | Current speaker index for coloring |

### CEFR / GSE
| Variable | Purpose |
|----------|---------|
| `_cefrApiUrl` | CEFR API endpoint (derived from websocketUrl) |
| `_cefrColors` | A1–C2 color map: `{A1:'#22c55e', A2:'#a3e635', B1:'#facc15', B2:'#fb923c', C1:'#f87171', C2:'#c084fc'}` |
| `_sessionWordCache` | word → `{level, pos}` from API |
| `_sessionGSE` | Current overall GSE score |
| `_sessionCEFRBand` | Current CEFR band string |
| `_gseHistory` | Rolling last 10 GSE scores |

### Grammar (Slide 4)
| Variable | Purpose |
|----------|---------|
| `_lastGrammarText` | Last grammar-checked text (for retry) |
| `_lastLangSettings` | Last language settings (for retry) |
| `_correctedFeedMode` | Magic Fix toggle |
| `_grammarFontSize` | Grammar panel font size (default 15) |

### Topics (Slide 5)
| Variable | Purpose |
|----------|---------|
| `_topicCache` | Cached topic distribution |
| `_topicWordMap` | word → `{level, topics[]}` |
| `_topicColorMap` | topic → color |
| `_topicLastFetch` | Last fetch timestamp (15s cache) |
| `_topicSelected` | Currently selected topic filter |
| `_topicRefreshInterval` | 20s auto-refresh interval (slide 5 only) |

### DUO+ Multi-Speaker
| Variable | Purpose |
|----------|---------|
| `_duoMode` | DUO enabled flag |
| `_duoRoomId` | Current DUO room ID |
| `_duoSpeakerName` | Current speaker name |
| `_duoWs` | DUO WebSocket connection |
| `_duoSpeakerMap` | Speaker ID → metadata map |

### Word Bank
| Variable | Purpose |
|----------|---------|
| `_synCache` | Synonym cache |
| `_posCache` | POS cache |
| `_hoverTimer` | Prefetch hover debounce (200ms) |
| `_wbSyncTimer` | Supabase sync debounce (600ms) |

---

## 6. Polling Loops & Intervals

| Interval | What | Notes |
|----------|------|-------|
| **800ms** | `_slidePollInterval` — grammar lines, metrics, CEFR bars | Runs only when `sessionActive` + lines exist |
| **20s** | `_topicRefreshInterval` — topic donut refresh | Only when Topics slide (4) is visible |
| **1s** | Session timer increment | Counter display |
| **2s** | Listen bar status update | Mic status indicator |

**Important:** Topics was previously in the 800ms poll — removed because:
1. It rebuilt SVG DOM every 800ms (visual flicker)
2. It called the topic API regardless of which slide was active
3. Now has its own gentle 20s interval only while slide 4 is visible

---

## 7. Grammar Check System (Slide 4)

### Architecture

```
User clicks transcript line
  → _s5LineClick(text, lineElement)
    → supabase.functions.invoke('grammar-segment')
      → POST /grammar-segment (Supabase Edge Function)
        → Hugging Face LLM (Llama 3.3 70B default)
        → OR LanguageTool fallback (English only)
      ← Structured JSON: { status, changes[], silent_edits[], learning, quality }
    → Render: _renderGrammarChanges() or legacy _renderGrammarErrors()
    → Enable: grammarSaveBtn (Save to Error Bank)
```

### Model Switching

Three buttons in the Grammar Breakdown header:
- **Llama 3.1** (`meta-llama/Llama-3.1-8B-Instruct`) — smallest, fastest
- **Llama 3.3** (`meta-llama/Llama-3.3-70B-Instruct`) — **DEFAULT**, best explanations
- **Llama 4** (`meta-llama/Llama-4-Scout-17B-16E-Instruct`) — newer but smaller, less reliable JSON output

Clicking a model calls `retryGrammarCheck(modelId)` which re-invokes the edge function with the new model. The save button is updated with the new model's results.

### Save to Error Bank

The "Save Error" button (id: `grammarSaveBtn`) inserts into `grammar_errors` table:
```sql
INSERT INTO grammar_errors (user_id, language, original_text, corrected_text, explanation)
```

On success: toast "💾 Grammar error saved to your error bank" (4s)  
On failure: red toast "⚠️ Could not save error — try again"

### Edge Function Details

File: `supabase/functions/grammar-segment/index.ts`

Key parameters:
- `max_tokens: 2000` (was 600 — the old limit truncated multi-correction responses)
- `temperature: 0` (deterministic)
- `response_format: { type: 'json_object' }`

Validation guards:
- `mechanics_only` with word changes → overridden to `corrected` with "unexplained" entry
- `corrected` with empty `changes[]` → synthesized "unexplained" fallback
- Malformed changes (missing fields, original===corrected) → filtered out

### Response Shape

```json
{
  "status": "corrected",
  "original": "She go to school yesterday",
  "corrected": "She went to school yesterday.",
  "has_grammar_errors": true,
  "changes": [{
    "id": "1",
    "category": "verb_form",
    "original": "go",
    "corrected": "went",
    "explanation": "'Go' must be past tense 'went' because of 'yesterday'.",
    "severity": "error",
    "confidence": 0.95
  }],
  "silent_edits": [{
    "category": "punctuation",
    "original": "",
    "corrected": "."
  }],
  "learning": {
    "main_topic": "past tense",
    "tags": ["verb_forms", "time_expressions"],
    "difficulty": "beginner"
  },
  "quality": {
    "meaning_preserved": true,
    "register_preserved": true,
    "certainty": "high"
  }
}
```

---

## 8. CEFR / GSE System

### Flow
```
Transcript lines arrive → _updateCEFRBars()
  → Queue: _cefrApiQueue
  → POST {cefrApiUrl}/batch with word list
  → Response: word → {level, pos, gse_score}
  → Cache in _sessionWordCache
  → Render CEFR bar chart + level breakdown
```

### Word Level Colors
- A1: `#22c55e` (green)
- A2: `#a3e635` (lime)
- B1: `#facc15` (yellow)
- B2: `#fb923c` (orange)
- C1: `#f87171` (red)
- C2: `#c084fc` (purple)

---

## 9. Topic Explorer (Slide 5)

### Flow
```
_fetchTopics()
  → Collect all transcript text
  → POST {cefrApiUrl}/analyze
  → Response: { topicDistribution, wordData }
  → _renderTopicDonut() — SVG donut chart
  → _renderTopicWords() — per-topic word grid
```

### Refresh Strategy
- **On slide entry:** auto-fetches immediately
- **While visible:** gentle 20s auto-refresh interval
- **On leave:** interval cleared — no background activity
- **Manual:** refresh button (↻) with spinner animation
- No longer in the 800ms poll (removed to prevent visual flicker)

### Topic Selection
Clicking a topic segment in the donut or legend filters the right panel to show only words belonging to that topic. Click "← All topics" to unfilter.

---

## 10. Vocabulary System (Slide 2)

### Word Bank Visual
- Live word bubbles (chips) in the vocabulary panel
- Color-coded by CEFR level (A1–C2)
- Click to see definition in Word Meaning slide
- Double-click to remove from bank

### Word Bank Storage
- Primary: `localStorage['sottotitoli_wordbank']` (unified)
- Legacy: `localStorage['sottotitoli_wordbank_{lang}']`
- Syncs to Supabase (`user_wordbanks`, `user_wordbank_words`) with 600ms debounce

### Word Lookup
- Primary: Supabase `dictionary-proxy` edge function (7-day cache, avoids CORS/rate issues)
- Fallback: Free Dictionary API (`api.dictionaryapi.dev`)
- Datamuse: Used for synonyms and related words

---

## 11. DUO+ Multi-Speaker Mode

### Architecture
- Separate WebSocket connection for DUO rooms
- Host creates room → gets room ID → shares invite URL
- Joiners connect via the same room ID
- Each speaker gets a color, name, and language setting
- Host can kick speakers

### Key Functions
| Function | Purpose |
|----------|---------|
| `duoConnectWebSocket(url)` | Connect to DUO WebSocket |
| `duoNewRoom()` | Create a new DUO room |
| `duoJoinRoom(roomId)` | Join an existing room |
| `duoKickSpeaker(speakerId)` | Remove a speaker |
| `duoRenderSpeakers()` | Update speaker list UI |
| `duoShareInvite()` | Copy invite link |

### Message Types
- `{ type: 'duo-join', roomId, name, lang }` — join room
- `{ type: 'duo-speaking', name, lang }` — speaking indicator
- `{ type: 'duo-kick', speakerId }` — kick speaker
- `{ msg: true, final: text, id, label }` — standard caption message

---

## 12. V20quint Transcript Engine (v44)

Lines 8240–8823. Handles all transcript rendering.

### Modes
| Mode | Description |
|------|-------------|
| `collect` | Click words to collect into bank |
| `edit` | Edit transcript text inline |
| `bookmark` | Bookmark sentences |
| `translate` | Show translation below each line |
| `default` | Read-only display |

### Key Functions
| Function | Purpose |
|----------|---------|
| `v20q_setMode(mode)` | Set interaction mode |
| `v20q_setTopMode(mode)` | Set top-level mode (caption/translate) |
| `v20q_handleWord(word, lineEl)` | Word click handler |
| `v20q_toggleBookmark(sid)` | Toggle sentence bookmark |
| `v20q_copySentence(el)` | Copy sentence to clipboard |
| `v20q_deleteSentence(el)` | Delete sentence |
| `v20q_markFinalFavorites()` | Mark favorite words in final text |

---

## 13. localStorage Keys Reference

| Key | Purpose |
|-----|---------|
| `sottotitoli-theme` | Day/night mode (`light`/`dark`) |
| `sottotitoli-caption-lang` | Selected caption language (e.g. `en-US`) |
| `sottotitoli-translate-target` | Translation target language |
| `sottotitoli-caption-mode` | Caption style |
| `sottotitoli-caption-room-id` | Current caption room ID |
| `sottotitoli-caption-session` | Supabase session ID |
| `sottotitoli-speaker-count` | Speaker diarization count |
| `sottotitoli-pause-sensitivity` | Pause sensitivity (ms) |
| `sottotitoli-speaker-mode` | `solo` / `duo` |
| `sottotitoli-caption-font` | Font mode (`crisp`) |
| `sottotitoli-font-size` | Font size preset (45/55/65) |
| `sottotitoli-caption-var` | Live caption variant (5/6/7) |
| `sottotitoli-magic-fix` | Magic Fix toggle |
| `sottotitoli_wordbank` | **Primary** unified word bank |
| `sottotitoli-duo-is-host-{roomId}` | DUO host flag |
| `sottotitoli-duo-host-{roomId}` | DUO host user ID |
| `sottotitoli-duo-speaker-name` | DUO speaker name |
| `sottotitoli_last_snapshot_date` | Last AI snapshot date |
| `sottotitoli-pending-session` | Pending session recovery |
| `sottotitoli-native-lang` | User's native language |
| `sottotitoli-lang` | UI language |

---

## 14. Toast Notification System

Two toast mechanisms exist:

### `showToastMsg(msg)` (line 1992)
- Bottom-center, card-style toast
- Auto-removes after 4 seconds
- Used for: AI snapshots, grammar save confirmation, word bank adds

### `#toast` element (line 8815)
- Bottom-center, pill-shaped
- Opacity-based show/hide
- Used for: room creation, speaker removal, copy confirmation

---

## 15. Common Pitfalls & Fragile Areas

### DO NOT:
1. **Change script load order** — `config.js` before `auth.js` is critical
2. **Modify the 800ms poll without understanding all consumers** — grammar, metrics, CEFR all depend on it
3. **Change the Topic refresh strategy** — the 20s slide-only interval was carefully designed after removing it from the 800ms poll
4. **Remove the `_topicRefreshInterval` cleanup** — `_stopTopicInterval()` must be called when leaving slide 4
5. **Change `visibleIndices` logic** — non-English hides slides 1 and 4 (`[0, 2, 3]`)
6. **Modify the grammar response validation** — the `mechanics_only` and `corrected` fallback logic prevents misleading "(punctuation only)" labels
7. **Change `max_tokens` below 1500** — grammar responses with multiple corrections need the space
8. **Remove `sessionActive` checks in intervals** — they prevent wasted work when session is inactive

### Known Issues:
- Session duration sometimes shows 0s after recording
- Translation duplicate outputs are intermittent
- NGSL coverage metric calculation may be off
- DUO+ WebSocket reconnection can be flaky

---

## 16. Supabase Integration

### Tables Used
- `grammar_errors` — saved grammar mistakes
- `user_wordbanks` / `user_wordbank_words` — word bank sync
- `review_words` — spaced repetition
- `transcript_segments` — transcript storage
- `session_ai_reports` — AI report snapshots

### Edge Functions Called
- `grammar-segment` — grammar checking (LLM + LanguageTool)
- `dictionary-proxy` — cached dictionary lookups
- `diarize-speakers` — AI speaker identification
- `session-rewards` — post-session credit rewards
- `vocab-lookup` — vocabulary definitions

---

## 17. Global API Surface (window.*)

All functions/variables exposed on `window` for inline `onclick` handlers and cross-module access. See inline `onclick` attributes throughout the HTML for usage.

Key exports:
- `window.saveGrammarError()` — save grammar error to Supabase
- `window.retryGrammarCheck(modelId)` — re-check with different LLM
- `window.addToWordBank(word)` — add word to vocabulary bank
- `window.showVocabDefinition(word)` — show word definition popup
- `window.toggleExtrasPanel()` — toggle right sidebar
- `window.duoConnectWebSocket(url)` — DUO WebSocket connect
- All `window.v20q_*` functions — transcript engine API
- All `window.duo*` functions — DUO+ multi-speaker API
