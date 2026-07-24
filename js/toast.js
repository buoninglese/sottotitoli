/**
 * toast.js — Lightweight toast notification utility.
 * 
 * Uses the existing #toast element in caption-s8t.html.
 * Provides: showToast(msg, duration, type)
 *   showToast('Saved', 3000)
 *   showToast('Connection lost', 5000, 'error')
 *   showToast('Mic live', 2000, 'success')
 * 
 * Types: '' (default, uses --accent), 'error' (--danger), 'success' (--good), 'warn' (--warn)
 */

var Toast = (function() {
  'use strict';

  var _timer = null;
  var _el = null;

  function _getEl() {
    if (!_el) _el = document.getElementById('toast');
    return _el;
  }

  /**
   * Show a toast message.
   * @param {string} msg - The message text
   * @param {number} duration - Milliseconds to show (default 3000)
   * @param {string} type - 'error' | 'success' | 'warn' | '' (default)
   */
  function show(msg, duration, type) {
    var el = _getEl();
    if (!el) {
      // Fallback: create temporary toast (backward compat with showToastMsg pattern)
      el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--line);border-radius:100px;padding:10px 24px;font-size:13px;font-weight:600;color:var(--text);z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap;pointer-events:none;font-family:var(--font-body,Inter,sans-serif)';
      document.body.appendChild(el);
      el.textContent = msg;
      setTimeout(function() { if (el && el.parentNode) el.remove(); }, duration || 3000);
      return;
    }

    // Use existing #toast element
    if (_timer) clearTimeout(_timer);

    // Reset classes
    el.className = '';
    if (type) el.classList.add('toast-' + type);

    // Set background based on type
    var bg = 'var(--accent)';
    if (type === 'error') bg = 'var(--danger)';
    else if (type === 'success') bg = 'var(--good)';
    else if (type === 'warn') bg = 'var(--warn)';

    el.textContent = msg;
    el.style.background = bg;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';

    _timer = setTimeout(function() {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      _timer = null;
    }, duration || 3000);
  }

  /**
   * Shorthand: error toast
   */
  function error(msg, duration) {
    show(msg, duration || 5000, 'error');
  }

  /**
   * Shorthand: success toast
   */
  function success(msg, duration) {
    show(msg, duration || 3000, 'success');
  }

  /**
   * Shorthand: warning toast
   */
  function warn(msg, duration) {
    show(msg, duration || 4000, 'warn');
  }

  return {
    show: show,
    error: error,
    success: success,
    warn: warn
  };

})();
