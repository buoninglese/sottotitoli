/**
 * app-state.js — Central state container for caption-s8t.html
 * 
 * Single source of truth for all application state.
 * Replaces the MutationObserver-based data flow:
 *   OLD: Speech API → DOM insert → MutationObserver → render/analytics/CEFR/wordbank
 *   NEW: Speech API → AppState.addLine() → subscribers (render, analytics, CEFR, wordbank)
 * 
 * Pattern: IIFE global namespace (same convention as real-mic.js, grammar-viz.js)
 * Loaded before all modules that consume or mutate state.
 */

var AppState = (function() {
  'use strict';

  // ── Monotonic ID counter (never array length — survives deletions) ──
  var _lastId = 0;

  // ── Event listeners ──
  var _listeners = {};

  // ── THE STATE ──
  var _state = {
    // Transcript
    lines: [],            // { id, text, timestamp, speaker, isFinal }
    interimText: '',
    totalWords: 0,

    // Session
    sessionId: null,
    sessionActive: false,
    sessionStartTime: null,
    sessionEndTime: null,

    // Mic
    micState: 'idle',     // 'idle' | 'requesting' | 'live' | 'paused' | 'blocked' | 'error'

    // Mode
    mode: 'caption',      // 'caption' | 'translate'
    captionLang: 'en-US',
    translateTarget: null,

    // DUO (multi-speaker)
    duoMode: false,
    duoIsHost: false,
    duoActiveSpeaker: 'A',
    duoRoomId: null,
    duoSpeakerName: 'Host',

    // UI
    activeSlide: 'transcript',
    theme: 'light',

    // Credits
    voiceCredits: 0,
  };

  // ── Public API ──

  /**
   * Get state value by dot-path, or entire state if no path.
   *   AppState.get('duo.activeSpeaker') → 'A'
   *   AppState.get() → { lines: [...], mode: 'caption', ... }
   */
  function get(path) {
    if (!path) return _state;
    var keys = path.split('.');
    var obj = _state;
    for (var i = 0; i < keys.length; i++) {
      if (obj == null) return undefined;
      obj = obj[keys[i]];
    }
    return obj;
  }

  /**
   * Set state value by dot-path. Fires listeners.
   *   AppState.set('mode', 'translate')
   *   AppState.set('duo.activeSpeaker', 'B')
   */
  function set(path, value) {
    var keys = path.split('.');
    var obj = _state;
    for (var i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    var oldValue = obj[keys[keys.length - 1]];
    obj[keys[keys.length - 1]] = value;
    _notify(path, value, oldValue);
    _notify('*', { path: path, value: value, oldValue: oldValue });
    return value;
  }

  /**
   * Subscribe to state changes on a path. Returns unsubscribe function.
   *   var unsub = AppState.on('line:added', function(line) { ... });
   *   AppState.on('mode', function(newMode) { ... });
   *   AppState.on('*', function(change) { ... });  // all changes
   */
  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
    return function unsubscribe() {
      var idx = _listeners[event].indexOf(fn);
      if (idx !== -1) _listeners[event].splice(idx, 1);
    };
  }

  /**
   * Remove all listeners for an event (or all events if no argument).
   */
  function off(event) {
    if (event) {
      delete _listeners[event];
    } else {
      _listeners = {};
    }
  }

  // ── Transcript API ──

  /**
   * Add a finalized transcript line. Fires 'line:added' + 'lines:changed'.
   */
  function addLine(text, speaker) {
    if (!text || !text.trim()) return null;
    var line = {
      id: ++_lastId,
      text: text.trim(),
      speaker: speaker || _state.duoActiveSpeaker || 'A',
      timestamp: Date.now(),
      isFinal: true
    };
    _state.lines.push(line);
    _state.totalWords += line.text.split(/\s+/).filter(Boolean).length;
    _notify('line:added', line);
    _notify('lines:changed', _state.lines);
    return line;
  }

  /**
   * Update interim (non-final) transcript text. Fires 'interim:changed'.
   */
  function setInterim(text) {
    _state.interimText = text || '';
    _notify('interim:changed', _state.interimText);
  }

  /**
   * Commit interim text as a finalized line. Fires 'line:added' + 'interim:changed'.
   */
  function commitInterim(speaker) {
    if (_state.interimText && _state.interimText.trim()) {
      addLine(_state.interimText, speaker);
    }
    _state.interimText = '';
    _notify('interim:changed', '');
  }

  /**
   * Get all lines. Returns a copy to prevent accidental mutation.
   */
  function getLines() {
    return _state.lines.slice();
  }

  /**
   * Get the last N lines.
   */
  function getLastLines(n) {
    return _state.lines.slice(-n);
  }

  /**
   * Clear all transcript state. Fires 'lines:reset'.
   */
  function resetLines() {
    _state.lines = [];
    _state.interimText = '';
    _state.totalWords = 0;
    _lastId = 0;
    _notify('lines:reset', null);
    _notify('lines:changed', []);
    _notify('interim:changed', '');
  }

  // ── Session API ──

  function startSession(sessionId) {
    _state.sessionId = sessionId;
    _state.sessionActive = true;
    _state.sessionStartTime = Date.now();
    _notify('session:started', { sessionId: sessionId });
  }

  function endSession() {
    _state.sessionActive = false;
    _state.sessionEndTime = Date.now();
    _notify('session:ended', {
      sessionId: _state.sessionId,
      duration: _state.sessionEndTime - (_state.sessionStartTime || _state.sessionEndTime),
      lines: _state.lines.length,
      words: _state.totalWords
    });
  }

  /**
   * Dump full state to console (debug helper). Call from browser: AppState.debug()
   */
  function debug() {
    console.group('AppState');
    console.log('lines:', _state.lines.length, 'items,', _state.totalWords, 'words');
    console.log('session:', _state.sessionActive ? 'active' : 'inactive', _state.sessionId);
    console.log('mic:', _state.micState);
    console.log('mode:', _state.mode, '| lang:', _state.captionLang);
    console.log('duo:', _state.duoMode ? 'ON (' + _state.duoActiveSpeaker + ')' : 'OFF');
    console.log('listeners:', Object.keys(_listeners).length, 'events registered');
    console.log('Full state →', _state);
    console.groupEnd();
  }

  // ── Internal ──

  function _notify(event, value, oldValue) {
    var fns = _listeners[event];
    if (fns) {
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](value, oldValue); } catch(e) {
          console.error('AppState listener error [' + event + ']:', e);
        }
      }
    }
  }

  // ── Initialize from localStorage ──
  (function _init() {
    try {
      var saved = localStorage.getItem('sottotitoli-caption-lang');
      if (saved) _state.captionLang = saved;
    } catch(e) {}
    try {
      var t = localStorage.getItem('sottotitoli-theme');
      if (t && t !== 'auto') _state.theme = t;
    } catch(e) {}
  })();

  // ── Exports ──
  return {
    get: get,
    set: set,
    on: on,
    off: off,
    addLine: addLine,
    setInterim: setInterim,
    commitInterim: commitInterim,
    getLines: getLines,
    getLastLines: getLastLines,
    resetLines: resetLines,
    startSession: startSession,
    endSession: endSession,
    debug: debug
  };

})();
