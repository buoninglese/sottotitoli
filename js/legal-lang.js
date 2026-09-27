/* Language selection for the standalone legal pages (termini.html, privacy.html).
 *
 * These two pages do NOT load js/i18n.js. They are self-contained documents with
 * their own inline styles, and they carry BOTH languages in the markup. This file
 * shows the one that matches the site language, using the same key the main app
 * writes — 'sottotitoli-lang', see I18n.setLang in js/i18n.js.
 *
 * Why this is an external file and not an inline <script>:
 *   both pages set   Content-Security-Policy: script-src 'self'
 * which BLOCKS inline script. An inline toggle would silently do nothing and the
 * page would show both language blocks at once, with no error in the console that
 * points at the cause. Keep this file external.
 *
 * Order matters in the markup: this script must run AFTER the blocks it toggles.
 */
(function () {
  var KEY = 'sottotitoli-lang';

  function current() {
    // Anything that is not exactly 'en' means Italian, matching the app default.
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'it'; }
    catch (e) { return 'it'; }
  }

  function apply(lang) {
    document.documentElement.lang = lang;

    var it = document.querySelector('.lang-it');
    var en = document.querySelector('.lang-en');
    // Set BOTH the attribute and display, so a future CSS rule with a `display`
    // declaration on a div cannot quietly override [hidden].
    if (it) { it.hidden = (lang === 'en'); it.style.display = (lang === 'en') ? 'none' : ''; }
    if (en) { en.hidden = (lang !== 'en'); en.style.display = (lang !== 'en') ? 'none' : ''; }

    var title = document.querySelector('title');
    if (title) {
      var t = title.getAttribute('data-title-' + lang);
      if (t) title.textContent = t;
    }

    // The switch exists once per language block, so it must be selected by CLASS,
    // never by id: duplicate ids would make getElementById return whichever block
    // happens to be hidden.
    var sws = document.querySelectorAll('.legal-lang-switch');
    for (var i = 0; i < sws.length; i++) sws[i].textContent = (lang === 'en') ? 'Italiano' : 'English';
  }

  function init() {
    apply(current());
    var sws = document.querySelectorAll('.legal-lang-switch');
    for (var i = 0; i < sws.length; i++) {
      sws[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        var next = (document.documentElement.lang === 'en') ? 'it' : 'en';
        try { localStorage.setItem(KEY, next); } catch (e) {}
        apply(next);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
