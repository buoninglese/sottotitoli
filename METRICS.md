# Sottotitoli — Metrics Reference Manual (Private)

> Every parameter, how it's calculated, source file, and where users see it.

---

## 1. Session-Level Metrics

Computed in `app.js` → `finalizeSessionRow()` on session stop. Saved to Supabase `sessions` table.

### 1.1 `duration_seconds` — Session Duration
- **Calculation**: `(ended.getTime() - started_at.getTime()) / 1000` rounded
- **Source**: `app.js` line ~1155
- **User sees it**: Account → Performance Dashboard ("Time spoken"), CSV export, Session list duration column

### 1.2 `words_count` — Word Count
- **Calculation**: `SottotitoliSessionUtils.countWords(plain)` — splits on whitespace, filters empty
- **Source**: `session-utils.js` → `countWords()`
- **User sees it**: studio.html Stats card ("Words"), Account → Dashboard, Goals page weekly progress

### 1.3 `chars_count` — Character Count
- **Calculation**: `plain.length`
- **User sees it**: studio.html Stats card ("Chars"), CSV export

### 1.4 `wpm` — Words Per Minute
- **Calculation**: `(wordsCount * 60) / durationSeconds`, null if duration ≤ 0
- **User sees it**: Account → Performance Dashboard ("Average WPM"), CSV export, Analysis session selector

### 1.5 `sentences_count` — Sentence Count
- **Calculation**: `computeSentencesCount(plain)` — counts `[.!?]` punctuation marks, minimum 1
- **User sees it**: CSV export, used internally for avg sentence length

### 1.6 `avg_sentence_length_words` — Average Sentence Length
- **Calculation**: `wordsCount / sentencesCount`, null if 0 sentences
- **User sees it**: CSV export only

### 1.7 `fillers_count` / `fillers_per_minute` — Filler Detection
- **Calculation**: `computeFillersCount(plain)` — regex matches for ["uh", "um", "eh", "you know"]. Then `(fillersCount * 60) / durationSeconds`
- **Source**: `app.js` → `computeFillersCount()`
- **User sees it**: Account → Dashboard ("Fillers/min"), CSV export, Viaggio "Fluency" strength card
- **Note**: "like" was removed from filler list (false positives for normal English usage)

### 1.8 `uniquewords_count` — Unique Words
- **Calculation**: `computeUniqueWordsCount(plain)` — splits on `[a-z']+`, uses `new Set()`
- **User sees it**: Account → Dashboard ("Unique words"), studio.html Report tab ("reportUnique")

### 1.9 `lexical_diversity` — Lexical Diversity
- **Calculation**: `uniqueWordsCount / wordsCount`, null if 0 words. Range: 0–1
- **User sees it**: Account → Dashboard ("Lexical diversity"), studio.html Report tab ("reportLexDiv"), Viaggio CEFR estimate

### 1.10 `quality_score` — Composite Quality Score
- **Calculation**: `computeQualityScore({ wpm, fillersPerMinute, lexicalDiversity })`:
  - WPM 80–170 → +0.4
  - Fillers/min < 4 → +0.3
  - Lexical diversity > 0.35 → +0.3
  - Range: 0–1
- **User sees it**: Account → Dashboard ("Quality score"), studio.html Report tab, Viaggio CEFR estimate

### 1.11 `ngsl_coverage` — NGSL Vocabulary Coverage
- **Calculation**: `computeNgslCoverage(transcriptLines)` — for each token with a lemma key, checks `LEMMA_POS_MAP[lemmaKey]`. Ratio of NGSL hits to total lemmatized tokens.
- **Requires**: `js/lemma-pos-map.js` (2500+ NGSL lemma entries)
- **User sees it**: CSV export only (not surfaced in UI yet)

### 1.12 `transcript_text` — Full Transcript
- **Calculation**: All `transcriptLines` joined with `\n`, each prefixed with `[timestamp]` if available
- **User sees it**: transcript.html (when loaded with `?session=ID`), used by AI Edge Function for report generation

### 1.13 `question_count` — Questions Asked
- **Calculation**: `computeQuestionCount(plain)` — counts `?` characters
- **User sees it**: Account → Dashboard ("Questions used"), CSV export

### 1.14 `negation_count` — Negation Words Used
- **Calculation**: `computeNegationCount(plain)` — regex for: not, n't, never, no, nobody, nothing, nowhere (case-insensitive)
- **User sees it**: Account → Dashboard ("Negation count"), CSV export

### 1.15 `repetition_rate` — Phrase Repetition Rate
- **Calculation**: `computeRepetitionRate(plain)` — counts repeated adjacent bigrams (word[i]==word[i+2] && word[i+1]==word[i+3]) divided by total bigrams. Null if < 4 words.
- **User sees it**: Account → Dashboard ("Repetition rate"), CSV export

### 1.16 `turn_count` — Estimated Conversation Turns
- **Calculation**: `computeTurnCount(plain)` — counts `[.!?]` + whitespace boundaries + 1. Approximation for solo sessions.
- **User sees it**: Account → Dashboard ("Conversation turns"), CSV export

### 1.17 `interruption_count` — Interruption Count
- **Value**: Always `null` — requires speaker diarization (Whisper)
- **User sees it**: Account → Dashboard ("Interruptions") → "–"

### 1.18 `speaking_share_ratio` — Speaking Share
- **Value**: Always `null` — requires multi-speaker detection
- **User sees it**: Account → Dashboard ("Speaking share") → "–"

---

## 2. Dashboard Aggregates (Account Page)

Computed in `js/account.js` → `updatePerformanceDashboard()`.

### 2.1 Weekly Minutes Spoken
- **Window**: Last 7 days
- **Aggregation**: `SUM(duration_seconds) / 60` for sessions with `duration_seconds > 0`
- **Bar**: Target is 120 min/week. ≥ target → green, < half-target → warning, else neutral.
- **Display**: "Time spoken" card + progress bar + 14-day sparkline

### 2.2 Average WPM
- **Window**: Last 7 days
- **Aggregation**: `AVG(wpm)` for sessions with numeric `wpm`
- **Bar**: Max 180 WPM. < 90 or > 160 → warning, else good.
- **Trend arrow**: ↑ if > 5 WPM above previous week, ↓ if < 5 below
- **Display**: "Average WPM" card + trend mini-chart (last 10 sessions)

### 2.3 Fillers Per Minute
- **Window**: Last 7 days
- **Aggregation**: `AVG(fillers_per_minute)` for sessions with numeric value
- **Bar**: ≤ 3 → good, ≤ 7 → warning, > 7 → bad. Max 10 for bar scaling.
- **Display**: "Fillers/min" card

### 2.4 Unique Words (30-day)
- **Window**: Last 30 days
- **Aggregation**: `SUM(unique_words_count)` (cumulative unique words, not deduplicated across sessions)
- **Bar**: Target 2000. ≥ 50% → good, < 30% → warning.
- **Display**: "Unique words" card

### 2.5 Average Lexical Diversity
- **Window**: Last 7 days
- **Aggregation**: `AVG(lexical_diversity)` for sessions with numeric value
- **Bar**: ≥ 0.7 → full, scaled linearly. < 0.3 → bad, < 0.45 → warning.
- **Display**: "Lexical diversity" card

### 2.6 Average Quality Score
- **Window**: Last 7 days
- **Aggregation**: `AVG(quality_score)` for sessions with numeric value
- **Bar**: ≥ 100 → full. < 50 → bad, < 70 → warning.
- **Display**: "Quality score" card

### 2.7 Questions Used
- **Window**: Last 7 days
- **Aggregation**: `AVG(question_count)` for sessions with numeric value
- **Bar**: ≥ 6 → full. ≥ 2 → good, 0 → bad.
- **Display**: "Questions used" card

### 2.8 Negation Count
- **Window**: Last 7 days
- **Aggregation**: `AVG(negation_count)` for sessions with numeric value
- **Bar**: Max 8 for scaling.
- **Display**: "Negation count" card

### 2.9 Average Repetition Rate
- **Window**: Last 7 days
- **Aggregation**: `AVG(repetition_rate)` for sessions with numeric value
- **Bar**: > 0.35 → bad, > 0.2 → warning. Displayed as percentage.
- **Display**: "Repetition rate" card

### 2.10 Average Conversation Turns
- **Window**: Last 7 days
- **Aggregation**: `AVG(turn_count)` for sessions with numeric value
- **Bar**: ≥ 12 → full. ≥ 6 → good, ≤ 2 → bad.
- **Display**: "Conversation turns" card

### 2.11 Average Interruptions
- **Window**: Last 7 days
- **Aggregation**: `AVG(interruption_count)` (always null currently)
- **Bar**: < 1 → good, ≥ 3 → bad.
- **Display**: "Interruptions" card

### 2.12 Average Speaking Share
- **Window**: Last 7 days
- **Aggregation**: `AVG(speaking_share_ratio)` (always null currently)
- **Bar**: Distance from 0.5 (balanced). > 0.3 imbalance → bad, > 0.18 → warning.
- **Display**: "Speaking share" card

### 2.13 Streak
- **Calculation**: Walk backward from today, counting consecutive days with ≥ 1 session that has `duration_seconds > 0`. If today has none, start from yesterday.
- **Display**: Streak badge (≥ 7 days → green "hot", 0 → red "cold"). Same logic in `goals.html` and `account.js`.

### 2.14 Fun Fact
- **Calculation**: Priority order: 1) Dialogic sessions (high turns + balanced share), 2) Strong quality score, 3) Weekly volume + WPM, 4) Unique words, 5) Fallback encouragement.
- **Display**: Blue card at bottom of Performance Dashboard.

---

## 3. Viaggio / Language Profile (Account Page)

Computed in `account.html` → viaggio script.

### 3.1 Language Grouping
- **Source**: `sessions.mode` field → `extractSourceLang(mode)`:
  - `caption-XX` → source is XX
  - `translate-XX-YY` → source is XX
  - `lesson` → source is `en`
- **Threshold**: ≥ 3600 seconds (1 hour) total duration in a language before tab appears
- **Sort**: Most practiced first

### 3.2 Per-Language Averages
- `avgWpm`: `SUM(wpm) / COUNT(wpm)` for sessions with numeric WPM
- `avgLexDiv`: `SUM(lexical_diversity) / COUNT(lexical_diversity)`
- `avgQuality`: `SUM(quality_score) / COUNT(quality_score)`
- `fillersPerMin`: `SUM(fillers_per_minute) / COUNT(fillers_per_minute)`

### 3.3 CEFR Level Estimate
- **Algorithm**: `estimateCEFR(wpm, lexDiv, qualityScore, durationMinutes)`:
  - Score starts at 0
  - WPM 110–170 → +1, WPM > 170 → +1.5
  - Lexical diversity > 0.5 → +1, > 0.35 → +0.5
  - Quality score ≥ 0.7 → +1, ≥ 0.4 → +0.5
  - Duration > 120 minutes → +0.5
  - Score ≥ 3.5 → "C1+", ≥ 2.5 → "B2", ≥ 1.5 → "B1", ≥ 0.5 → "A2", else "A1"
- **Minimum**: 30 minutes to get a level (shows "—" below that)
- **Display**: Stat card with green/yellow/red dot

### 3.4 Accuracy Estimate
- **Algorithm**: `estimateAccuracy(lexDiv, qualityScore)`:
  - Base: 85%
  - LexDiv > 0.4 → +5%, < 0.25 → -10%
  - Quality > 0.6 → +5%, < 0.3 → -8%
  - Clamped to 50–99%
- **Display**: "Accuracy" stat card

### 3.5 Error Rate
- **Calculation**: `100 - accuracy`. Shows "—" if accuracy is null.
- **Display**: "Error rate" stat card

### 3.6 Strength Indicators
- **Speaking pace**: Derived from WPM. Good pace 100–180 → high score. Fast (>180) → medium. Slow → medium.
- **Lexical variety**: Derived from lexical diversity. > 0.4 → high. Else → medium.
- **Fluency**: Derived from fillers/min. < 3 → high. Else → medium.
- Falls back to "Consistency" card at 70% if not enough data.

### 3.7 Grammar Topics
- Currently static: Sentence structure, Word order, Verb forms, Prepositions, Articles, Connectors, Question formation. Same for all languages. Ready for AI-generated per-topic scoring.

---

## 4. Goals Page Metrics

Computed in `goals.html`. Stored in `localStorage` + synced to Supabase `user_preferences`.

### 4.1 Target Minutes Per Week
- **Default**: 120 minutes
- **User sets**: Number input (1–600)
- **Progress bar**: `actualMinutes / targetMinutes`. ≥ 100% → green, ≥ 50% → amber, else red.

### 4.2 Target Sessions Per Week
- **Default**: 5 sessions
- **User sets**: Number input (1–100)
- **Progress bar**: Same color logic as minutes.

### 4.3 CEFR Target Level
- **Default**: B1
- **User sets**: Button group (A1–C2)
- **Description**: Hardcoded CEFR descriptors per level
- **Synced to Supabase**: `user_preferences.level`

### 4.4 Goal Label (Supabase)
- **Mapped from CEFR**: A1/A2 → "maintenance", B1/B2 → "b2_6m", C1/C2 → "fluency"

---

## 5. Live Session Sidebar (studio.html)

Computed in `studio.html` → polling script (runs every 2s).

### 5.1 Obiettivi Panel
- **When listening**: Shows "● In session" badge + words this session + link to goals
- **After session**: Shows "● Last session" badge + words recorded + link
- **Idle**: Shows prompt to start session + link to goals

### 5.2 Training Panel
- **When listening**: Shows live words + lines counts + recording note
- **After session**: Shows session complete badge + words/lines + link to training
- **Idle**: Shows prompt + link to training

### 5.3 Analysis Panel
- **When session has data**: Shows line count + link to analysis
- **Idle**: Shows description of 4 families/28 modules + link

### 5.4 Live Stats (Stats card)
- **Lines**: `transcriptLines.length`
- **Words**: `countWords(plain)`
- **Chars**: `plain.length`
- **Updated**: Via `updateStats()` in `app.js`, reflected in DOM elements polled by sidebar script

---

## 6. Analysis Page

### 6.1 Session Selection
- Loads last 20 sessions for the logged-in user from Supabase `sessions`
- Shows mode, date, duration, WPM in dropdown

### 6.2 AI Report Modules
- 14 modules in 4 families loaded from Supabase `ai_report_modules`:
  - **Cambridge**: Grammar & Accuracy, Vocabulary Range, Fluency & Coherence, Pronunciation
  - **Business**: Professional Communication, Meetings & Presentations, Business Vocabulary
  - **Academic**: Academic Discourse, Research Communication, Academic Vocabulary
  - **Linguistic**: Discourse Analysis, Syntax & Complexity, Lexical Analysis, Filler Analysis
- **Status flow**: Idle → Click "Genera report" → Inserts into `ai_report_requests` (status: pending) → Edge Function processes → Inserts into `session_ai_reports` (status: done) → Frontend polls every 5s → Button becomes "Vedi report"

### 6.3 Report Display
- **Fields shown**: `summary_text`, `overall_score` (0–100%), `strengths` (array), `issues` (array), `recommendations` (array)
- **Generated by**: OpenAI GPT-4 via Supabase Edge Function (`supabase/functions/process-ai-reports/`)

---

## 7. Translation Metrics

Computed in `app.js` → `maybeTranslate()`.

### 7.1 Translation Provider
- **Default**: MyMemory API (`api.mymemory.translated.net/get`)
- **Configuration**: `config.js` → `translation.provider`, `translation.myMemoryBase`
- **Language normalization**: `translation-providers.js` → `normalizeLangCode()` (splits on `-`, takes base, checks against allowed list)

### 7.2 Translation Output
- **Where shown**: `translatedOutput` panel (translated text prepended as lines), overlay payload includes `translated` field
- **Per-session**: `transcriptLines[].translated` stores translation for each entry

---

## 8. Overlay Display

### 8.1 Caption Format
- **New format** (`app.js`): `{ type: "caption", room, mode, final, timestamp, sourceLang, kind, translated?, targetLang? }`
- **Legacy format** (capture-pro, transcript): `{ msg: true, final: text, id: counter, label: label }`
- **Both accepted** by overlay.html and overlay-roll.html (normalized on receipt)

### 8.2 POS Coloring (English Lesson)
- If mode contains "lesson" → tokens are colored by part-of-speech:
  - Verbs → blue (`#2563eb`)
  - Nouns → green (`#16a34a`)
  - Adjectives → orange (`#f97316`)
  - Adverbs → purple (`#7c3aed`)
- **Requires**: `js/lemma-pos-map.js` → `window.LEMMA_POS_MAP`

---

## 9. Security

### 9.1 Room ID Validation
- **Module**: `security-utils.js` → `window.SottotitoliSecurity`
- **Auto-checks** on every page load when `?room=` is in URL
- **Patterns flagged**: Common words (test, demo, guest...), short IDs (< 4 chars), numeric-only, repetitive
- **Warning banner**: Fixed at top, dismissible, with "New room" fix button that removes the `?room=` param
- **Loaded by**: `studio.html`, `studio.html`, and legacy pages

---

## 10. Quick Reference: Where Users See Each Metric

| Metric | studio.html | Account Dashboard | Viaggio | Goals | Analysis | CSV |
|--------|----------|-------------------|---------|-------|----------|-----|
| Duration | — | ✓ (Time spoken) | ✓ (Talk time) | ✓ (progress) | ✓ | ✓ |
| Words | ✓ (Stats) | — | — | ✓ (progress) | — | ✓ |
| Chars | ✓ (Stats) | — | — | — | — | ✓ |
| WPM | ✓ (Report) | ✓ (Avg WPM) | ✓ (CEFR input) | — | ✓ | ✓ |
| Sentences | — | — | — | — | — | ✓ |
| Fillers/min | ✓ (Report) | ✓ (Fillers/min) | ✓ (Fluency) | — | — | ✓ |
| Unique words | ✓ (Report) | ✓ (Unique words) | — | — | — | ✓ |
| Lexical diversity | ✓ (Report) | ✓ (Lex div) | ✓ (CEFR input) | — | — | ✓ |
| Quality score | ✓ (Report) | ✓ (Quality) | ✓ (CEFR input) | — | — | ✓ |
| NGSL coverage | — | — | — | — | — | ✓ |
| Questions | — | ✓ (Questions) | — | — | — | ✓ |
| Negations | — | ✓ (Negations) | — | — | — | ✓ |
| Repetition rate | — | ✓ (Rep rate) | — | — | — | ✓ |
| Turns | — | ✓ (Turns) | — | — | — | ✓ |
| Interruptions | — | ✓ (Interruptions) | — | — | — | ✓ |
| Speaking share | — | ✓ (Speaking share) | — | — | — | ✓ |
| Streak | — | ✓ | — | ✓ | — | — |
| CEFR estimate | — | — | ✓ | — | — | — |
| Accuracy | — | — | ✓ | — | — | — |
