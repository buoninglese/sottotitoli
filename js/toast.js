/**
 * toast.js — Shared Apple-style pill toasts
 * Requires: css/toast.css
 *
 * API:
 *   window.showToast(msg, type, durationMs)
 *     type: 'info' | 'success' | 'warning' | 'error' | 'loading'
 *     (auto-detected from leading emoji if omitted:
 *      ✅/✔ success · ⚠️ warning · ❌/🚫 error · ⏳/🔄 loading)
 *   window.showToastMsg(msg)      — alias (kept for existing call sites)
 *   window.hideToast()            — hide immediately
 *
 * Uses a single singleton pill so consecutive toasts replace each
 * other instead of stacking. A 'loading' toast shows the iOS spinner
 * and stays until replaced (e.g. by a 'success' toast).
 */
(function () {
  'use strict';

  var el = null;
  var timer = null;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  var CHECK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  var INFO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="7.25"></circle><line x1="9" y1="12.819" x2="9" y2="8.25"></line><path d="M9,6.75c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" stroke="none"></path></svg>';

  function spinnerHTML() {
    var blades = '';
    for (var i = 0; i < 12; i++) blades += '<div class="ispinner-blade"></div>';
    return '<span class="ispinner">' + blades + '</span>';
  }

  function detectType(msg) {
    var s = String(msg || '');
    if (/^(✅|✔|✓)/.test(s)) return 'success';
    if (/^(⚠️|⚠)/.test(s)) return 'warning';
    if (/^(❌|🚫|⛔)/.test(s)) return 'error';
    return 'info';
  }

  // The pill already shows the state (check chip / color / info icon), so
  // drop the leading emoji from the message to avoid a duplicate icon.
  function stripIndicator(msg, type) {
    var s = String(msg || '').replace(/^\s+/, '');
    if (type === 'success') return s.replace(/^(✅|✔|✓)\s*/, '');
    if (type === 'warning') return s.replace(/^(⚠️|⚠)\s*/, '');
    if (type === 'error')   return s.replace(/^(❌|🚫|⛔)\s*/, '');
    if (type === 'info')    return s.replace(/^(🔖|💾|⚡|📥|🗑️|🔁|🔄|⏳|📌|✏️|📝|✨|🔔|🚀|👋|📊|💡|🧠|🎯|📚|🏆|🎉)\s*/, '');
    return s;
  }

  function getEl() {
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'sd-toast sd-toast--bottom';
      document.body.appendChild(el);
    }
    return el;
  }

  function hide() {
    if (!el) return;
    el.classList.remove('show');
  }

  function show(msg, type, duration) {
    type = type || detectType(msg);
    var node = getEl();

    // Stop any pending auto-hide for the previous toast
    if (timer) { clearTimeout(timer); timer = null; }

    // Rebuild content
    node.className = 'sd-toast sd-toast--bottom sd-toast--' + type;
    var text = esc(stripIndicator(msg, type));
    var inner = '';

    if (type === 'loading') {
      inner = spinnerHTML() + '<span>' + text + '</span>';
    } else if (type === 'info') {
      inner = '<span class="sd-toast__info">' + INFO_SVG + '</span><span>' + text + '</span>';
    } else {
      var check = (type === 'success') ? '<span class="sd-toast__check">' + CHECK_SVG + '</span>' : '';
      inner = check + '<span>' + text + '</span>';
    }
    node.innerHTML = inner;

    // Force reflow so the transition plays on repeated toasts
    void node.offsetWidth;
    node.classList.add('show');

    // Loading toasts persist until replaced; others auto-hide
    if (type !== 'loading') {
      var dur = typeof duration === 'number' ? duration : 2600;
      timer = setTimeout(hide, dur);
    }
  }

  window.showToast = show;
  window.showToastMsg = show;   // alias for existing call sites
  window.hideToast = hide;
})();
