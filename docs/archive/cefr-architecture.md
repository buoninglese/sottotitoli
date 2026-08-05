# CEFR Integration — Full Architecture
# ====================================
# Compiled 2026-07-29 for agent verification.
# Every file, its purpose, its location, and how it all connects.

---

## SYSTEM DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (GitHub Pages)                        │
│                                                                  │
│  panoramica.html          caption-s8t.html                      │
│  ├─ js/cefr-gse.js        ├─ js/cefr-gse.js                     │
│  │  (pure JS, no deps)    │  (pure JS, no deps)                 │
│  │                        │                                     │
│  │  ┌─────────────────┐   │  ┌─────────────────┐               │
│  │  │ Flesch (local)  │   │  │ Flesch (local)  │               │
│  │  │ Syllable count  │   │  │ Syllable count  │               │
│  │  │ GSE blending    │   │  │ GSE blending    │               │
│  │  └────────┬────────┘   │  └────────┬────────┘               │
│  │           │                │           │                     │
│  │           ▼                │           ▼                     │
│  │  ┌─────────────────┐   │  │  ┌─────────────────┐           │
│  │  │ Word-level CEFR │   │  │  │ Word-level CEFR │           │
│  │  │ lookup (API)    │   │  │  │ lookup (API)    │           │
│  │  └────────┬────────┘   │  │  └────────┬────────┘           │
│  └───────────┼────────────┘  └───────────┼────────────────────┘
│              │                            │
│     fetch() │ GET /api/cefr/*    fetch() │ POST /api/cefr/batch
│              │                            │
└──────────────┼────────────────────────────┼────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              RENDER (sottotitoli-websocket)                       │
│                                                                   │
│  server.js                                                        │
│  ├─ app.use('/api/cefr', cefrRouter)  ← BEFORE main cors()       │
│  │                                                               │
│  routes/cefr.js                                                  │
│  ├─ Permissive CORS (*, GET/POST/OPTIONS)                        │
│  ├─ better-sqlite3 (readonly connection)                         │
│  │                                                               │
│  │  GET  /api/cefr/word?w=happy                                  │
│  │  POST /api/cefr/batch          { words: [...] }               │
│  │  GET  /api/cefr/categories                                    │
│  │  GET  /api/cefr/category/:id                                  │
│  │  GET  /api/cefr/word-family?lemma=happy                       │
│  │  POST /api/cefr/analyze        { text: "..." }                │
│  │                                                               │
│  └─── queries ───▶  word_cefr_minified.db (20MB, readonly)       │
│                     ├─ words          (100K+ rows)                │
│                     ├─ word_pos       (word+POS→CEFR level)      │
│                     ├─ pos_tags       (28 Penn Treebank tags)    │
│                     ├─ word_categories (word↔topic bridge)       │
│                     └─ categories     (39 topics)                │
└──────────────────────────────────────────────────────────────────┘
```

---

## FILE INVENTORY

### Frontend (sottotitoli repo — this one)

| File | Purpose | Status |
|------|---------|--------|
| `js/cefr-gse.js` | Pure-JS scoring engine. Flesch, syllable counter, GSE blending. No dependencies. | ✅ Committed, syntax-verified |
| `config.example.js` | Template config — has `cefrApiUrl` field pointing to Render | ✅ Committed |
| `config.js` | Real config (gitignored) — must have same `cefrApiUrl` key | ⚠️ Must be manually updated |
| `panoramica.html` | Dashboard — CEFR Explorer panel + GSE metric card + topic filter | ✅ Agent-implemented, committed |
| `caption-s8t.html` | Live captioning — GSE badge + topic slide + rarity indicator | ✅ Agent-implemented, committed |
| `docs/cefr-roadmap-panoramica.md` | Agent instructions for panoramica integration | 📄 Reference only |
| `docs/cefr-roadmap-caption-s8t.md` | Agent instructions for caption-s8t integration | 📄 Reference only |
| `docs/cefr-render-setup.md` | Step-by-step Render deployment guide | 📄 Reference only |
| `scripts/cefr-api.js` | Reference copy of the Render API routes | 📄 Reference only |

### Backend (sottotitoli-websocket repo — separate)

| File | Purpose | Status |
|------|---------|--------|
| `server.js` | Main server — `app.use('/api/cefr', cefrRouter)` BEFORE `cors()` | ✅ Committed, deployed |
| `routes/cefr.js` | 6 REST endpoints + permissive CORS + DB connection | ✅ Committed, deployed |
| `word_cefr_minified.db` | 20MB SQLite vocabulary DB (Maximax67/Words-CEFR-Dataset, MIT) | ✅ Committed, deployed |
| `package.json` | Added `better-sqlite3` dependency | ✅ Committed, deployed |

---

## FRONTEND API: window.SottotitoliGSE

```javascript
// ═══════════════════════════════════════
// Full API surface of js/cefr-gse.js
// ═══════════════════════════════════════

// LOW-LEVEL HELPERS
SottotitoliGSE.syllableCount(word)        // "happy" → 2
SottotitoliGSE.textSyllableCount(text)    // "The cat sat." → 3
SottotitoliGSE.sentenceCount(text)        // "Hi. Bye." → 2
SottotitoliGSE.wordCount(text)            // "Hi there" → 2
SottotitoliGSE.tokenize(text)             // ["hi","there"]

// CORE FORMULAS
SottotitoliGSE.fleschReadingEase(text)    // → float 0–120 (higher=easier)
SottotitoliGSE.readingGSE(fleschScore)    // flesch→GSE (10–90)
SottotitoliGSE.vocabGSE(avgCefrFloat)     // avg word level→GSE (1.0→22, 6.0→82)
SottotitoliGSE.overallGSE(readGse, vocabGse)  // blend 0.1×read + 0.9×vocab
SottotitoliGSE.cefrBand(gse)              // → {band,label,cls,color,gse}
SottotitoliGSE.wordCEFR(floatLevel)       // single word 1.0-6.0→{band,label,color}

// FULL PIPELINE
SottotitoliGSE.analyze(text, vocabLookup)
// Returns: {
//   wordCount, sentenceCount, syllableCount,
//   flesch, readingGSE, vocabGSE, overallGSE,
//   cefrBand, cefrLabel, cefrColor, cefrClass,
//   distribution: {A1,A2,B1,B2,C1,C2,unknown},
//   coverage: 85  (percent)
// }

// CONVENIENCE (added by agent fix)
SottotitoliGSE.scoreText(text)
// Returns: { score, band, color, label }
// (Calls analyze with null vocabLookup — Flesch-only mode)

// CONSTANTS
SottotitoliGSE.BANDS     // array of {min,max,band,label,cls,color}
SottotitoliGSE.GSE_MIN   // 10
SottotitoliGSE.GSE_MAX   // 90
SottotitoliGSE.BLEND_VOCAB  // 0.9
SottotitoliGSE.BLEND_READ   // 0.1
```

### CEFR→GSE Mapping (used internally)
```
CEFR 1.0 (A1) → GSE 22    CEFR 4.0 (B2) → GSE 58
CEFR 2.0 (A2) → GSE 34    CEFR 5.0 (C1) → GSE 70
CEFR 3.0 (B1) → GSE 46    CEFR 6.0 (C2) → GSE 82
Formula: gse = 12 × cefrFloat + 10, clamped to [10,90]
```

### GSE→CEFR Thresholds
```
10–21: <A1    22–29: A1    30–38: A2    39–50: B1
51–58: B2     59–74: C1    75–90: C2
```

---

## BACKEND API: 6 Endpoints

**Base URL:** `https://sottotitoli-websocket.onrender.com/api/cefr`

### GET /word?w={word}
Returns all POS entries for a word with CEFR levels.
```json
{
  "found": true,
  "word": "happy",
  "results": [
    {
      "pos": "JJ",
      "posDescription": "Adjective",
      "level": 1.0,
      "cefr": "A1",
      "frequency": 80155187,
      "lemma": null,
      "stem": null
    },
    {
      "pos": "NN",
      "posDescription": "Noun, singular or mass",
      "level": 1.0,
      "cefr": "A1",
      "frequency": 3920721,
      "lemma": null,
      "stem": null
    }
  ]
}
```
If word not found: `{ "found": false, "word": "xyz" }`

### POST /batch
Body: `{ "words": ["apple","happy","thrives"] }`
Returns: `{ "apple": {"level":1,"pos":"JJ"}, "happy":{"level":1,"pos":"JJ"}, "thrives":{"level":5.86,"pos":"NNS"} }`
- Only returns words FOUND in the DB. Missing words are silently omitted.

### GET /categories
Returns array of 39 `{ "category_id": N, "category_title": "..." }` objects.

### GET /category/:id
Returns array of `{ "word", "tag", "level", "frequency_count", "category_title" }` for that topic.

### GET /word-family?lemma={word}
Returns array of `{ "word", "tag", "level", "frequency_count" }` for all morphological relatives.

### POST /analyze
Body: `{ "text": "..." }`
Returns:
```json
{
  "totalWords": 18,
  "uniqueWords": 14,
  "avgLevel": 1.06,
  "cefrBand": "A1",
  "levelDistribution": { "A1":14, "A2":0, "B1":0, "B2":0, "C1":0, "C2":0, "unknown":0 },
  "topicDistribution": { "Food and drink": 5, "Daily life": 3 },
  "coverage": "100%",
  "wordData": { "happy":{"level":1,"frequency":80155187}, ... }
}
```

---

## CRITICAL ARCHITECTURAL DECISIONS

### 1. Middleware Ordering (THE BUG THAT TOOK 3 FIXES)
The CEFR routes MUST be mounted BEFORE the main `cors()` middleware.
```
✅ CORRECT:
app.use('/api/cefr', cefrRouter);   // permissive CORS runs first
app.use(cors({...}));                // restrictive CORS runs second

❌ WRONG (was the bug):
app.use(cors({...}));                // rejects localhost before CEFR routes see it
app.use('/api/cefr', cefrRouter);
```

### 2. DB is Read-Only
`word_cefr_minified.db` is opened with `readonly: true`. Any write operations (like `PRAGMA journal_mode = WAL`) will fail. The pragmas are wrapped in try/catch.

### 3. No Auth on CEFR Routes
All 6 endpoints are public. No API key, no auth header. This is intentional — the DB is read-only and contains only public-domain vocabulary data.

### 4. CORS: Permissive for CEFR Only
Only `/api/cefr/*` paths have `Access-Control-Allow-Origin: *`. All other routes (health, analyze-speakers) use the restrictive CORS from `ALLOWED_ORIGINS` env var.

### 5. Vocabulary Weighting
The blend formula is `0.9 × vocab + 0.1 × reading`. This is from CEFR.AI's published research. Vocabulary dominates because SLA research shows word knowledge matters far more than sentence length for language learners.

---

## VERIFICATION CHECKLIST (for agent to verify)

Run these commands in order:

### 1. Check frontend module syntax
```bash
cd /path/to/sottotitoli
node --check js/cefr-gse.js && echo "PASS"
```

### 2. Check API health
```bash
curl -s https://sottotitoli-websocket.onrender.com/health
# Should return: {"ok":true,...}
```

### 3. Check CORS headers
```bash
curl -sI -X OPTIONS "https://sottotitoli-websocket.onrender.com/api/cefr/categories" \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: GET" | grep "access-control"
# Should show:
#   access-control-allow-origin: *
#   access-control-allow-methods: GET, POST, OPTIONS
#   access-control-allow-headers: Content-Type
```

### 4. Check all 6 endpoints
```bash
# Word lookup
curl -s "https://sottotitoli-websocket.onrender.com/api/cefr/word?w=happy" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['found']==True; print('PASS')"

# Batch
curl -s -X POST "https://sottotitoli-websocket.onrender.com/api/cefr/batch" -H "Content-Type: application/json" -d '{"words":["algorithm","nuance"]}' | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['algorithm']['level']>=5; assert d['nuance']['level']>=5; print('PASS')"

# Categories
curl -s "https://sottotitoli-websocket.onrender.com/api/cefr/categories" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d)==39; print('PASS')"

# Category words  
curl -s "https://sottotitoli-websocket.onrender.com/api/cefr/category/1" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d)>0; print('PASS')"

# Word family
curl -s "https://sottotitoli-websocket.onrender.com/api/cefr/word-family?lemma=happy" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d)>0; print('PASS')"

# Analyze
curl -s -X POST "https://sottotitoli-websocket.onrender.com/api/cefr/analyze" -H "Content-Type: application/json" -d '{"text":"The sophisticated algorithm detected subtle nuances."}' | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['cefrBand'] in ['B1','B2']; print('PASS')"
```

### 5. Check config
```bash
# In sottotitoli repo:
grep "cefrApiUrl" config.example.js
# Should show: cefrApiUrl: "https://sottotitoli-websocket.onrender.com/api/cefr",
```

### 6. Check script loading in pages
```bash
# Both pages must load cefr-gse.js after cefr-levels.js
grep "cefr-gse.js" panoramica.html caption-s8t.html
# Should show both files include the script tag
```

---

## KNOWN GOTCHAS

1. **Word not found = silent omission.** The `/batch` endpoint only returns words it finds. The frontend must handle missing keys gracefully (show "?" or use heuristic fallback).

2. **`scoreText()` is Flesch-only.** The convenience method doesn't use vocab data. For full accuracy, use `analyze()` with a vocab lookup from the API.

3. **Cloudflare caching.** The Render service sits behind Cloudflare. CORS header changes may take 30-60 seconds to propagate. Use `Cache-Control: no-cache` header when testing.

4. **DB on free Render tier.** The service sleeps after inactivity. First request after idle may take 30-60 seconds (cold start). Subsequent requests are instant.

5. **English only.** The DB is English-only. Italian/Dutch/Spanish words will return `found: false` or be omitted from batch results. The frontend has language gating (`cefrMetrics` capability check) for this.

6. **`better-sqlite3` is native.** It compiles SQLite from source. Must match Node version on Render. If deploy fails, check Render build logs for native module errors.

---

## DEPENDENCY CHAIN

```
sottotitoli (frontend)
└── js/cefr-gse.js          (zero deps, pure JS)
    └── fetches to →
        sottotitoli-websocket (backend)
        ├── express           (already had)
        ├── better-sqlite3    (NEW — added for CEFR)
        └── word_cefr_minified.db  (NEW — 20MB, from Maximax67/Words-CEFR-Dataset, MIT)
```

---

## SOURCES

- CEFR.AI Score Engine v1 formulas: https://www.cefr.ai/research/current-model-score-engine-v1
- Words-CEFR-Dataset (MIT): https://github.com/Maximax67/Words-CEFR-Dataset
- GSE→CEFR mapping: Pearson 2024 Global Scale of English
- Flesch Reading Ease: standard formula (public domain)
