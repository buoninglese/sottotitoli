// js/icon-a11y.js — the accessible-name layer for icon fonts.
//
// WHY THIS EXISTS
// Every Material Symbols icon is a span whose TEXT is the glyph lookup key:
//
//     <span class="material-symbols-outlined">psychology</span>
//
// The font renders that at 24×24 — the icons are fine — but the WORD stays in the
// accessibility tree. So a screen reader announced headings as:
//
//     "psychology Tono dell'IA"   "target Priorità di Correzione"
//     "language Lingua dei Report"   "fingerprint Identità"
//
// Measured before this file: 91 of 94 icon spans had no aria-hidden (O-30). The same
// missing layer is behind O-20, O-27, O-32, O-33 and O-39.
//
// THE RULE — and why it is deliberately one-sided
//   • A DECORATIVE icon (one sitting beside real text, or inside a control that already
//     has a name) gets aria-hidden="true".
//   • An icon that IS a control's only label is left ALONE. Hiding it would make the
//     control completely nameless, which is worse than a symbol name — assistive tech
//     would announce nothing at all. Those need a hand-written `aria-label`, and they
//     are fixed in the markup, one control at a time.
//
// So this layer can only IMPROVE the tree and can never empty a control's name. That
// asymmetry is the whole design: a blanket "hide every icon" pass would silently strip
// the name from every icon-only button in the app.
//
// Runs at load AND on mutation, because most icons here are injected by JS. A
// blanket one-shot pass at load would miss every dynamically rendered panel.

(function () {
  'use strict';

  var ICON_SELECTOR = '.material-symbols-outlined,.material-symbols-rounded';
  // [onclick] / [onkeydown] matter: this codebase uses <span onclick> and <div onclick> as
  // controls instead of <button>. Without them such an element is not recognised as a
  // control, so its icon looks "decorative" and would be hidden — quietly removing a
  // CLICKABLE thing from the accessibility tree. Treating them as controls keeps the icon
  // exposed, so the real problem (an unnamed control) stays visible instead of being masked.
  var CONTROL_SELECTOR = 'button,a,[role="button"],[role="link"],[onclick],[onkeydown]';

  function hasText(el) {
    return (el.textContent || '').replace(/\s+/g, '').length > 0;
  }

  // Walk up to the nearest interactive ancestor and ask: is this icon its only label?
  function isSoleLabel(span) {
    // The icon may BE the control: this codebase uses `<span onclick>...` as a button.
    // Checked on the span itself, because the walk below deliberately starts one level up.
    if (span.hasAttribute('onclick') || span.hasAttribute('onkeydown')) return true;
    var p = span.parentElement;
    while (p && p !== document.body && p.nodeType === 1) {
      if (p.matches && p.matches(CONTROL_SELECTOR)) {
        // Copy the control and strip the icon spans: whatever text survives is its label.
        var clone = p.cloneNode(true);
        var inner = clone.querySelectorAll(ICON_SELECTOR);
        for (var i = 0; i < inner.length; i++) {
          if (inner[i].parentNode) inner[i].parentNode.removeChild(inner[i]);
        }
        if (hasText(clone)) return false;              // there IS a text label
        return !(p.getAttribute('aria-label') || p.getAttribute('title'));
      }
      p = p.parentElement;
    }
    return false;
  }

  function apply(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    var spans = scope.querySelectorAll(ICON_SELECTOR);
    var hidden = 0, kept = 0;
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      // Never touch an icon that is already explicitly handled.
      if (s.hasAttribute('aria-hidden') || s.hasAttribute('aria-label')) continue;
      if (s.getAttribute('role') === 'img') continue;
      if (isSoleLabel(s)) { kept++; continue; }
      s.setAttribute('aria-hidden', 'true');
      hidden++;
    }
    return { hidden: hidden, keptAsSoleLabel: kept, total: spans.length };
  }

  var _pending = null;
  function schedule() {
    if (_pending) return;
    _pending = setTimeout(function () {
      _pending = null;
      try { apply(document); } catch (e) { /* never break the page for this */ }
    }, 60);
  }

  function boot() {
    apply(document);
    if (typeof MutationObserver === 'undefined') return;
    try {
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true, subtree: true
      });
    } catch (e) { /* observer unavailable — the one-shot pass still ran */ }
  }

  window.IconA11y = { apply: apply };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
