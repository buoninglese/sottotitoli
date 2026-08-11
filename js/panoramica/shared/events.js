// js/panoramica/shared/events.js — Simple pub/sub for cross-panel communication
// Panels communicate without knowing about each other. Example:
//   emit('session:saved', { id: 'abc' })  →  dashboard panel refreshes chart
//   emit('wordbank:created', { name: 'New' })  →  vocab builder updates bank list

var listeners = {};

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {Function} callback
 */
export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

/**
 * Unsubscribe from an event.
 * @param {string} event
 * @param {Function} callback
 */
export function off(event, callback) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
}

/**
 * Emit an event to all subscribers.
 * @param {string} event
 * @param {*} data
 */
export function emit(event, data) {
  if (!listeners[event]) return;
  listeners[event].forEach(function (cb) {
    try { cb(data); } catch (e) { console.error('Event handler error [' + event + ']:', e); }
  });
}

/**
 * Remove all listeners for an event (or all events if no event specified).
 * @param {string} [event]
 */
export function clear(event) {
  if (event) { delete listeners[event]; }
  else { listeners = {}; }
}

// ── Standard events used across panels ──
// 'panel:switch'     — { from, to }          — emitted when user switches panels
// 'user:updated'     — { profile }           — profile changed (name, avatar, etc.)
// 'tokens:changed'   — { balance }           — credit balance updated
// 'session:saved'    — { id, name }          — new session saved (for chart refresh)
// 'session:deleted'  — { id }                — session deleted
// 'wordbank:created' — { id, name, lang }    — new word bank created
// 'wordbank:deleted' — { id }                — word bank deleted
// 'word:added'       — { word, bankId }      — word added to bank
// 'report:generated' — { id }                — AI report completed
// 'theme:changed'    — { theme }             — day/night/system toggled
// 'lang:changed'     — { lang }              — UI language switched
