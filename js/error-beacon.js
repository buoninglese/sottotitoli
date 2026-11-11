// js/error-beacon.js
//
// Why this exists
// ---------------
// This product has no error telemetry. Every silent failure in its history — the
// NOT NULL that failed every report request after the credit was charged, the
// query against a table that never existed, the Hugging Face 402s — was found by
// someone happening to look, not by the app telling anyone. With three users and
// no funnel, "it broke" and "nobody came" look identical from the database.
//
// What this is NOT
// ----------------
// Not analytics: no cookie, no third-party script, no page views, no session
// replay. It writes only *failures*, to `client_errors` — a table that already
// exists, already has RLS on, already allows anonymous INSERT, and already lets
// only the service role read it. Nothing new is exposed.
//
// Deliberate limits
// -----------------
// * The URL is stored as origin + pathname only. Supabase puts the auth token in
//   the URL *fragment* on redirect, and query strings carry ?bypass_auth and
//   friends — none of that may ever be persisted.
// * Max 5 reports per page load, deduped by fingerprint for 24h in localStorage,
//   so a page that breaks on every load cannot flood the table.
// * Resource errors are reported only for same-origin files. A CDN hiccup is not
//   our bug and would drown the signal.
// * Every path is wrapped: a beacon that throws is worse than no beacon.
(function () {
  'use strict';

  if (window.__s8tBeaconLoaded) return;
  window.__s8tBeaconLoaded = true;

  var MAX_PER_LOAD = 5;
  var DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
  var STORE_KEY = 'sottotitoli-error-beacon';
  var sent = 0;
  // Two guards, and both are needed. localStorage carries dedupe across page loads,
  // but it is only written after the insert resolves — so two identical errors in
  // the same tick would both get through. This object is the synchronous guard.
  var seenThisLoad = Object.create(null);

  function config() {
    return window.SOTTOTITOLI_CONFIG || {};
  }

  // A DEDICATED client, anonymous, with no session.
  //
  // The obvious implementation — reuse window.sottotitoliSupabase — was wrong and
  // was caught in testing: with a corrupt or expired session the shared client
  // sends that token, PostgREST answers 401, and the beacon goes silent. That is
  // precisely the situation it exists for (a broken login is a bug worth seeing).
  // Sending only the anon key is allowed by the table's INSERT policy and cannot
  // be poisoned by whatever state the user's auth happens to be in.
  var _client = null;

  function sb() {
    if (_client) return _client;
    try {
      // These are declared in js/auth.js, which loads before this file.
      var url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : null;
      var key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : null;
      if (window.supabase && url && key) {
        _client = window.supabase.createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        return _client;
      }
    } catch (e) {}
    // Last resort: the app's client (still correct when its session is healthy).
    return window.sottotitoliSupabase || null;
  }

  function cleanUrl(raw) {
    // Strip query AND fragment: credentials live in both.
    try {
      var a = document.createElement('a');
      a.href = raw || location.href;
      if (a.origin && a.origin !== location.origin) return null; // never store foreign URLs
      return a.origin + a.pathname;
    } catch (e) {
      return location.origin + location.pathname;
    }
  }

  function fingerprint(type, msg) {
    var s = type + '|' + msg + '|' + location.pathname;
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return 'fp_' + (h >>> 0).toString(36);
  }

  function alreadySeen(fp) {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var map = raw ? JSON.parse(raw) : {};
      var now = Date.now();
      var hit = map[fp];
      // Prune while we are here, so the map cannot grow forever.
      for (var k in map) {
        if (!map[k] || now - map[k] > DEDUPE_TTL_MS) delete map[k];
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(map));
      return !!(hit && now - hit < DEDUPE_TTL_MS);
    } catch (e) {
      return false; // private mode, quota, corrupt JSON — report anyway
    }
  }

  function remember(fp) {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var map = raw ? JSON.parse(raw) : {};
      map[fp] = Date.now();
      localStorage.setItem(STORE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function report(errorType, message, sourceUrl) {
    try {
      if (sent >= MAX_PER_LOAD) return;
      var client = sb();
      if (!client) return;

      var url = cleanUrl(sourceUrl);
      if (url === null) return; // foreign origin

      var msg = String(message == null ? 'unknown' : message).slice(0, 1000);
      var type = String(errorType || 'Error').slice(0, 60);
      var fp = fingerprint(type, msg);
      if (seenThisLoad[fp] || alreadySeen(fp)) return;
      seenThisLoad[fp] = 1;

      sent++;

      client
        .from('client_errors')
        .insert({
          error_type: type,
          message: msg,
          page: location.pathname,
          user_agent: String(navigator.userAgent || '').slice(0, 300),
          url: url,
          session_id: null,
          user_id: null
        })
        .then(function (r) {
          if (r && r.error) {
            // Not stored: do NOT remember it, so the next load may succeed.
            console.warn('[beacon] not stored:', r.error.message);
            return;
          }
          // Remember only what actually landed — otherwise a single failed send
          // suppresses the same error for 24h, which is how a beacon goes quiet.
          remember(fp);
        }, function () {});
    } catch (e) {}
  }

  window.addEventListener('error', function (e) {
    try {
      if (!e) return;

      // Resource errors: the event has a target element and no message.
      var el = e.target;
      if (el && el !== window && el.tagName) {
        var src = el.src || el.href || '';
        if (!src) return;
        var a = document.createElement('a');
        a.href = src;
        if (a.origin !== location.origin) return; // CDN noise is not our bug
        report('ResourceError', el.tagName.toLowerCase() + ' failed: ' + a.pathname, src);
        return;
      }

      var err = e.error;
      var type = (err && err.name) || 'Error';
      var msg = e.message || (err && err.message) || 'unknown error';
      report(type, msg, e.filename || location.href);
    } catch (x) {}
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    try {
      var reason = e && e.reason;
      var msg = (reason && (reason.message || reason.reason)) || String(reason || 'unhandled rejection');
      var type = (reason && reason.name) || 'UnhandledRejection';
      report(type, msg, location.href);
    } catch (x) {}
  });

  window.addEventListener('securitypolicyviolation', function (e) {
    try {
      if (!e) return;
      report('CSPViolation', (e.violatedDirective || 'csp') + ' blocked ' + (e.blockedURI || '?'), location.href);
    } catch (x) {}
  });

  // Test hook — tests/gate0.html drives this without provoking real breakage.
  window.SottotitoliErrorBeacon = {
    report: report,
    sentCount: function () { return sent; },
    reset: function () { sent = 0; seenThisLoad = Object.create(null); }
  };
})();
