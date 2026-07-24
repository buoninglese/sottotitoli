/**
 * monitor.js — Lightweight runtime health monitor for caption-s8t.html
 * 
 * Tracks: pipeline integrity, error rate, session health.
 * Exposes: S8T_Monitor.report() for console diagnostics.
 * Load after app-state.js and toast.js.
 */

var S8T_Monitor = (function() {
  'use strict';

  var _errors = 0;         // Toast.error() calls this session
  var _warnings = 0;       // Toast.warn() calls this session
  var _mismatches = 0;     // AppState vs DOM reconciliation failures
  var _lastMismatch = null;
  var _startTime = Date.now();
  var _interval = null;

  // ── Hook into Toast to count errors ──
  var _origToastShow = null;
  function _hookToast() {
    if (typeof Toast === 'undefined') { setTimeout(_hookToast, 100); return; }
    _origToastShow = Toast.show;
    Toast.show = function(msg, duration, type) {
      if (type === 'error') _errors++;
      else if (type === 'warn') _warnings++;
      return _origToastShow(msg, duration, type);
    };
  }
  _hookToast();

  // ── Periodic reconciliation check ──
  function _checkReconciliation() {
    if (typeof AppState === 'undefined') return;
    var lines = AppState.get('lines');
    if (!lines) return;
    var transcript = document.getElementById('captionTranscript');
    if (!transcript) return;
    var domLines = transcript.querySelectorAll('.line');
    if (lines.length !== domLines.length) {
      _mismatches++;
      _lastMismatch = {
        time: new Date().toISOString(),
        stateCount: lines.length,
        domCount: domLines.length
      };
      console.warn('%c[S8T_Monitor] PIPELINE DIVERGENCE #' + _mismatches +
        '%c state=' + lines.length + ' dom=' + domLines.length,
        'color:#dc2626;font-weight:700', 'color:#888');
    }
  }

  // ── Health report ──
  function report() {
    var uptime = Math.round((Date.now() - _startTime) / 1000);
    var lines = (typeof AppState !== 'undefined') ? AppState.get('lines') : null;
    console.group('%c🩺 S8T Monitor %c' + uptime + 's uptime',
      'font-weight:bold;color:#06b6d4', 'color:#888');
    console.log('Errors:', _errors, '| Warnings:', _warnings);
    console.log('Pipeline mismatches:', _mismatches,
      _mismatches === 0 ? '✅' : '❌ last: ' + JSON.stringify(_lastMismatch));
    console.log('Transcript lines (state):', lines ? lines.length : 'N/A');
    console.log('Mic state:', (typeof AppState !== 'undefined') ? AppState.get('micState') : 'N/A');
    console.log('Mode:', (typeof AppState !== 'undefined') ? AppState.get('mode') : 'N/A');
    console.log('DUO:', (typeof AppState !== 'undefined' && AppState.get('duoMode')) ? 'active' : 'inactive');
    console.groupEnd();
    return {
      uptime: uptime,
      errors: _errors,
      warnings: _warnings,
      mismatches: _mismatches,
      healthy: _mismatches === 0,
      lines: lines ? lines.length : 0
    };
  }

  // ── Start periodic check ──
  function start(intervalMs) {
    if (_interval) return;
    _interval = setInterval(_checkReconciliation, intervalMs || 30000);
    console.log('%c🩺 S8T_Monitor started%c — checking pipeline every ' +
      ((intervalMs || 30000) / 1000) + 's. Type S8T_Monitor.report() for diagnostics.',
      'color:#06b6d4;font-weight:600', 'color:#888');
  }

  function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
  }

  // ── Auto-start on load ──
  setTimeout(function() { start(30000); }, 2000);

  // ═══ BroadcastChannel — live telemetry for monitor.html dashboard ═══
  var _channel = null;
  try {
    _channel = new BroadcastChannel('s8t-monitor');
  } catch(e) { /* BroadcastChannel not supported (rare) */ }

  function _broadcast() {
    if (!_channel) return;
    var data = snapshot();
    try { _channel.postMessage(data); } catch(e) {}
  }

  // Send a snapshot every 5 seconds
  setInterval(_broadcast, 5000);
  // Also send immediately on load
  setTimeout(_broadcast, 1000);

  /**
   * Full health snapshot — used by both report() and broadcast.
   */
  function snapshot() {
    var uptime = Math.round((Date.now() - _startTime) / 1000);
    var lines = (typeof AppState !== 'undefined') ? AppState.get('lines') : null;
    var stateLines = lines ? lines.length : 0;
    var transcript = document.getElementById('captionTranscript');
    var domLines = transcript ? transcript.querySelectorAll('.line').length : 0;

    return {
      uptime: uptime,
      errors: _errors,
      warnings: _warnings,
      mismatches: _mismatches,
      healthy: _mismatches === 0 && stateLines === domLines,
      lastMismatch: _lastMismatch,
      // AppState
      stateLines: stateLines,
      domLines: domLines,
      totalWords: (typeof AppState !== 'undefined') ? AppState.get('totalWords') : 0,
      micState: (typeof AppState !== 'undefined') ? AppState.get('micState') : 'N/A',
      mode: (typeof AppState !== 'undefined') ? AppState.get('mode') : 'N/A',
      captionLang: (typeof AppState !== 'undefined') ? AppState.get('captionLang') : 'N/A',
      duoMode: (typeof AppState !== 'undefined') ? AppState.get('duoMode') : false,
      duoActiveSpeaker: (typeof AppState !== 'undefined') ? AppState.get('duoActiveSpeaker') : 'N/A',
      sessionId: (typeof AppState !== 'undefined') ? AppState.get('sessionId') : null,
      sessionActive: (typeof AppState !== 'undefined') ? AppState.get('sessionActive') : false,
      // Environment
      userAgent: navigator.userAgent.substring(0, 80),
      timestamp: Date.now(),
      page: 'caption-s8t'
    };
  }

  // Override report() to use snapshot()
  var _prevReport = report;
  report = function() {
    var data = snapshot();
    console.group('%c🩺 S8T Monitor %c' + data.uptime + 's uptime',
      'font-weight:bold;color:#06b6d4', 'color:#888');
    console.log('Pipeline:', data.healthy ? '✅ HEALTHY' : '❌ DIVERGED',
      '| state=' + data.stateLines, 'dom=' + data.domLines, 'mismatches=' + data.mismatches);
    console.log('Errors:', data.errors, '| Warnings:', data.warnings);
    console.log('Mic:', data.micState, '| Mode:', data.mode, '| Lang:', data.captionLang);
    console.log('DUO:', data.duoMode ? 'active (' + data.duoActiveSpeaker + ')' : 'inactive');
    console.log('Words:', data.totalWords, '| Session:', data.sessionActive ? 'live' : 'idle');
    console.groupEnd();
    return data;
  };

  return {
    report: report,
    snapshot: snapshot,
    start: start,
    stop: stop,
    get errors() { return _errors; },
    get warnings() { return _warnings; },
    get mismatches() { return _mismatches; },
    get healthy() { return _mismatches === 0; }
  };

})();
