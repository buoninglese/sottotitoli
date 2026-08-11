// js/panoramica/shared/formatters.js — Date/number/badge formatters (deduplicated)
// These functions existed 2-3× in the original monolith. Now defined ONCE.

/**
 * Format an ISO date string for display.
 * @param {string} iso — ISO 8601 date string
 * @param {Object} [opts]
 * @param {boolean} [opts.short] — omit year if current year
 * @param {boolean} [opts.withTime] — include time
 * @returns {string}
 */
export function formatDate(iso, opts) {
  if (!iso) return '\u2014';
  opts = opts || {};
  var lang = (window.I18n && window.I18n.getLang && window.I18n.getLang() === 'en') ? 'en-US' : 'it-IT';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var dateOpts = { day: 'numeric', month: 'long', year: 'numeric' };
    if (opts.withTime) {
      dateOpts.hour = '2-digit';
      dateOpts.minute = '2-digit';
    }
    if (opts.short && d.getFullYear() === new Date().getFullYear()) {
      delete dateOpts.year;
    }
    return d.toLocaleDateString(lang, dateOpts);
  } catch (e) {
    return iso;
  }
}

/**
 * Format duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string} e.g. "1h 23m" or "45s"
 */
export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '\u2014';
  seconds = Math.round(seconds);
  if (seconds < 60) return seconds + 's';
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  if (m < 60) return m + 'm' + (s ? ' ' + s + 's' : '');
  var h = Math.floor(m / 60);
  m = m % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

/**
 * Format a number with locale-aware separators.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('it-IT');
}

/**
 * Generate a status badge HTML string.
 * @param {string} status — 'completed', 'processing', 'pending', 'failed'
 * @returns {string} HTML
 */
export function statusBadge(status) {
  var map = {
    completed: { label: 'Completed', bg: 'rgba(16,185,129,.1)', color: '#10B981' },
    processing: { label: 'Processing', bg: 'rgba(245,158,11,.1)', color: '#F59E0B', pulse: true },
    pending: { label: 'Pending', bg: 'rgba(107,114,128,.1)', color: 'var(--text-soft)' },
    failed: { label: 'Failed', bg: 'rgba(225,29,72,.1)', color: '#E11D48' }
  };
  var s = map[status] || map.pending;
  var dot = s.pulse ? '<span style="display:inline-block;width:6px;height:6px;background:' + s.color + ';border-radius:50%;margin-right:6px;animation:pulse 2s infinite"></span>' : '';
  return '<span style="display:inline-flex;align-items:center;padding:4px 12px;background:' + s.bg + ';color:' + s.color + ';font-size:11px;font-weight:700;border-radius:99px;text-transform:uppercase;font-family:\'Manrope\',sans-serif">' + dot + s.label + '</span>';
}

/**
 * Generate a CEFR level badge HTML string.
 * @param {string} level — e.g. 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
 * @returns {string} HTML
 */
export function cefrBadge(level) {
  if (!level) return '';
  var colors = { A1: '#6B7280', A2: '#3B82F6', B1: '#10B981', B2: '#F59E0B', C1: '#EF4444', C2: '#8B5CF6' };
  var c = colors[level] || '#6B7280';
  return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border:1.5px solid ' + c + ';color:' + c + ';font-size:10px;font-weight:800;border-radius:4px;font-family:\'JetBrains Mono\',monospace">' + level + '</span>';
}

/**
 * Generate a part-of-speech badge HTML string.
 * @param {string} pos — e.g. 'noun', 'verb', 'adjective', 'adverb'
 * @returns {string} HTML
 */
export function posBadge(pos) {
  if (!pos) return '';
  var map = {
    noun: { label: 'noun', bg: 'rgba(59,130,246,.1)', color: '#3B82F6' },
    verb: { label: 'verb', bg: 'rgba(16,185,129,.1)', color: '#10B981' },
    adjective: { label: 'adj', bg: 'rgba(245,158,11,.1)', color: '#F59E0B' },
    adverb: { label: 'adv', bg: 'rgba(139,92,246,.1)', color: '#8B5CF6' },
    preposition: { label: 'prep', bg: 'rgba(107,114,128,.1)', color: '#6B7280' },
    conjunction: { label: 'conj', bg: 'rgba(107,114,128,.1)', color: '#6B7280' },
    pronoun: { label: 'pron', bg: 'rgba(236,72,153,.1)', color: '#EC4899' }
  };
  var s = map[pos] || { label: pos, bg: 'rgba(107,114,128,.1)', color: '#6B7280' };
  return '<span style="display:inline-flex;align-items:center;padding:2px 8px;background:' + s.bg + ';color:' + s.color + ';font-size:10px;font-weight:700;border-radius:4px;text-transform:uppercase;font-family:\'JetBrains Mono\',monospace">' + s.label + '</span>';
}
