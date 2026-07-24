/**
 * error-reporter.js — Ships client-side errors to Supabase for aggregate monitoring.
 * 
 * Hooks into S8T_Monitor's Toast.error/warn counters. Buffers locally, flushes
 * to Supabase client_errors table every 30s. Resilient to Supabase downtime.
 * 
 * Load after: app-state.js, toast.js, monitor.js, js/auth.js
 * 
 * Privacy: sends error metadata ONLY — no voice data, no transcript text, no PII.
 * Fields: error_type, message, page, user_agent, session_id, timestamp
 */

var ErrorReporter = (function() {
  'use strict';

  var _buffer = [];
  var _flushInterval = null;
  var _enabled = true;
  var MAX_BUFFER = 50;

  // ── Hook into Toast to capture error events ──
  var _origToastShow = null;
  function _hookToast() {
    if (typeof Toast === 'undefined') { setTimeout(_hookToast, 100); return; }
    _origToastShow = Toast.show;
    Toast.show = function(msg, duration, type) {
      if (type === 'error' || type === 'warn') {
        _capture(type, msg);
      }
      return _origToastShow(msg, duration, type);
    };
  }

  // ── Capture an error event ──
  function _capture(type, message) {
    if (!_enabled) return;

    var event = {
      error_type: type,        // 'error' | 'warn'
      message: (message || '').substring(0, 200),
      page: 'caption-s8t',
      user_agent: navigator.userAgent.substring(0, 200),
      url: window.location.href.substring(0, 300),
      session_id: _getSessionId(),
      timestamp: new Date().toISOString()
    };

    _buffer.push(event);
    if (_buffer.length > MAX_BUFFER) {
      _buffer.shift(); // drop oldest
    }
  }

  function _getSessionId() {
    try {
      return localStorage.getItem('sottotitoli-caption-session') ||
             localStorage.getItem('sottotitoli-active-session') || null;
    } catch(e) { return null; }
  }

  // ── Flush buffer to Supabase ──
  async function _flush() {
    if (_buffer.length === 0) return;

    var sb = window.sottotitoliSupabase;
    if (!sb) return; // not logged in or Supabase not loaded

    // Verify auth
    try {
      var resp = await sb.auth.getSession();
      if (!resp.data?.session) return; // not authenticated — don't send
    } catch(e) { return; }

    // Take a copy of the buffer
    var batch = _buffer.splice(0, _buffer.length);

    try {
      var result = await sb.from('client_errors').insert(batch);
      if (result.error) {
        // Put back on failure — will retry next flush
        _buffer = batch.concat(_buffer);
        console.warn('ErrorReporter: flush failed, will retry. ' + result.error.message);
      }
    } catch(e) {
      // Put back on failure
      _buffer = batch.concat(_buffer);
      console.warn('ErrorReporter: flush failed (network), will retry.');
    }
  }

  // ── Public API ──

  function start(intervalMs) {
    _hookToast();
    if (_flushInterval) return;
    _flushInterval = setInterval(_flush, intervalMs || 30000);
    // Also flush on page unload if possible
    window.addEventListener('beforeunload', function() {
      // Use sendBeacon for final flush if buffer has items
      if (_buffer.length > 0 && window.sottotitoliSupabase) {
        var sb = window.sottotitoliSupabase;
        var supabaseUrl = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
        var anonKey = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';
        var payload = JSON.stringify(_buffer);
        try {
          navigator.sendBeacon(
            supabaseUrl + '/rest/v1/client_errors',
            new Blob([payload], {type:'application/json'})
          );
        } catch(e) {}
      }
    });
    console.log('%c📡 ErrorReporter started%c — shipping errors to Supabase every ' +
      ((intervalMs || 30000) / 1000) + 's.',
      'color:#d97706;font-weight:600', 'color:#888');
  }

  function stop() {
    if (_flushInterval) { clearInterval(_flushInterval); _flushInterval = null; }
  }

  function flush() {
    return _flush();
  }

  // ── Auto-start after auth is ready ──
  setTimeout(function() {
    if (window.sottotitoliSupabase) {
      start(30000);
    } else {
      // Wait for auth to load
      var _check = setInterval(function() {
        if (window.sottotitoliSupabase) {
          clearInterval(_check);
          start(30000);
        }
      }, 500);
      // Stop waiting after 10s
      setTimeout(function() { clearInterval(_check); }, 10000);
    }
  }, 3000);

  return {
    start: start,
    stop: stop,
    flush: flush,
    get bufferSize() { return _buffer.length; }
  };

})();
