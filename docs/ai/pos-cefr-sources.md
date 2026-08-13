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
| 1 | Wiktionary IT parse (`=== Sostantivo ===` header) | live, VB Italian only | primary when present |
| 2 | `js/it-lexicon.js` — `IT_POS` map + `itPosGuess()` suffix rules | local, NEW | Italian morphology is highly regular (`-are/-ere/-ire` → VERB, `-zione/-mento/-ità` → NOUN, `-mente` → ADV, `-oso/-ico/-ivo` → ADJ) |
| 3 | `review_words.pos` (stored at save time) | Supabase | shown in Word Banks table |
| 4 | `'—'` | — | honest unknown |

### CEFR — English
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | `js/cefr-levels.js` (`CEFR_LEVELS`, EVP-derived) | local | primary |
| 2 | Render backend `POST /api/cefr/batch` (words-CEFR-dataset) | live | for new words in caption sessions |
| 3 | Length heuristic (`estimateCEFR`) | local | fallback |

### CEFR — Italian
| # | Source | Where | Notes |
|---|--------|-------|-------|
| 1 | `js/it-lexicon.js` — `IT_CEFR` map (~300 curated frequent words) | local, NEW | primary |
| 2 | `itCefrGuess()` suffix+length rules | local, NEW | `-ezza/-anza/-enza/-tudine` → B2, `-zione/-mento/-mente` → B1, infinitives/participles → A2, function words → A1 |
| 3 | Length fallback (Italian-tuned) | local | last resort |

**Old behaviour removed:** Italian defaulted to flat **B1** and prefix-matched an *English* dictionary for related words (returned ≈ nothing).

---

## 2. Best options considered (Italian gap)

| Option | POS | CEFR | Verdict |
|--------|-----|------|---------|
| **Wiktionary IT live parse** | ✅ strong | ❌ no CEFR | keep for POS |
| **`js/it-lexicon.js` (NEW)** | ✅ suffix rules + core map | ✅ core map + suffix bands | **chosen** — free, offline, honest |
| KELLY wordlist (9k words, CEFR-ish) | ⚠️ POS partial | ✅ best quality | future upgrade — license check needed (non-commercial), needs download+build |
| PAISÀ / itWaC frequency → level bands | ❌ | ⚠️ decent approximation | future upgrade — needs corpus download + preprocess |
| Treccani / De Mauro | ✅ premium | ❌ | scraping, ToS risk — rejected |
| Datamuse for Italian | ❌ doesn't exist | ❌ | impossible |
| Render `/api/cefr` for Italian | ❌ | ❌ words-CEFR-dataset is English-only | backend upgrade out of scope |

## 3. Supabase schema facts (verified from migrations)

- `user_wordbank_words` columns: `id, wordbank_id, word, pos, usage_count, last_used, created_at, status, updated_at`. **No** `user_id`, **no** `lang`, **no** `cefr`.
- `user_wordbanks` owns `user_id` + `lang`.
- Therefore: language filtering of words must **join through `user_wordbanks`**; POS persists in `pos`; CEFR is **not persisted** on words (shown from local lookups / `review_words.cefr`).

Fixed while settling this: `saveItalianWordToBank`, `enrichBankStatus`, `bookmarkExpandWord` were inserting/querying non-existent columns (silent PostgREST errors).

## 4. Call sites wired to the new chains

- Panoramica VB English — unchanged (chain above).
- Panoramica VB Italian — CEFR: `S8T_IT_LEXICON.getCEFR(w,'it')`; POS: Wiktionary → `itPosGuess`; related words: IT lexicon prefix families (real Italian words).
- Panoramica `saveItalianWordToBank` — stores `pos` from IT chain (valid column).
- caption-s8t `tagWord` — added Italian verb/participle suffix rules.
- caption-s8t `_getCEFR` — Italian captions use IT chain.
- Any future caller: use `window.S8T_IT_LEXICON.getPOS(word, lang)` / `.getCEFR(word, lang)` — single entry point.

## 5. Fallback policy (always)

Never show a fabricated value as if it were data:
- POS unknown → `'—'` (English VB already does; Italian now does too).
- CEFR unknown → heuristic is acceptable (labelled as estimate), but **never** hardcode one level (the old B1 default is gone).
