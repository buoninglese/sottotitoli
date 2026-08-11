// js/panoramica/shared/state.js — Shared reactive store
// Replaces the pattern of scattered window.__someGlobal assignments.
// Panels import the store, read from it, and updateStore() notifies subscribers.

import { emit } from './events.js';

/**
 * @type {{
 *   user: Object|null,
 *   profile: Object|null,
 *   tokens: number,
 *   preferences: Object|null,
 *   sessions: Array,
 *   wordbanks: Array,
 *   reports: Array,
 *   cefrBreakdown: Object|null,
 *   statsEN: Object|null,
 *   statsIT: Object|null
 * }}
 */
export var store = {
  user: null,
  profile: null,
  tokens: 0,
  preferences: null,
  sessions: [],
  wordbanks: [],
  reports: [],
  cefrBreakdown: null,
  statsEN: null,
  statsIT: null,
  credits: null,
  refs: null
};

/**
 * Update one or more store keys and emit change events.
 * @param {string|Object} key — key name, or object of key/value pairs
 * @param {*} [value]
 */
export function updateStore(key, value) {
  var changes = {};
  if (typeof key === 'object') {
    changes = key;
  } else {
    changes[key] = value;
  }
  Object.keys(changes).forEach(function (k) {
    store[k] = changes[k];
  });
  emit('store:changed', changes);
}

/**
 * Get a store value.
 * @param {string} key
 * @returns {*}
 */
export function getStore(key) {
  return store[key];
}

// ── Backward compatibility: mirror to window globals ──
// External scripts (auth.js, data-service.js, etc.) still write to window globals.
// We sync them into the store periodically.
export function syncWindowGlobals() {
  if (window._sottotitoliProfile !== undefined) updateStore('profile', window._sottotitoliProfile);
  if (window.profile !== undefined) updateStore('profile', window.profile);
  if (window.tokens !== undefined) updateStore('tokens', window.tokens);
  if (window.credits !== undefined) updateStore('credits', window.credits);
  if (window._sottotitoliPrefs !== undefined) updateStore('preferences', window._sottotitoliPrefs);
  if (window.cefrBreakdown !== undefined) updateStore('cefrBreakdown', window.cefrBreakdown);
  if (window.statsEN !== undefined) updateStore('statsEN', window.statsEN);
  if (window.statsIT !== undefined) updateStore('statsIT', window.statsIT);
  if (window.refs !== undefined) updateStore('refs', window.refs);
  if (window.reports !== undefined) updateStore('reports', window.reports);
}
