/* ═══ MATTR Calculator — Moving Average Type-Token Ratio ═══ */
/* Lexical diversity metric for English transcripts.              */
/* Window size: 50 tokens (standard for spoken language).         */
/* MATTR = mean of TTR over each sliding window.                  */

(function(){
  'use strict';

  var WINDOW_SIZE = 50;

  /**
   * Tokenize text into clean lowercase words.
   * Strips punctuation, numbers, and single-char tokens.
   */
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text.toLowerCase()
      .replace(/['\u2018\u2019]/g, '\'')  // normalize smart quotes
      .replace(/[^a-z'\s]/gi, ' ')        // strip everything except letters/apostrophes
      .split(/\s+/)
      .filter(function(w) { return w.length > 1 && !/^\d+$/.test(w); });
  }

  /**
   * Calculate Type-Token Ratio for a single window.
   * TTR = unique tokens / total tokens in window.
   */
  function windowTTR(tokens, start, size) {
    var end = Math.min(start + size, tokens.length);
    if (end - start < 10) return null; // skip windows that are too small
    var seen = {};
    var unique = 0;
    for (var i = start; i < end; i++) {
      if (!seen[tokens[i]]) { seen[tokens[i]] = true; unique++; }
    }
    return unique / (end - start);
  }

  /**
   * Calculate MATTR for a token array.
   * Slides a window of WINDOW_SIZE across tokens, averages TTR.
   * Returns a score between 0 (all same word) and 1 (all unique).
   */
  function calculateMATTR(tokens) {
    if (!tokens || tokens.length < WINDOW_SIZE) {
      // For short texts (< 50 tokens): just use raw TTR
      if (!tokens || tokens.length === 0) return 0;
      var seen = {};
      var unique = 0;
      for (var i = 0; i < tokens.length; i++) {
        if (!seen[tokens[i]]) { seen[tokens[i]] = true; unique++; }
      }
      return unique / tokens.length;
    }
    var windows = tokens.length - WINDOW_SIZE + 1;
    var sumTTR = 0;
    var validWindows = 0;
    for (var w = 0; w < windows; w++) {
      var ttr = windowTTR(tokens, w, WINDOW_SIZE);
      if (ttr !== null) { sumTTR += ttr; validWindows++; }
    }
    return validWindows > 0 ? sumTTR / validWindows : 0;
  }

  /**
   * Calculate MATTR from raw transcript text.
   * Returns { mattr: number, tokenCount: number }.
   */
  function analyze(text) {
    var tokens = tokenize(text);
    var mattr = calculateMATTR(tokens);
    return {
      mattr: Math.round(mattr * 1000) / 1000, // round to 3 decimal places
      tokenCount: tokens.length
    };
  }

  /* ── Export ── */
  window.MattrCalculator = {
    tokenize: tokenize,
    calculateMATTR: calculateMATTR,
    analyze: analyze,
    WINDOW_SIZE: WINDOW_SIZE
  };

})();
