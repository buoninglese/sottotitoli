// js/panoramica/shared/dom.js — DOM utilities (deduplicated from panoramica.html)
// These functions existed 2-5× in the original monolith. Now defined ONCE.

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Show a toast notification. Unified from 4 different implementations.
 * @param {string} msg
 * @param {'success'|'error'|'info'|'warning'} [type='success']
 * @param {number} [duration=2500]
 */
export function showToast(msg, type, duration) {
  type = type || 'success';
  duration = duration || 2500;
  var colors = {
    success: { bg: '#059669', color: '#fff' },
    error: { bg: '#DC2626', color: '#fff' },
    info: { bg: '#2563EB', color: '#fff' },
    warning: { bg: '#F59E0B', color: '#111' }
  };
  var c = colors[type] || colors.success;
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + c.bg + ';color:' + c.color + ';font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body,Inter,sans-serif);box-shadow:0 4px 16px rgba(0,0,0,.15)';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function () { t.style.opacity = '1'; });
  setTimeout(function () {
    t.style.opacity = '0';
    setTimeout(function () { t.remove(); }, 300);
  }, duration);
}

/**
 * Shorthand for document.querySelector.
 * @param {string} sel
 * @param {Element} [ctx]
 * @returns {Element|null}
 */
export function $(sel, ctx) {
  return (ctx || document).querySelector(sel);
}

/**
 * Shorthand for document.querySelectorAll (returns array).
 * @param {string} sel
 * @param {Element} [ctx]
 * @returns {Element[]}
 */
export function $$(sel, ctx) {
  return Array.from((ctx || document).querySelectorAll(sel));
}

/**
 * Lightweight DOM element factory.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs, ...children) {
  var el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (key) {
      if (key === 'className') { el.className = attrs[key]; }
      else if (key === 'innerHTML') { el.innerHTML = attrs[key]; }
      else if (key === 'textContent') { el.textContent = attrs[key]; }
      else if (key.startsWith('on')) { el.addEventListener(key.slice(2).toLowerCase(), attrs[key]); }
      else if (key === 'style' && typeof attrs[key] === 'object') { Object.assign(el.style, attrs[key]); }
      else { el.setAttribute(key, attrs[key]); }
    });
  }
  children.forEach(function (child) {
    if (typeof child === 'string') { el.appendChild(document.createTextNode(child)); }
    else if (child instanceof Node) { el.appendChild(child); }
    else if (child) { el.appendChild(document.createTextNode(String(child))); }
  });
  return el;
}

/**
 * Show a modal dialog.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.body — HTML string
 * @param {string} [opts.footer] — HTML string for footer buttons
 * @param {Function} [opts.onClose]
 * @returns {{ show: Function, hide: Function, destroy: Function }}
 */
export function createModal(opts) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s';
  overlay.innerHTML = '<div class="modal-box" style="background:var(--card,#1a1a2e);border-radius:16px;padding:24px;max-width:600px;width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">' + opts.title + '</h3>' +
    '<button class="modal-close-btn" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim);padding:4px 8px;line-height:1">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' + opts.body + '</div>' +
    (opts.footer ? '<div class="modal-footer" style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">' + opts.footer + '</div>' : '') +
    '</div>';

  function show() { document.body.appendChild(overlay); requestAnimationFrame(function () { overlay.style.opacity = '1'; }); }
  function hide() { overlay.style.opacity = '0'; setTimeout(function () { overlay.remove(); }, 200); }
  function destroy() { overlay.remove(); }

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) hide();
    if (e.target.classList.contains('modal-close-btn')) hide();
  });

  return { show: show, hide: hide, destroy: destroy, overlay: overlay };
}
