/* ═══════════════════════════════════════════════════════════════════════════
 * js/cefr-info.js — CEFR Info Tooltips
 * Localized (IT/EN) explanations for all CEFR metrics across Sottotitoli.
 * Reads language from localStorage('sottotitoli-lang') — same key as i18n.js.
 *
 * Usage:
 *   <span class="cefr-info-icon" data-cefr-info="gse_score">ⓘ</span>
 *
 *   The page calls CefrInfo.init() once. Hover/click on any .cefr-info-icon
 *   shows a tooltip with the localized explanation.
 * ═══════════════════════════════════════════════════════════════════════════ */

(function(w){
  'use strict';

  var TOOLTIPS = {
    it: {
      // ── GSE Score ──
      gse_score: 'Il punteggio GSE (Global Scale of English) va da 10 a 90 e misura la difficoltà complessiva del tuo vocabolario parlato. Unisce la ricchezza lessicale (90%) alla complessità delle frasi (10%). Più alto = vocabolario più avanzato. Tracciarlo nel tempo mostra i tuoi progressi reali.',
      gse_reading: 'La componente di leggibilità misura quanto sono lunghe e complesse le tue frasi. Vale solo il 10% del punteggio totale — il vocabolario conta molto di più.',
      gse_vocab: 'La componente lessicale analizza il livello CEFR (A1-C2) di ogni parola che usi. Vale il 90% del punteggio. Si basa su un database di oltre 100.000 parole inglesi con livelli verificati.',

      // ── CEFR Explorer ──
      cefr_topics: 'Le 39 categorie tematiche del CEFR (cibo, viaggi, lavoro, salute…). Ogni parola nel database è associata a uno o più argomenti. Usa questo explorer per scoprire quali ambiti lessicali conosci meglio e quali puoi approfondire.',
      cefr_family: 'La famiglia lessicale di una parola include tutte le sue forme derivate (es. happy → happiness, unhappy, happily). Conoscere più forme della stessa radice è un indicatore di padronanza avanzata.',
      cefr_frequency: 'La frequenza d\'uso nel mondo reale (dati Google Ngrams). Le parole rare (bassa frequenza) tendono a essere più specialistiche o avanzate. Le parole comuni sono la base della comunicazione quotidiana.',

      // ── Topic Explorer (caption slide) ──
      topic_donut: 'Il grafico a ciambella mostra la distribuzione tematica delle parole che hai usato durante la sessione. Ti aiuta a capire in quali contesti comunichi più spesso e quali ambiti potresti voler espandere.',
      topic_words: 'Elenco delle parole raggruppate per argomento. Ogni parola mostra il suo livello CEFR (A1-C2) e la frequenza d\'uso. Le parole con livello più alto sono più difficili — cercare di usarne di più è un ottimo obiettivo.',

      // ── Rarity ──
      rare_word: 'Questa parola appare raramente nell\'inglese quotidiano (frequenza < 1.000 nel database). Usare parole rare è un segno di vocabolario avanzato!',

      // ── Caption GSE badge ──
      caption_gse: 'Il punteggio GSE in tempo reale della tua sessione. Si aggiorna a ogni frase completata. Combina la difficoltà del vocabolario (90%) con la complessità delle frasi (10%). Un valore in crescita durante la sessione indica che stai usando un linguaggio più ricco.',

      // ── Dashboard cards ──
      dashboard_gse: 'Il tuo punteggio GSE complessivo, calcolato sulle ultime 5 sessioni. Combina vocabolario (90%) e complessità delle frasi (10%). Monitoralo nel tempo per vedere i tuoi progressi linguistici.',
      dashboard_vocab_ring: 'Il livello del tuo vocabolario basato sulle sessioni recenti. Il numero grande è il punteggio GSE (10-90), l\'etichetta mostra la banda CEFR corrispondente (A1-C2).'
    },

    en: {
      // ── GSE Score ──
      gse_score: 'The GSE (Global Scale of English) score ranges from 10 to 90 and measures the overall difficulty of your spoken vocabulary. It combines lexical richness (90%) with sentence complexity (10%). Higher = more advanced vocabulary. Tracking it over time shows your real progress.',
      gse_reading: 'The readability component measures how long and complex your sentences are. It only counts for 10% of the total score — vocabulary matters much more.',
      gse_vocab: 'The vocabulary component analyzes the CEFR level (A1-C2) of every word you use. It counts for 90% of the score. Based on a database of 100,000+ English words with verified levels.',

      // ── CEFR Explorer ──
      cefr_topics: 'The 39 CEFR thematic categories (food, travel, work, health…). Every word in the database is tagged with one or more topics. Use this explorer to discover which vocabulary domains you know best and which you could expand.',
      cefr_family: 'A word\'s lexical family includes all its derived forms (e.g. happy → happiness, unhappy, happily). Knowing more forms of the same root is a sign of advanced mastery.',
      cefr_frequency: 'Real-world usage frequency (Google Ngrams data). Rare words (low frequency) tend to be more specialized or advanced. Common words are the foundation of everyday communication.',

      // ── Topic Explorer (caption slide) ──
      topic_donut: 'The donut chart shows the topic distribution of words you used during the session. It helps you understand which contexts you communicate in most often and which areas you might want to expand.',
      topic_words: 'A list of words grouped by topic. Each word shows its CEFR level (A1-C2) and usage frequency. Higher-level words are more difficult — aiming to use more of them is a great goal.',

      // ── Rarity ──
      rare_word: 'This word rarely appears in everyday English (frequency < 1,000 in the database). Using rare words is a sign of advanced vocabulary!',

      // ── Caption GSE badge ──
      caption_gse: 'Real-time GSE score for your session. Updates on every completed sentence. Combines vocabulary difficulty (90%) with sentence complexity (10%). A rising score during your session means you\'re using richer language.',

      // ── Dashboard cards ──
      dashboard_gse: 'Your overall GSE score, calculated from your last 5 sessions. Combines vocabulary (90%) and sentence complexity (10%). Track it over time to see your language progress.',
      dashboard_vocab_ring: 'Your vocabulary level based on recent sessions. The large number is the GSE score (10-90), the label shows the corresponding CEFR band (A1-C2).'
    }
  };

  /**
   * Get the current UI language.
   * Returns 'it' or 'en'. Falls back to 'it'.
   */
  function getLang() {
    try {
      var stored = localStorage.getItem('sottotitoli-lang');
      if (stored === 'en' || stored === 'it') return stored;
    } catch(_) {}
    return 'it';
  }

  /**
   * Get a localized tooltip string.
   * @param {string} key
   * @returns {string}
   */
  function t(key) {
    var lang = getLang();
    var dict = TOOLTIPS[lang] || TOOLTIPS.it;
    return dict[key] || key;
  }

  /**
   * Initialize all .cefr-info-icon elements.
   * Call once after DOM is ready.
   */
  function init() {
    var styleId = 'cefr-info-style';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = [
        '.cefr-info-icon { display:inline-block; width:16px; height:16px; line-height:16px; text-align:center;',
        '  font-size:11px; font-weight:700; color:var(--text-muted,#9ca3af); cursor:help;',
        '  border:1.5px solid var(--text-muted,#9ca3af); border-radius:50%; margin-left:6px;',
        '  vertical-align:middle; position:relative; transition: color 0.15s, border-color 0.15s; }',
        '.cefr-info-icon:hover, .cefr-info-icon:focus { color:var(--accent-purple,#7c3aed); border-color:var(--accent-purple,#7c3aed); }',
        '.cefr-tooltip { position:fixed; z-index:99999; max-width:340px; padding:12px 16px;',
        '  background:var(--card,#1a1d26); color:var(--text,#e5e7eb); border:1px solid var(--line,#374151);',
        '  border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.4); font-size:12px; line-height:1.55;',
        '  pointer-events:none; opacity:0; transform:translateY(4px); transition:opacity .18s,transform .18s; }',
        '.cefr-tooltip.visible { opacity:1; transform:translateY(0); }',
        '.cefr-tooltip strong { color:var(--accent-purple,#a78bfa); }'
      ].join('\n');
      document.head.appendChild(style);
    }

    // Attach hover handlers
    document.addEventListener('mouseover', function(e){
      var icon = e.target.closest('.cefr-info-icon');
      if (!icon) return;
      var key = icon.getAttribute('data-cefr-info');
      if (!key) return;
      showTooltip(icon, t(key));
    });
    document.addEventListener('mouseout', function(e){
      var icon = e.target.closest('.cefr-info-icon');
      if (icon) hideTooltip();
    });
    // Also support click for touch devices
    document.addEventListener('click', function(e){
      var icon = e.target.closest('.cefr-info-icon');
      if (!icon) { hideTooltip(); return; }
      var key = icon.getAttribute('data-cefr-info');
      if (!key) return;
      var tooltip = getTooltipEl();
      if (tooltip.classList.contains('visible')) { hideTooltip(); return; }
      showTooltip(icon, t(key));
      e.stopPropagation();
    });
  }

  var _tooltipEl = null;
  function getTooltipEl() {
    if (!_tooltipEl) {
      _tooltipEl = document.createElement('div');
      _tooltipEl.className = 'cefr-tooltip';
      document.body.appendChild(_tooltipEl);
    }
    return _tooltipEl;
  }

  function showTooltip(icon, text) {
    var tip = getTooltipEl();
    tip.textContent = text;
    var rect = icon.getBoundingClientRect();
    var top = rect.bottom + 8;
    var left = rect.left + rect.width / 2;
    // Keep on screen
    if (left + 170 > window.innerWidth) left = window.innerWidth - 180;
    if (left < 10) left = 10;
    if (top + 100 > window.innerHeight) top = rect.top - 100;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.classList.add('visible');
  }

  function hideTooltip() {
    var tip = getTooltipEl();
    tip.classList.remove('visible');
  }

  // ── Export ──
  w.CefrInfo = { init: init, t: t, getLang: getLang };
})(window);
