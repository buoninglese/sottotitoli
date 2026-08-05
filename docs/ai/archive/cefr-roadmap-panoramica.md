# CEFR Integration Roadmap — panoramica.html
# =============================================
# Hand this to your dedicated agent. It describes all CEFR-related additions
# to panoramica.html, what data is available, and how to build each component.
#
# Prerequisites (already built):
#   - js/cefr-gse.js  →  window.SottotitoliGSE.analyze(text, vocabLookup)
#   - Render API:        GET/POST endpoints at https://YOUR-RENDER-SERVER/api/cefr/*
#
# Script to add in <head> (after cefr-levels.js):
#   <script src="js/cefr-gse.js"></script>
# =============================================

---

## COMPONENT 1: New Panel — `pnl-cefr-explorer`

**Where:** Add a new `<div class="content-panel" id="pnl-cefr-explorer">` 
after the last existing panel. Add a nav item in the sidebar:
```html
<li class="nav-item" data-panel="cefr-explorer">
  <i class="fa-solid fa-microscope"></i><span>CEFR Explorer</span>
</li>
```

**What it does:** A standalone vocabulary exploration panel with 3 sub-tabs.

### Sub-tab A: "Topic Browser" (sub-topic)
- Fetch categories: `GET /api/cefr/categories` → returns array of `{category_id, category_title}`
- Render as a grid of clickable pills/cards (one per category, 39 total)
- Clicking a category fetches: `GET /api/cefr/category/:id` → returns array of `{word, tag, level, frequency_count, category_title}`
- Display as a sortable table: columns = Word, POS, Level, Frequency
- Sort controls: by frequency (default), by level (hardest first), alphabetical
- Each word is clickable → opens a modal/drawer with full word details (all POS entries, example sentences placeholder)
- Color-code the level column by CEFR band (green/yellow/orange/red/purple)

**CSS needed:** 
```css
.topic-pill { display:inline-block; padding:8px 16px; border-radius:100px; cursor:pointer; }
.topic-pill.active { background:var(--accent-purple); color:#fff; }
.cefr-table { width:100%; border-collapse:collapse; }
.cefr-table th { text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); }
.cefr-table td { padding:6px 12px; }
```

### Sub-tab B: "Word Family" (sub-family)
- Search input: type a word → `GET /api/cefr/word-family?lemma=happy`
- Returns all morphological forms: happy, happier, happiest, happiness, unhappy, happily
- Display as a tree/hierarchy card: center word → branches to derived forms
- Each form shows: word, POS tag, CEFR level badge (color-coded), frequency bar
- "Surprise me" button picks a random word from the DB

### Sub-tab C: "Frequency Explorer" (sub-frequency)
- Fetch ALL words with their frequency counts (cached from `/api/cefr/analyze` calls)
- Display as a scrollable list sorted by rarity (lowest frequency first = rarest words)
- Filter by CEFR level (checkboxes: A1 A2 B1 B2 C1 C2)
- Each word shows: rank, word, frequency bar (log scale), level badge
- "Top 100 Rare Words" and "Top 100 Common Words" toggle

**Data flow:**
```
User opens panel → GET /api/cefr/categories (once, cached in sessionStorage)
User clicks category → GET /api/cefr/category/:id
User searches word family → GET /api/cefr/word-family?lemma=X
```

---

## COMPONENT 2: GSE Metric Card on Main Dashboard

**Where:** In `pnl-panoramica`, inside the `.stats-row` div that contains
the 4 metric cards (Sessions, Minutes, Words, Lexical Diversity).

**What to add:** A 5th card showing overall vocabulary CEFR level.

**HTML template:**
```html
<div class="metric-card" id="card-gse-score">
  <div class="metric-icon"><i class="fa-solid fa-chart-line"></i></div>
  <div class="metric-value" id="gseScoreDisplay">--</div>
  <div class="metric-label">GSE Score (10-90)</div>
  <div class="metric-sub" id="gseBandDisplay">Loading...</div>
</div>
```

**How it works:**
1. When `pnl-panoramica` becomes visible, call the analyze endpoint:
   ```
   POST /api/cefr/analyze
   Body: { text: aggregatedTextFromAllUserSessions }
   ```
   (The data service likely has a way to get all user text — check
    `window.SottotitoliData` for a method that returns session transcripts.
    If not, use the most recent session's transcript.)
2. Parse response: `{ avgLevel, cefrBand, levelDistribution, coverage }`
3. Feed `avgLevel` into `window.SottotitoliGSE.vocabGSE(avgLevel)` → GSE number
4. Feed GSE into `window.SottotitoliGSE.cefrBand(gse)` → label + color
5. Update the card with the number, label, and color-code the background gradient
6. Store result in sessionStorage — refresh every 24h max

**Edge cases:**
- No data yet: show "--" with a "Start a session to see your level" tooltip
- API down: show last cached value with "(cached)" label
- 0 coverage: show "Not enough vocabulary data"

---

## COMPONENT 3: Enhance Vocabulary Trainer CEFR Quad

**Where:** In `pnl-vocabulary-trainer`, sub-tab `vt-dashboard`.
There's already a CEFR distribution quad (4-box chart).

**What to enhance:**
- Replace A1/A2/B1/B2 labels with A1-C2 (all 6 levels)
- Add numeric GSE score underneath each bar
- Fetch from `POST /api/cefr/analyze` using the user's vocabulary word list
- Add a sparkline showing GSE trend over last 30 days (stored in Supabase)

**New design:**
```
┌──────────┬──────────┬──────────┐
│  A1  22  │  A2  34  │  B1  45  │
│  ██████  │  ████    │  ██      │
│  45%     │  28%     │  15%     │
├──────────┼──────────┼──────────┤
│  B2  55  │  C1  66  │  C2  82  │
│  █       │  █       │  ▏       │
│  8%      │  3%      │  1%      │
└──────────┴──────────┴──────────┘
         Overall GSE: 29 (A2)
```

---

## COMPONENT 4: Word Banks "By Topic" Filter

**Where:** In `pnl-wordbanks`, sub-tabs `wb-overview` and `wb-overview-it`.

**What to add:** A new filter dropdown "Filtra per tema" that lists the 39 categories.
Selecting a category fetches words from `GET /api/cefr/category/:id` and displays
them as cards. Each card shows: word, POS, level badge, frequency bar.

**Implementation:** Add a `<select>` above the word bank grid. On change, fetch
and render cards. Cache category lists in sessionStorage.

---

## IMPORTANT IMPLEMENTATION NOTES

1. **API base URL:** Use `window.SOTTOTITOLI_CONFIG.cefrApiUrl` (add to config.js
   and config.example.js). Default: same as websocket URL but with /api/cefr path.

2. **Caching:** All GET responses should be cached in sessionStorage for 1 hour.
   Wrap fetch calls in a `cachedFetch(url, ttlMs)` helper.

3. **Error handling:** Every API call should have a `.catch()` that returns
   a graceful fallback (empty state, "--" display, or last-known-good cached value).

4. **Loading states:** Show a subtle skeleton/spinner while API calls are in flight.
   Use `.metric-card.loading { opacity:0.5; pointer-events:none; }`

5. **No API key needed:** The Render backend has no auth for these read-only endpoints.
   They're public (read-only DB queries).

6. **Script loading:** Add `<script src="js/cefr-gse.js"></script>` to panoramica.html's
   `<head>`, after the existing `cefr-levels.js` script tag.
