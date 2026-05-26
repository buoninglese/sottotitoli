/**
 * Logger — simple logging abstraction.
 * Replace scattered console.log calls with this module.
 * In development, logs everything. In production, suppresses debug logs.
 * Usage:
 *   Logger.debug('WebSocket connected', room);
 *   Logger.error('Failed to save session', err);
 */

(function (w) {
  'use strict';

  const isDev = w.location && (
    w.location.hostname === 'localhost' ||
    w.location.hostname === '127.0.0.1' ||
    w.SOTTOTITOLI_CONFIG?.devMode === true
  );

  w.SottotitoliLogger = {
    debug: function (...args) {
      if (isDev) console.log('[Sottotitoli]', ...args);
    },
    info: function (...args) {
      console.info('[Sottotitoli]', ...args);
    },
    warn: function (...args) {
      console.warn('[Sottotitoli]', ...args);
    },
    error: function (...args) {
      console.error('[Sottotitoli]', ...args);
    }
  };
})(window);
