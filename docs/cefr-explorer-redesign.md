# CEFR Explorer — Architecture & Redesign Vision
# ================================================
# For agent implementation: how the current CEFR Explorer works,
# and how to redesign it with Vocabulary Builder card style + user-aware suggestions.
# ================================================

---

## PART 1: CURRENT ARCHITECTURE (what exists today)

### Data Flow

```
User opens CEFR Explorer sidebar item
    │
    ├─► Tab A (Topic Browser): loadCefrTopics()
    │     GET /api/cefr/categories → 39 categories
    │     Rendered as: <button class="topic-pill fchip"> pills
    │     User clicks pill → openCefrTopic(catId)
    │       GET /api/cefr/category/:id → {word, tag, level, frequency_count}[]
    │       Rendered as: HTML <table> rows with word/POS/level badge/frequency
    │       Sortable by: frequency (default), level, alphabetical
    │
    ├─► Tab B (Word Family): user types a word
    │     searchCefrFamily() → GET /api/cefr/word-family?lemma=happy
    │       Returns: [{word, tag, level, frequency_count}]
    │       Rendered as: simple flexbox cards (not wbx-box style)
    │       "Surprise me" → hardcoded list of 10 words
    │
    └─► Tab C (Frequency Explorer): loadCefrFrequencies()
          Fetches 10 categories sequentially, merges, deduplicates
          Rendered as: simple flexbox row list with bar charts
          Filterable by CEFR level, Top 100 Rare / Top 100 Common
```

### Rendering Functions

| Function | Location | What it does |
|----------|----------|-------------|
| `loadCefrTopics()` | Line ~8286 | Fetches `/categories`, renders pill grid |
| `openCefrTopic(id, title)` | Line ~8310 | Fetches `/category/:id`, renders table |
| `renderCefrWords()` | Line ~8340 | Sorts + renders table rows |
| `searchCefrFamily()` | Line ~8350 | Fetches `/word-family`, renders card grid |
| `surpriseCefrFamily()` | Line ~8390 | Picks from hardcoded array |
| `loadCefrFrequencies()` | Line ~8395 | Fetches 10 categories, merges, renders bar list |

### Problems with Current Design

1. **No user context.** Shows ALL words equally. A C2 learner sees the same A1 words as a beginner.
2. **No vocabulary builder integration.** Can't save words you like.
3. **No "gap" detection.** Doesn't tell you which words you should learn next.
4. **Table layout** doesn't match the rest of the site (Vocabulary Builder uses `.wbx-box` brutalist cards).
5. **Hardcoded surprises.** The "surprise me" list is static — doesn't use the user's actual session data.
6. **Frequency Explorer is raw data dump.** Shows 100 rare/common words without context.

---

## PART 2: REDESIGN VISION

### Design Principles

1. **Visual continuity.** All word cards MUST use the `.wbx-box` class from Vocabulary Builder.
   Same grid (`.wbx-grid`), same hover lift, same color schemes, same save sidebar.
2. **User-aware defaults.** Every tab defaults to showing words relevant to the user's level.
3. **Actionable.** Every word card has a save/bookmark button wired to the same vocabulary system.
4. **Gap-driven discovery.** "Surprise me" pulls from the user's actual session vocabulary gaps.

### Card Structure (`.wbx-box`)

Each word is a brutalist poster card matching Vocabulary Builder exactly:

```html
<div class="wbx-grid">
  <div class="wbx-box" data-pos="NOUN|VERB|ADJ|ADV" data-cefr="A1|A2|B1|B2|C1|C2">
    <!-- Main content area -->
    <div class="wbx-word-zone">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="wbx-w">word</span>
        <span class="wbx-cefr">B1</span>
      </div>
      <div class="wbx-pos">noun</div>
      <div class="wbx-ipa">/wɜːd/</div>
      <div class="wbx-def">definition from lookup</div>
      <!-- frequency bar -->
      <div style="height:3px;background:var(--line);border-radius:2px;margin-top:4px">
        <div style="height:100%;width:45%;background:var(--sz-accent)"></div>
      </div>
    </div>
    <!-- Save sidebar -->
    <div class="wbx-save-col">
      <button class="wbx-save-btn" onclick="saveCefrWord('word')">+</button>
      <button class="wbx-bookmark-btn" onclick="bookmarkCefrWord('word')">☆</button>
    </div>
    <!-- Meta zone (synonyms from DataMuse) -->
    <div class="wbx-syns" style="display:none">
      <span onclick="expandWord('word')">synonym</span>
    </div>
  </div>
</div>
```

The parent container should support color scheme switching (like Vocabulary Builder's `data-wb-scheme="0-7"`).

### Redesigned Tab A: Topic Browser → "Suggested by Topic"

**Default view:** User's CEFR level (from GSE score) → show topics relevant to their level.

```
┌─────────────────────────────────────────────────────────┐
│  Topic Browser           [My Level: B1 ▼]  [All ▼]     │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 🍕 Food  │ │ ✈️ Travel│ │ 💼 Work  │  ... 39 pills│
│  │  45 words│ │  32 words│ │  28 words│               │
│  │  12 new  │ │   8 new  │ │  15 new  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  Click topic → word grid below:                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │restaurant│ │  recipe │ │  cuisine│ │  gourmet│      │
│  │   B1 ⓘ  │ │   B2  ☆ │ │   B2 ⓘ  │ │   C1  ☆ │      │
│  │ 12M freq│ │  8M freq│ │  5M freq│ │  2M freq│      │
│  │  [+][☆] │ │  [+][☆] │ │  [+][☆] │ │  [+][☆] │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
└─────────────────────────────────────────────────────────┘
```

- "New" badge = words NOT in user's Supabase vocabulary
- "My Level" dropdown defaults to user's estimated CEFR band (from GSE)
- Cards use `.wbx-box` with CEFR accent coloring
- Frequency bar shows relative rarity

### Redesigned Tab B: Word Family → "Suggested by Your Sessions"

**Default view:** Words extracted from user's recent session transcripts, shown with their morphological families.

```
┌─────────────────────────────────────────────────────────┐
│  Word Family          [From sessions] [Search...] [🎲]  │
│                                                         │
│  Based on your last 3 sessions:                         │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  COMMUNICATE │ │   ANALYZE   │ │   DEVELOP   │       │
│  │  ─────────── │ │  ────────── │ │  ────────── │       │
│  │ communication│ │  analysis   │ │ development │       │
│  │ communicative│ │  analytical │ │  developer  │       │
│  │ communicated │ │  analyzer   │ │  developing │       │
│  │  [+][☆]     │ │  [+][☆]     │ │  [+][☆]     │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

- "From sessions" tab: extracts key content words (nouns, verbs, adjectives) from recent session transcripts
- Calls `/api/cefr/word-family?lemma=X` for each key word
- Groups by root word, shows derived forms as `.wbx-box` cards
- "🎲 Surprise me" picks from the user's unseen session words
- Falls back to "Search" mode for manual lookup

### Redesigned Tab C: Frequency Explorer → "Your Vocabulary Gaps"

**Default view:** Words -1 and +1 CEFR level from the user, sorted by frequency.

```
┌─────────────────────────────────────────────────────────┐
│  Vocabulary Gaps    [My Level: B1 ▼]  [Rare first ▼]    │
│                                                         │
│  📊 A2 words you might have missed (45):                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  annual │ │  budget │ │  crisis │ │  debate │      │
│  │   A2 ⓘ  │ │   A2 ⓘ  │ │   B1 ⓘ  │ │   B1  ☆ │      │
│  │  [+][☆] │ │  [+][☆] │ │  [+][☆] │ │  [+][☆] │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  🚀 B2 words to stretch toward (23):                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ advocate│ │  compile│ │  diverse│                   │
│  │   B2 ⓘ  │ │   B2 ⓘ  │ │   B2 ⓘ  │                   │
│  │  [+][☆] │ │  [+][☆] │ │  [+][☆] │                   │
│  └─────────┘ └─────────┘ └─────────┘                  │
└─────────────────────────────────────────────────────────┘
```

- Shows words from the DB filtered by CEFR level range
- "A2 words" = words below user's level (consolidation)
- "B2 words" = words above user's level (stretch goal)
- Excludes words already in user's Supabase vocabulary
- Sortable by frequency, alphabetical, or CEFR level
- Each card: word, POS, CEFR badge, frequency bar, save/bookmark buttons

---

## PART 3: API ENDPOINTS NEEDED

All already exist — no new endpoints required:

| Endpoint | Used By | Returns |
|----------|---------|---------|
| `GET /cefr/categories` | Tab A (pills) | 39 categories |
| `GET /cefr/category/:id` | Tab A (word grid) | Words in topic |
| `GET /cefr/word-family?lemma=X` | Tab B (family cards) | Derived forms |
| `GET /cefr/word?w=X` | Card detail modal | Full POS entries |
| Supabase `user_vocabulary` | All tabs (gap detection) | Words user already knows |

### NEW helper needed: getUserVocabularySet()

```javascript
async function getUserVocabularySet() {
  // Fetch all words the user has saved/encountered
  var sb = window.sottotitoliSupabase;
  if (!sb) return new Set();
  var r = await sb.auth.getSession();
  if (!r.data?.session) return new Set();
  var uid = r.data.session.user.id;
  var data = await sb.from('user_vocabulary')
    .select('lemma')
    .eq('user_id', uid)
    .eq('lang', 'en');
  return new Set((data.data || []).map(w => w.lemma.toLowerCase()));
}
```

This enables:
- Tab A: label pills with "12 new" (words not in set)
- Tab C: filter out known words, show only gaps
- Tab B: exclude already-saved words from suggestions

---

## PART 4: COLOR SCHEME CONTINUITY

Use the same 8 schemes as Vocabulary Builder (`data-wb-scheme`):

| Scheme | Name | Light BG | Dark BG | Accent |
|--------|------|----------|---------|--------|
| 0 | Sky (default) | #dbeafe | #0f1c24 | #0369a1 / #38bdf8 |
| 1 | Indigo | #e0e7ff | #080c14 | #4338ca / #818cf8 |
| 2 | Sky | #e0f2fe | #0a1628 | #0369a1 / #38bdf8 |
| 3 | Ocean | #cffafe | #0c4a6e | #0e7490 / #67e8f9 |
| 4 | Forest | #d1fae5 | #0f2a1a | #047857 / #34d399 |
| 5 | Violet | #ede9fe | #1a0f2e | #6d28d9 / #c4b5fd |
| 6 | Amber | #fef3c7 | #2e2410 | #b45309 / #fbbf24 |
| 7 | Rose | #ffe4e6 | #2a0f24 | #be185d / #fda4af |

Scheme picker at the top-right of the panel (a row of small color swatches or a dropdown).

The CEFR accent colors (used on the `.wbx-cefr` badge and left border):
- A1: #34d399 / #86efac
- A2: #10b981 / #4ade80
- B1: #059669 / #fb923c
- B2: #047857 / #fdba74
- C1: #064e3b / #fda4af
- C2: #0e7490 / #06b6d4

---

## PART 5: IMPLEMENTATION ORDER

### Phase 1: Card Component (1-2 hours)
1. Copy the `.wbx-box` HTML template from Vocabulary Builder
2. Build a `renderCefrCard(wordData)` function that outputs a card
3. Add scheme picker CSS variables
4. Test with hardcoded data

### Phase 2: Gap Detection (1 hour)
1. Implement `getUserVocabularySet()` — fetch user's known words from Supabase
2. Add "new" badge logic to pills and cards
3. Filter words already known from default display

### Phase 3: User-Aware Defaults (1-2 hours)
1. Tab A: default to user's CEFR level topics
2. Tab B: extract words from user's sessions, show families
3. Tab C: show -1 and +1 level gaps
4. Surprise me: use user's session data

### Phase 4: Save Integration (30 min)
1. Wire card save/bookmark buttons to Supabase `user_vocabulary`
2. Toggle saved state on cards
3. Consistent with Vocabulary Builder save behavior

---

## PART 6: KEY DESIGN DECISIONS

1. **Cards over tables.** The `.wbx-box` card grid is the site's signature word display pattern. CEFR Explorer must match.
2. **User-first defaults.** No more showing raw DB dumps. Every tab defaults to the user's data.
3. **Save everywhere.** Every word card has a save button. Same Supabase table as Vocabulary Builder.
4. **Gap-driven.** Show words the user HASN'T seen, not words they already know. The "new" count is the key metric.
5. **Scheme continuity.** Use the same 8 color schemes. Users familiar with Vocabulary Builder should feel at home.
