/* ═══════════════════════════════════════════════════════
   Sottotitoli · Shared Theme JS — Navbar, Hamburger, Theme
   + Flexbox gap polyfill for iOS <14.5
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Flex gap polyfill (iOS <14.5 doesn't support gap in flexbox) ──
  (function(){
    // Test if gap works in flexbox
    var gapWorks = false;
    try {
      var testParent = document.createElement('div');
      testParent.style.cssText = 'position:absolute;visibility:hidden;display:flex;gap:30px';
      testParent.innerHTML = '<div style="width:20px;height:20px"></div><div style="width:20px;height:20px"></div>';
      document.body.appendChild(testParent);
      gapWorks = testParent.children[1].offsetLeft > 25;
      document.body.removeChild(testParent);
    } catch(e) {}
    if (gapWorks) return;

    // Polyfill: convert gap to margins on flex children
    function applyGapPolyfill() {
      document.querySelectorAll('*').forEach(function(el) {
        var ds = el.style.display || '';
        if (ds.indexOf('flex') === -1) {
          try { var cs = getComputedStyle(el); } catch(e) { return; }
          if (cs.display !== 'flex' && cs.display !== 'inline-flex') return;
        }
        // Read gap from inline style first, then computed
        var gap = el.style.gap || '';
        if (!gap || gap === 'normal') {
          try { gap = getComputedStyle(el).gap; } catch(e) { return; }
        }
        if (!gap || gap === '0px' || gap === 'normal') return;
        var gv = parseFloat(gap);
        if (!gv || gv <= 0) return;
        var children = el.children;
        for (var i = 0; i < children.length; i++) {
          children[i].style.marginRight = gv + 'px';
          children[i].style.marginBottom = gv + 'px';
        }
        // If this is a row flex, also handle wrap
        var fd = el.style.flexDirection || '';
        if (!fd) { try { fd = getComputedStyle(el).flexDirection; } catch(e) {} }
        if (fd === 'column' || fd === 'column-reverse') {
          for (var j = 0; j < children.length; j++) {
            children[j].style.marginRight = '0';
          }
          var last = children[children.length - 1];
          if (last) last.style.marginBottom = '0';
        }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyGapPolyfill);
    } else {
      applyGapPolyfill();
    }
  })();

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

  if (dots.length && panels.length && typeof IntersectionObserver !== 'undefined') {
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
