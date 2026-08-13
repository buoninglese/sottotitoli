# POS & CEFR Sources — Settled Decision

> **Scope:** every UI element that shows a POS tag or a CEFR level.
> **Status:** DECIDED 2026-08-13 · implemented in `js/it-lexicon.js` + call sites.
> Supersedes: ad-hoc per-file chains (flat B1 for Italian, English-only dictionaries used for Italian).

---

## 1. Source chains (final)

### POS — English
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | `js/lemma-pos-map.js` (`LEMMA_POS_MAP`) | local, 50 KB curated | primary; built in sottotitoli-learning repo |
| 2 | Compromise Penn Treebank (`tagWordPenn`) | local lib | second |
| 3 | API response POS (Datamuse `tags`, Free Dictionary `partOfSpeech`, Wordnik) | live | enrichment of cards |
| 4 | Suffix heuristics (caption-s8t `tagWord` fallback) | local | last resort |
| 5 | `'—'` / `OTHER` | — | honest unknown |

### POS — Italian
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | **KELLY wordlist** (`js/it-kelly.js` — 6,369 words) | local, SHIPPED | **primary** — user-provided it_m3.numbers → scripts/build-it-kelly.py |
| 2 | Wiktionary IT parse (`=== Sostantivo ===` header) | live, VB Italian only | enrich when a live definition page exists |
| 3 | `js/it-lexicon.js` — curated core map + `itPosGuess()` suffix rules | local | Italian morphology is highly regular (`-are/-ere/-ire` → VERB, `-zione/-mento/-ità` → NOUN, `-mente` → ADV, `-oso/-ico/-ivo` → ADJ) |
| 4 | `review_words.pos` (stored at save time) | Supabase | shown in Word Banks table |
| 5 | `'—'` | — | honest unknown |

### CEFR — English
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | `js/cefr-levels.js` (`CEFR_LEVELS`, EVP-derived) | local | primary |
| 2 | Render backend `POST /api/cefr/batch` (words-CEFR-dataset) | live | for new words in caption sessions |
| 3 | Length heuristic (`estimateCEFR`) | local | fallback |

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

## 5. Fallback policy (always)

Never show a fabricated value as if it were data:
- POS unknown → `'—'` (English VB already does; Italian now does too).
- CEFR unknown → heuristic is acceptable (labelled as estimate), but **never** hardcode one level (the old B1 default is gone).
