/* ═══════════════════════════════════════════════════════════════════════════
 * js/cefr-gse.js — SottotitoliGSE
 * Pure-JS CEFR text difficulty scoring engine.
 * No dependencies. No API calls needed for Flesch + blending.
 * Vocabulary GSE lookups come from the CEFR API (Render backend).
 *
 * Based on CEFR.AI Score Engine v1 published formulas:
 *   https://www.cefr.ai/research/current-model-score-engine-v1
 *
 * MIT License — Sottotitoli project
 * ═══════════════════════════════════════════════════════════════════════════ */

(function (w) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────
  var FLESCH_BASE  = 206.835;
  var FLESCH_WORD  = 1.015;
  var FLESCH_SYLL  = 84.6;
  var GSE_READING_SLOPE  = -3.2;
  var GSE_READING_INTERCEPT = 280;
  var GSE_VOCAB_SLOPE  = 5.0;
  var GSE_VOCAB_INTERCEPT = -90;
  var BLEND_VOCAB  = 0.9;   // vocabulary weight
  var BLEND_READ   = 0.1;   // readability weight
  var GSE_MIN = 10;
  var GSE_MAX = 90;

  // GSE → CEFR band thresholds (Pearson 2024)
  var BANDS = [
    { min: 10, max: 21, band: '<A1', label: 'Pre-Beginner',    cls: 'cefr-a0', color: '#9ca3af' },
    { min: 22, max: 29, band: 'A1',  label: 'Beginner',         cls: 'cefr-a1', color: '#22c55e' },
    { min: 30, max: 38, band: 'A2',  label: 'Elementary',       cls: 'cefr-a2', color: '#3b82f6' },
    { min: 39, max: 50, band: 'B1',  label: 'Intermediate',     cls: 'cefr-b1', color: '#eab308' },
    { min: 51, max: 58, band: 'B2',  label: 'Upper Intermediate',cls: 'cefr-b2', color: '#f97316' },
    { min: 59, max: 74, band: 'C1',  label: 'Advanced',         cls: 'cefr-c1', color: '#ef4444' },
    { min: 75, max: 90, band: 'C2',  label: 'Proficient',       cls: 'cefr-c2', color: '#a855f7' }
  ];

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Clamp a number to [min, max]. */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Count syllables in a single English word (rule-based, ~95% accurate). */
  function syllableCount(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    // Remove silent-e endings, final -ed (unless -ted/-ded), final -es
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    // Count vowel groups
    var syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  /** Count syllables in a full text. Returns integer. */
  function textSyllableCount(text) {
    if (!text || typeof text !== 'string') return 0;
    var words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var total = 0;
    for (var i = 0; i < words.length; i++) {
      total += syllableCount(words[i]);
    }
    return total;
  }

  /** Count sentences in text. Returns at least 1. */
  function sentenceCount(text) {
    if (!text || typeof text !== 'string') return 1;
    var sentences = text.split(/[.!?]+/).filter(function (s) {
      return s.trim().length > 0;
    });
    return Math.max(1, sentences.length);
  }

  /** Count words in text. */
  function wordCount(text) {
    if (!text || typeof text !== 'string') return 0;
    var words = text.replace(/[^a-zA-Z0-9\s'-]/g, '').split(/\s+/).filter(function(w) {
      return w.length > 0 && !/^\d+$/.test(w);
    });
    return words.length;
  }

  /** Tokenize text into lowercase alphabetic tokens (for vocab lookup). */
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    var matches = text.toLowerCase().match(/\b[a-z]+\b/g);
    return matches || [];
  }

  // ── Core Formulas (from CEFR.AI Score Engine v1) ─────────────────────

  /**
   * Compute Flesch Reading Ease score.
   * Returns float (0–120). Higher = easier.
   */
  function fleschReadingEase(text) {
    var wc = wordCount(text);
    var sc = sentenceCount(text);
    var syl = textSyllableCount(text);
    if (wc === 0) return 120;   // empty text = maximum ease
    return FLESCH_BASE - (FLESCH_WORD * (wc / sc)) - (FLESCH_SYLL * (syl / wc));
  }

  /**
   * Convert Flesch score → GSE reading index (10–90).
   * Formula: clamp(−3.2 × flesch + 280, 10, 90)
   */
  function readingGSE(fleschScore) {
    return clamp(GSE_READING_SLOPE * fleschScore + GSE_READING_INTERCEPT, GSE_MIN, GSE_MAX);
  }

  /**
   * Convert average word CEFR level (1.0–6.0) → GSE vocabulary index (10–90).
   * Formula: clamp(5.0 × avgLevel − 90, 10, 90)
   *
   * The avgLevel comes from the API: average of all per-word CEFR float levels.
   * e.g. avgLevel=2.5 → 5.0×2.5−90 = −77.5 → clamped to 10
   *      avgLevel=4.0 → 5.0×4.0−90 = −70 → clamped to 10
   *
   * Wait — that gives extremely low values. Let me re-derive.
   *
   * The CEFR.AI formula uses GSE values, not CEFR 1-6 floats.
   * Their vocab DB stores GSE values (10-90), and avg_word_gse is the direct
   * average of those.
   *
   * In the Words-CEFR-Dataset, `level` is stored as 1.0-6.0 (mapped from CEFR).
   * To use this in the formula, we need to convert:
   *   CEFR 1.0 → GSE 22 (A1 midpoint)
   *   CEFR 2.0 → GSE 34 (A2 midpoint)
   *   CEFR 3.0 → GSE 45 (B1 midpoint)
   *   CEFR 4.0 → GSE 55 (B2 midpoint)
   *   CEFR 5.0 → GSE 66 (C1 midpoint)
   *   CEFR 6.0 → GSE 82 (C2 midpoint)
   *
   * Approximate linear mapping: GSE ≈ 12 × CEFR_level + 10
   * Then: word_gse = clamp(GSE_avg, 10, 90)
   *
   * This matches CEFR.AI's formula conceptually — they use GSE natively,
   * we're bridging from the 1.0–6.0 float scale.
   */
  function vocabGSE(avgCefrFloat) {
    if (avgCefrFloat == null || isNaN(avgCefrFloat)) return GSE_MIN;
    // Map CEFR 1.0-6.0 → GSE 10-90
    var gse = 12 * avgCefrFloat + 10;
    return clamp(gse, GSE_MIN, GSE_MAX);
  }

  /**
   * Blend reading + vocabulary GSE into overall GSE.
   * Formula: 0.9 × vocabGSE + 0.1 × readingGSE
   */
  function overallGSE(readingGse, vocabGse) {
    return Math.round(BLEND_VOCAB * vocabGse + BLEND_READ * readingGse);
  }

  /**
   * Map a GSE score to CEFR band info.
   * Returns { band, label, cls, color, gse } or null.
   */
  function cefrBand(gse) {
    if (gse == null || isNaN(gse)) return null;
    for (var i = 0; i < BANDS.length; i++) {
      if (gse >= BANDS[i].min && gse <= BANDS[i].max) {
        return { band: BANDS[i].band, label: BANDS[i].label,
                 cls: BANDS[i].cls, color: BANDS[i].color, gse: gse };
      }
    }
    return BANDS[0]; // fallback: <A1
  }

  // ── Full Pipeline ─────────────────────────────────────────────────────

  /**
   * Full analysis: text → { gse, band, label, color, reading, vocab, distribution }
   *
   * @param {string} text - The text to analyze
   * @param {Object} vocabLookup - Optional pre-fetched word→{level,pos} map from API.
   *   If not provided, only the Flesch/reading half runs — vocab defaults to 10.
   * @returns {Object} Full analysis result
   */
  function analyze(text, vocabLookup) {
    var wc = wordCount(text);
    var sc = sentenceCount(text);
    var syl = textSyllableCount(text);

    // Reading channel
    var flesch = fleschReadingEase(text);
    var readGse = readingGSE(flesch);

    // Vocabulary channel
    var vocabGseValue = GSE_MIN;
    var cefrDistribution = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, unknown: 0 };
    var totalLeveled = 0;
    var cefrSum = 0;

    if (vocabLookup) {
      var tokens = tokenize(text);
      var uniqueTokens = [];
      var seen = {};
      for (var i = 0; i < tokens.length; i++) {
        if (!seen[tokens[i]]) { seen[tokens[i]] = true; uniqueTokens.push(tokens[i]); }
      }

      for (var j = 0; j < uniqueTokens.length; j++) {
        var entry = vocabLookup[uniqueTokens[j]];
        if (entry && entry.level != null) {
          totalLeveled++;
          cefrSum += entry.level;
          var lvl = Math.round(entry.level);
          var bandNames = ['','A1','A2','B1','B2','C1','C2'];
          var band = bandNames[lvl] || 'unknown';
          cefrDistribution[band] = (cefrDistribution[band] || 0) + 1;
        } else {
          cefrDistribution.unknown++;
        }
      }

      if (totalLeveled > 0) {
        vocabGseValue = vocabGSE(cefrSum / totalLeveled);
      }
    } else {
      // No vocab data: all words are unknown
      cefrDistribution.unknown = wc;
    }

    var blended = overallGSE(readGse, vocabGseValue);
    var band = cefrBand(blended);

    return {
      wordCount: wc,
      sentenceCount: sc,
      syllableCount: syl,
      flesch: +flesch.toFixed(1),
      readingGSE: Math.round(readGse),
      vocabGSE: Math.round(vocabGseValue),
      overallGSE: blended,
      cefrBand: band.band,
      cefrLabel: band.label,
      cefrColor: band.color,
      cefrClass: band.cls,
      distribution: cefrDistribution,
      coverage: wc > 0 ? Math.round((totalLeveled / wc) * 100) : 0
    };
  }

  /**
   * Convenience: get CEFR level from a single word's numeric level.
   * @param {number} floatLevel - 1.0–6.0
   * @returns {{ band, label, color }}
   */
  function wordCEFR(floatLevel) {
    if (floatLevel == null || isNaN(floatLevel)) return { band: '?', label: 'Unknown', color: '#9ca3af' };
    var idx = Math.round(floatLevel);
    if (idx < 1) idx = 1;
    if (idx > 6) idx = 6;
    var b = BANDS[idx + 1]; // A1 starts at index 1 in BANDS array
    return { band: b.band, label: b.label, color: b.color };
  }

  // ── Convenience: score a text without vocab data (Flesch-only mode) ──
  /**
   * Quick GSE score from plain text. No vocab lookup needed.
   * Returns { score, band, color, label } — flat convenience shape.
   */
  function scoreText(text) {
    var result = analyze(text, null);
    return {
      score: result.overallGSE,
      band: result.cefrBand,
      color: result.cefrColor,
      label: result.cefrLabel
    };
  }

  // ── Export ────────────────────────────────────────────────────────────

  w.SottotitoliGSE = {
    // Low-level
    syllableCount: syllableCount,
    textSyllableCount: textSyllableCount,
    sentenceCount: sentenceCount,
    wordCount: wordCount,
    tokenize: tokenize,

    // Formulas
    fleschReadingEase: fleschReadingEase,
    readingGSE: readingGSE,
    vocabGSE: vocabGSE,
    overallGSE: overallGSE,
    cefrBand: cefrBand,
    wordCEFR: wordCEFR,

    // Full pipeline
    analyze: analyze,
    scoreText: scoreText,

    // Constants
    BANDS: BANDS,
    GSE_MIN: GSE_MIN,
    GSE_MAX: GSE_MAX,
    BLEND_VOCAB: BLEND_VOCAB,
    BLEND_READ: BLEND_READ
  };

})(window);
