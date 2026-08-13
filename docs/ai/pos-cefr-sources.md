# POS & CEFR Sources — Settled Decision

> **Scope:** every UI element that shows a POS tag or a CEFR level.
> **Status:** DECIDED 2026-08-13 · implemented in `js/it-lexicon.js` + call sites.
> Supersedes: ad-hoc per-file chains (flat B1 for Italian, English-only dictionaries used for Italian).

---

## 1. Source chains (final)

### POS — English
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | **LEMMA_POS_MAP** (rebuilt 2026-08-14 — 3,782 words, NGSL-curated > WordNet vote > Penn tagger) | local | `scripts/build-lemma-pos-map.py` |
| 2 | **NGSL** (`js/en-ngsl.js` — 2,809 words, curated POS + rank + learner definition) | local | also feeds definitions |
| 3 | Datamuse `tags` + dictionary `partOfSpeech` (Free Dictionary / WordsAPI / Wordnik) | live API responses | fills `'—'` POS in enrichOneCard |
| 4 | Compromise Penn Treebank (`tagWordPenn` / caption `tagWord`) | local lib | reliable for common words, weak on rare/multi-POS |
| 5 | Suffix heuristics (caption-s8t `tagWord` fallback) | local | last resort |
| 6 | `'—'` / `OTHER` | — | honest unknown |

### POS — Italian
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | **KELLY wordlist** (`js/it-kelly.js` — 6,369 words) | local, SHIPPED | **primary** — user-provided it_m3.numbers → scripts/build-it-kelly.py |
| 2 | **IT_HARD** — curated C1/C2 vocabulary (~70 words) | `js/it-lexicon.js` | fills level gaps KELLY doesn't rate (arcigno, biasimare, turpiloquio…) |
| 3 | Wiktionary IT parse (`=== Sostantivo ===` header) | live, VB Italian only | enrich when a live definition page exists |
| 4 | `js/it-lexicon.js` — curated core map + `itPosGuess()` suffix rules | local | Italian morphology is highly regular |
| 5 | `review_words.pos` (stored at save time) | Supabase | shown in Word Banks table |
| 6 | `'—'` | — | honest unknown |

### CEFR — English
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | `js/cefr-levels.js` (`CEFR_LEVELS`, EVP-derived) | local | primary |
| 2 | Render backend `POST /api/cefr/batch` (words-CEFR-dataset) | live | **verified LIVE 2026-08-14** (HTTP 200, returns `{word:{level,pos}}`); caption-s8t caches it in `_sessionWordCache` (levels are numbers 1-6 → A1-C2) |
| 3 | `'—'` | — | **length heuristic REMOVED** — no fabricated levels |

### CEFR — Italian
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | **KELLY wordlist level** (`js/it-kelly.js`) | local, SHIPPED | **primary** — 4,960 leveled words (A1:1013 … C2:137) |
| 2 | `js/it-lexicon.js` — `IT_CEFR` map + `itCefrGuess()` suffix bands | local | for words KELLY doesn't rate |
| 3 | Length fallback (Italian-tuned) | local | last resort |

**KELLY facts:** 6,369 single-word entries · 1,409 rows with no level (tail of export) → fall through to suffix bands · 169 phrase lemmas skipped · comma-lemmas split (`"il, lo, la"` → il/lo/la). POS codes: v n adj adv prep conj det pron num np int abb for.

---

## 2. Best options considered (Italian gap)

| Option | POS | CEFR | Verdict |
|--------|-----|------|---------|
| **KELLY wordlist (shipped as `js/it-kelly.js`)** | ✅ strong | ✅ official levels | **chosen — primary** · user-provided it_m3.numbers, built by scripts/build-it-kelly.py |
| **Wiktionary IT live parse** | ✅ strong | ❌ no CEFR | keep for POS enrichment |
| **`js/it-lexicon.js` suffix rules** | ✅ morphology | ⚠️ bands | fallback layer |
| PAISÀ / itWaC frequency → level bands | ❌ | ⚠️ decent approximation | future upgrade — needs corpus download + preprocess |
| Treccani / De Mauro | ✅ premium | ❌ | scraping, ToS risk — rejected |
| Datamuse for Italian | ❌ doesn't exist | ❌ | impossible |
| Render `/api/cefr` for Italian | ❌ | ❌ words-CEFR-dataset is English-only | backend upgrade out of scope |

**Why local JS instead of a Supabase table:** 6,369 rows ≈ 139 KB — identical to how English works (CEFR_LEVELS + LEMMA_POS_MAP are local JS). A Supabase table would add a network roundtrip per lookup, RLS, migrations and an offline failure mode, for zero benefit on static reference data. Rebuild anytime: `python3 scripts/build-it-kelly.py`.

## 3. Supabase schema facts (verified from migrations)

- `user_wordbank_words` columns: `id, wordbank_id, word, pos, usage_count, last_used, created_at, status, updated_at`. **No** `user_id`, **no** `lang`, **no** `cefr`.
- `user_wordbanks` owns `user_id` + `lang`.
- Therefore: language filtering of words must **join through `user_wordbanks`**; POS persists in `pos`; CEFR is **not persisted** on words (shown from local lookups / `review_words.cefr`).

Fixed while settling this: `saveItalianWordToBank`, `enrichBankStatus`, `bookmarkExpandWord` were inserting/querying non-existent columns (silent PostgREST errors).

## 4. Call sites wired to the new chains

- Panoramica VB English — unchanged (chain above).
- Panoramica VB Italian — CEFR: `S8T_IT_LEXICON.getCEFR(w,'it')` (KELLY → core → suffix → length); POS: Wiktionary → KELLY → suffix; related words: `S8T_IT_LEXICON.relatedItalian` (KELLY prefix families).
- Panoramica `saveItalianWordToBank` — stores `pos` from the IT chain (valid column).
- caption-s8t `tagWord` — Italian captions resolve POS through KELLY first.
- caption-s8t `_getCEFR` — Italian captions use the IT chain.
- Any future caller: use `window.S8T_IT_LEXICON.getPOS(word, lang)` / `.getCEFR(word, lang)` / `.relatedItalian(word)` — single entry point. `.posSource()/.cefrSource()` expose which layer answered (KELLY / core-map / suffix-rules) for tooltips.

## 6. NGSL (New General Service List) — English high-frequency layer

- `js/en-ngsl.js` — 2,809 words, each `[rank, pos, ipa, definition]` — built by `scripts/build-en-ngsl.py` from the NGSL 1.2 Learning Dictionary.
- POS feeds LEMMA_POS_MAP build (curated override) + caption `tagWord` + popup POS.
- Definitions act as the **FIRST** (instant, offline) source: VB chain = **NGSL → Free Dictionary (direct → proxy) → WordsAPI**; caption lookup = **NGSL → Datamuse → Free Dictionary**; caption popup = WORD_DEFS → **NGSL** → Free Dictionary.
- Rank is stored for future frequency-based features (not used for CEFR — no fabrication).

## 7. Dictionary API benchmark (2026-08-14, 20 words incl. rare/slang/multi-POS)

| Source | Coverage | Avg latency | Verdict |
|--------|----------|-------------|---------|
| NGSL (local) | 6/20 (the 2,809 most frequent only) | ~3ms | FIRST — instant certainty |
| Free Dictionary DIRECT | 18/20 | 233ms | #2 — best live source |
| Free Dictionary via proxy | 15/20 | 658ms | backup only (slower + thinner) |
| WordsAPI (RapidAPI) | 18/20 | 300ms | #3 — backup, quota-aware |
| **Wordnik proxy** | **0/20** | 106ms | **DEAD — removed from all chains** |

## 5. Fallback policy (always)

Never show a fabricated value as if it were data:
- POS unknown → `'—'` (English VB already does; Italian now does too).
- CEFR unknown → heuristic is acceptable (labelled as estimate), but **never** hardcode one level (the old B1 default is gone).
