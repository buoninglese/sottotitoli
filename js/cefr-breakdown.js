/* ═══ CEFR Breakdown Calculator ═══ */
/* Maps English tokens to CEFR levels (A1-C2).                    */
/* Uses cefr-levels.js dictionary + lemma-pos-map.js fallback.    */
/* Unknown words estimated by word-length heuristics.             */

(function(){
  'use strict';

  /**
   * Get CEFR level for a single word.
   * Priority: 1) direct dictionary lookup, 2) lemma lookup, 3) heuristic.
   */
  function getCEFR(word) {
    var w = word.toLowerCase();
    // 1) Direct dictionary match
    if (window.CEFR_LEVELS && window.CEFR_LEVELS[w]) {
      return window.CEFR_LEVELS[w];
    }
    // 2) Try lemma lookup
    if (window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[w]) {
      var lemmaPos = window.LEMMA_POS_MAP[w];
      if (typeof lemmaPos === 'string' && window.CEFR_LEVELS && window.CEFR_LEVELS[lemmaPos]) {
        return window.CEFR_LEVELS[lemmaPos];
      }
    }
    // 3) Heuristic based on word length (approximate)
    if (w.length <= 3) return 'A1';
    if (w.length <= 5) return 'A2';
    if (w.length <= 7) return 'B1';
    if (w.length <= 9) return 'B2';
    if (w.length <= 11) return 'C1';
    return 'C2';
  }

  /**
   * Analyze tokens and return CEFR breakdown.
   * @param {string[]} tokens - array of lowercase word tokens
   * @returns {{ counts: {A1,A2,B1,B2,C1,C2,total}, uniqueByLevel: {...}, coveragePercent: number }}
   */
  function analyze(tokens) {
    if (!tokens || !tokens.length) {
      return { counts: { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0, total:0 }, uniqueByLevel: {}, coveragePercent: 0 };
    }

    var counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, total: tokens.length };

    // Count tokens per CEFR level
    for (var i = 0; i < tokens.length; i++) {
      var level = getCEFR(tokens[i]);
      if (counts[level] !== undefined) {
        counts[level]++;
      }
    }

    // Unique lemmas per level
    var uniqueByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    var seenByLevel = { A1: {}, A2: {}, B1: {}, B2: {}, C1: {}, C2: {} };
    for (var j = 0; j < tokens.length; j++) {
      var lvl = getCEFR(tokens[j]);
      if (seenByLevel[lvl] && !seenByLevel[lvl][tokens[j]]) {
        seenByLevel[lvl][tokens[j]] = true;
        uniqueByLevel[lvl]++;
      }
    }

    // NGSL-like coverage: % of tokens that are A1+B1 (high-frequency = comprehensible)
    var covered = (counts.A1 || 0) + (counts.A2 || 0);
    var coveragePercent = counts.total > 0 ? Math.round((covered / counts.total) * 100) : 0;

    return {
      counts: counts,
      uniqueByLevel: uniqueByLevel,
      coveragePercent: coveragePercent
    };
  }

  /* ── Export ── */
  window.CefrBreakdown = {
    getCEFR: getCEFR,
    analyze: analyze
  };

})();
