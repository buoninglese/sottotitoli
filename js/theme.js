/* ═══════════════════════════════════════════════════════
   Sottotitoli · Shared Theme JS — Navbar, Hamburger, Theme
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Hamburger ──
  var btn = document.getElementById('hamburger');
  var ov = document.getElementById('overlay');
  var toggled = false;

  if (btn && ov) {
    btn.addEventListener('click', function () {
      toggled = !toggled;
      btn.classList.toggle('open', toggled);
      ov.classList.toggle('open', toggled);
      document.body.style.overflow = toggled ? 'hidden' : '';
    });
    ov.addEventListener('click', function (e) {
      if (e.target === ov) {
        toggled = false;
        btn.classList.remove('open');
        ov.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggled) {
        toggled = false;
        btn.classList.remove('open');
        ov.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // ── Topbar scroll effect ──
  var bar = document.getElementById('topbar');
  if (bar) {
    var scrollContainer = document.querySelector('.main-scroll') || window;
    var isMainScroll = scrollContainer !== window;

    function onScroll() {
      var y = isMainScroll ? scrollContainer.scrollTop : window.scrollY;
      bar.classList.toggle('scrolled', y > 50);
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    // Initial check
    onScroll();
  }

  // ── Theme toggle ──
  var themeBtn = document.getElementById('themeToggle');
  var html = document.documentElement;

  function setTheme(t) {
    html.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    try { localStorage.setItem('sottotitoli-theme', t); } catch (e) {}
  }

  // Initialize from localStorage or system preference
  var saved = null;
  try { saved = localStorage.getItem('sottotitoli-theme'); } catch (e) {}
  if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  setTheme(saved);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = html.getAttribute('data-theme') || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ── Active dot tracking (IntersectionObserver) ──
  var dots = document.querySelectorAll('.dots a');
  var panels = document.querySelectorAll('.panel');

  if (dots.length && panels.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          dots.forEach(function (d) {
            d.classList.toggle('active', d.getAttribute('href') === '#' + e.target.id);
          });
        }
      });
    }, { threshold: 0.5 });

    panels.forEach(function (p) { observer.observe(p); });
  }

  // ── Set active nav link based on current page ──
  (function () {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    // Map page names to nav links
    var links = document.querySelectorAll('.topbar .nav-links a:not(.nav-cta)');
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var hrefPage = href.split('/').pop();
      if (hrefPage === page || (page === '' && hrefPage === 'index.html')) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  })();

})();
