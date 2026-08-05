# VOC-EXPLORER.MD — Vocabulary Explorer Agent Reference

> **File:** `panoramica.html`
> **Panel:** `#pnl-vocabulary-builder` → subtab `#sub-wb-explore`
> **Nav:** `data-panel="vocable-explorer"` in sidebar
> **Last updated:** 2026-08-04

---

## 1. Purpose

The Vocabulary Explorer (formerly "CEFR Explorer") lets users browse English vocabulary by topic, powered by the **Words-CEFR-Dataset** (Maximax67, MIT license) via a Render backend API. Users click a topic pill → see word cards grouped by part of speech → save/bookmark words.

---

## 2. Architecture

```
Browser                          Render (free tier)                  Datamuse API
───────                          ──────────────────                  ────────────
panoramica.html                  sottotitoli-websocket               api.datamuse.com
  │                              │                                         │
  ├─ loadCefrTopics() ──────────► GET /api/cefr/categories?counts=1       │
  │                              │                                         │
  ├─ openCefrTopic(id) ────────► GET /api/cefr/category/:id              │
  │                              │                                         │
  └─ augmentTopicWithDatamuse() ──────────────────────────────────────────►
                                 rel_jjb (adjectives) + rel_gen (hypernyms)
                                 + rel_trg (verbs) per top-8 nouns
```

- **API base:** `window.SOTTOTITOLI_CONFIG.cefrApiUrl` (falls back to `https://sottotitoli-websocket.onrender.com/api/cefr`)
- **Cache:** `cachedCefrFetch()` — 1-hour in-memory cache, keyed by URL
- **Cold start:** Render free tier takes 30–60s to wake. `loadCefrTopics()` has an 8-second AbortController timeout with a fallback empty state.

---

## 3. HTML Structure

Located inside the **Vocabulary Builder** panel (`#pnl-vocabulary-builder`), under the **Esplora** subtab (`#sub-wb-explore`):

```html
<!-- ═══ CEFR Vocabulary Explorer ═══ -->
<div role="tabpanel" class="subtab-pane" id="sub-wb-explore">

  <!-- Stats bar (hidden until topics load) -->
  <div class="wb-stats" id="cefrTopicStats" style="margin-bottom:14px;display:none"></div>

  <!-- Search bar -->
  <div class="wb-search-bar" style="margin-bottom:14px">
    <input class="wb-search-input" id="cefrTopicSearch"
           placeholder="Cerca un argomento..." oninput="filterCefrTopics()">
  </div>

  <!-- Relevance toggle -->
  <div style="display:flex;gap:8px;margin-bottom:14px">
    <button class="fchip active" onclick="toggleCefrRelevance('all')">All topics</button>
    <button class="fchip" onclick="toggleCefrRelevance('relevant')">Relevant to me</button>
  </div>

  <!-- Topic pill grid -->
  <div id="cefrTopicGrid" style="display:flex;flex-wrap:wrap;gap:8px">
    <span>Caricamento argomenti...</span>
  </div>

  <!-- Word cards (hidden until topic clicked) -->
  <div id="cefrTopicWords" style="display:none;margin-top:16px">
    <h3 id="cefrTopicTitle">—</h3>
    <button onclick="closeCefrTopic()">← Back</button>

    <!-- Sort chips -->
    <button class="fchip active" onclick="sortCefrWords(this,'frequency')">Per frequenza</button>
    <button class="fchip" onclick="sortCefrWords(this,'level')">Per livello</button>
    <button class="fchip" onclick="sortCefrWords(this,'alpha')">Alfabetico</button>

    <!-- Card grid (rendered by renderCefrWords) -->
    <div id="cefrTopicGrid2"></div>
  </div>
</div>
```

**Key element IDs:**
| ID | Purpose |
|----|---------|
| `cefrTopicSearch` | Text search input, triggers `filterCefrTopics()` on input |
| `cefrTopicGrid` | Container for topic `fchip` pills |
| `cefrTopicWords` | Word card section (hidden until topic clicked) |
| `cefrTopicTitle` | Shows active topic name |
| `cefrTopicGrid2` | Word card grid (3-col, collapses on narrow screens) |

---

## 4. CSS

**Location:** Inline `<style>` block, around line 536.

```css
/* Vocabulary Explorer: max 3 columns, collapse on narrow panels */
#cefrTopicGrid2 .wbx-grid { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 1000px) { #cefrTopicGrid2 .wbx-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 650px)  { #cefrTopicGrid2 .wbx-grid { grid-template-columns: 1fr; } }
```

Topic pills use the shared `.fchip` style. Word cards use the shared `.wbx-box` style from the Vocabulary Builder, with:
- **CEFR left border** (`border-left: 5px solid <color>`)
- **Frequency bar** (5px height, colored to match CEFR level)
- **Save/bookmark buttons** in `.wbx-save-col`

---

## 5. JavaScript — Core Functions

**Location:** Lines ~10888–11290 in `panoramica.html`, inside the `(function(){...})()` IIFE.

### 5.1 State Variables

```javascript
var _cefrApi = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.cefrApiUrl)
            || 'https://sottotitoli-websocket.onrender.com/api/cefr';
var _cefrCache = {};                    // 1-hour fetch cache
var _cefrCategories = null;            // Cached category list from API
var _cefrCurrentWords = [];            // Words for currently open topic
var _cefrCurrentSort = 'frequency';    // 'frequency' | 'level' | 'alpha'
var _cefrTopicRelevance = 'all';       // 'all' | 'relevant'
```

### 5.2 Level/POS Mapping

```javascript
var _cefrLevelMap = { 1:'A1', 2:'A2', 3:'B1', 4:'B2', 5:'C1', 6:'C2' };
var _cefrLevelColors = { A1:'#22c55e', A2:'#3b82f6', B1:'#eab308', B2:'#f97316', C1:'#ef4444', C2:'#a855f7' };

// Penn Treebank tag → human-readable
var POS_LABELS = { 'NN':'noun', 'VB':'verb', 'JJ':'adjective', 'RB':'adverb', ... };
var POS_ORDER = ['noun','verb','adjective','adverb','preposition','conjunction','pronoun',...];
```

### 5.3 `cachedCefrFetch(url, ttlMs)`
Generic fetch-with-cache. Default TTL = 1 hour. Cache key = URL slug.

### 5.4 `loadCefrTopics()`
- Fetches `GET /api/cefr/categories?counts=1`
- 8-second AbortController timeout
- Stores result in `_cefrCategories`
- Calls `renderCefrTopicPills()`
- On error: shows "Esplora CEFR — sarà disponibile a breve." empty state

### 5.5 `renderCefrTopicPills()`
- Filters `_cefrCategories` by `_cefrTopicRelevance` (word_count ≥ 10 for "relevant")
- Renders `<button class="topic-pill fchip">` elements into `#cefrTopicGrid`
- Updates `#cefrTopicStats` with topic count

### 5.6 `toggleCefrRelevance(mode)`
- Sets `_cefrTopicRelevance` to `'all'` or `'relevant'`
- Toggles `.active` class on the two toggle buttons (first 2 `.fchip` in `#sub-wb-explore`)
- Calls `renderCefrTopicPills()`

### 5.7 `filterCefrTopics()`
- Reads `#cefrTopicSearch` value
- Shows/hides `.topic-pill` buttons in `#cefrTopicGrid` by text match

### 5.8 `openCefrTopic(catId, catTitle)`
- Hides `#cefrTopicGrid`, shows `#cefrTopicWords`
- Fetches `GET /api/cefr/category/:id` (cached)
- Calls `augmentTopicWithDatamuse()` to enrich with adjectives/verbs/hypernyms
- Calls `renderCefrWords()` to render cards

### 5.9 `augmentTopicWithDatamuse(catTitle, words)`
- Extracts top 8 nouns by frequency from the topic words
- For each noun, fetches from Datamuse API:
  - `rel_jjb` (adjectives that modify this noun) → tagged as `JJ`
  - `rel_gen` (hypernyms — broader terms) → tagged as `NN`
  - `rel_trg` (verbs commonly associated) → tagged as `VB`
- Filters words through local dictionaries (`CEFR_LEVELS`, `LEMMA_POS_MAP`, `CEFR_GSE`)
- Parses Datamuse `f:` tags for frequency (per-million → estimated total via ×468,000)
- Caches results per noun+topic in `_augCache`
- Heuristic verb detection: `looksLikeVerb()` checks suffixes (-ing, -ed, -ate, -ize, etc.)
- Word validation: `isKnownWord()` checks length ≥2, has vowel, only letters, not repeating

### 5.10 `renderCefrWords()`
- Sorts `_cefrCurrentWords` by frequency/level/alphabetical
- Groups by POS via `groupByPOS()`
- Renders cards grouped under POS section headers ("nouns (12 words)")
- Each card: `.wbx-box` with CEFR-colored left border, frequency bar, save/bookmark buttons
- Card width: 3 columns → 2 → 1 (responsive)

### 5.11 `closeCefrTopic()`
- Shows `#cefrTopicGrid`, hides `#cefrTopicWords`
- Restores search bar visibility
- Clears `_cefrCurrentWords`

### 5.12 `formatFreqCount(n)`
Formats raw frequency: ≥1B → "1.2B", ≥1M → "45.7M", ≥1K → "2.3K", else raw.

### 5.13 `estimateCEFRLevel(word)`
Quick CEFR estimate for Datamuse-augmented words (no API call):
- Checks `window.CEFR_LEVELS[word]` first
- Falls back to word-length heuristic: ≤4→A1, ≤6→A2, ≤8→B1, ≤10→B2, else C1

---

## 6. API Endpoints

All endpoints are on the Render backend (`sottotitoli-websocket.onrender.com`).

### 6.1 `GET /api/cefr/categories?counts=1`

Returns 39 categories with word counts.

```json
[
  { "category_id": 38, "category_title": "Adjectives: personality, description, feelings", "word_count": 1 },
  { "category_id": 1,  "category_title": "Arts", "word_count": 27 },
  ...
]
```

### 6.2 `GET /api/cefr/category/:id`

Returns words for a category. Fields:
- `word` — lemma
- `tag` — Penn Treebank POS tag (NN, VB, JJ, RB, VBG, NNS, etc.)
- `level` — numeric CEFR level (1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2)
- `frequency_count` — raw frequency from Google Ngrams
- `category_title` — category name

```json
[
  { "word": "fun", "tag": "NN", "level": 1, "frequency_count": 31589463, "category_title": "Adjectives: ..." }
]
```

### 6.3 `GET /api/cefr/word-family?lemma=X`

Returns morphological family members. Same field format as `/category/:id`. Flat list (not grouped).

### 6.4 `GET /api/cefr/gaps?below=X&above=Y&sort=freq-desc`

Returns vocabulary gaps. Used by the old prototype (Tab C) — **not currently wired**.

---

## 7. Init & Event Wiring

```javascript
// Subtab click → load topics
document.querySelectorAll('#pnl-vocabulary-builder .tab-link[data-subtab]').forEach(function(tab){
  tab.addEventListener('click', function(){
    var subtab = this.getAttribute('data-subtab');
    if (subtab === 'wb-explore') { setTimeout(loadCefrTopics, 100); }
  });
});
document.querySelector('[data-subtab="wb-explore"]')?.addEventListener('click',
  function(){ setTimeout(loadCefrTopics, 100); });

// Global exports
window.loadCefrTopics = loadCefrTopics;
window.filterCefrTopics = filterCefrTopics;
window.toggleCefrRelevance = toggleCefrRelevance;
window.openCefrTopic = openCefrTopic;
window.closeCefrTopic = closeCefrTopic;
window.sortCefrWords = sortCefrWords;
window.openCefrWordDetail = openCefrWordDetail;
window.saveCefrWord = saveCefrWord;
window.toggleBookmarkCefr = toggleBookmarkCefr;
```

---

## 8. Known Issues & Limitations

| Issue | Details |
|-------|---------|
| **saveCefrWord not wired** | `saveCefrWord()` toggles a CSS class but doesn't persist to Supabase. Marked `// TODO`. |
| **openCefrWordDetail is a stub** | Shows `alert()` with word/level/pos. |
| **No Tab B (word families)** | Removed in commit `31c3799`. |
| **No Tab C (gap detection)** | Removed in commit `31c3799`. |
| **Datamuse rate limit** | No rate limiting on `api.datamuse.com` calls — up to 8 nouns × 3 relations = 24 requests per topic open. |
| **"Relevant to me" heuristic** | Filters by `word_count >= 10`, not by user's actual CEFR level or known vocabulary. |
| **Render cold start** | First load after inactivity shows "Esplora CEFR — sarà disponibile a breve." Retry requires page reload or re-clicking the subtab. |
| **No dark mode overrides** | Cards use shared `.wbx-box` styles from Vocabulary Builder which already have dark mode support. |

---

## 9. Dependencies

| Dependency | Source |
|------------|--------|
| `window.SOTTOTITOLI_CONFIG.cefrApiUrl` | `config.js` → `https://sottotitoli-websocket.onrender.com/api/cefr` |
| `window.CEFR_LEVELS` | `js/cefr-levels.js` — word→level mapping |
| `window.LEMMA_POS_MAP` | `js/lemma-pos-map.js` — word→POS mapping |
| `window.CEFR_GSE` | `js/cefr-gse.js` — GSE scoring (used for Datamuse validation) |
| `window.SottotitoliData` | Supabase data layer (not used by VocExplorer directly) |
| Datamuse API | `https://api.datamuse.com` — free, no auth, no rate limit documented |

---

## 10. Commands

```bash
# Local dev
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8000
# Open: http://localhost:8000/panoramica.html
# Nav: Vocabulary Builder → Esplora subtab

# Test API
curl https://sottotitoli-websocket.onrender.com/api/cefr/categories?counts=1
curl https://sottotitoli-websocket.onrender.com/api/cefr/category/1
curl https://sottotitoli-websocket.onrender.com/api/cefr/word-family?lemma=develop

# Syntax check
python3 -c "import re; f=open('panoramica.html').read(); s=list(re.finditer(r'<script>([\\s\\S]*?)</script>',f)); js=s[-1].group(1); open('/tmp/c.js','w').write(js)"
node --check /tmp/c.js
```
