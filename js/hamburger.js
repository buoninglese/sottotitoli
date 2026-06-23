// js/hamburger.js — Dropdown hamburger for all pages
// Requires: css/theme.css (hb-idx / hb-start body classes)
// Listens for sottotitoli-user-ready to update avatar/greeting
(function() {
  'use strict';

  function init() {
    var wrapper = document.getElementById('hamburger');
    if (!wrapper) return;

    // Build hamburger button + dropdown if not already present
    if (!wrapper.querySelector('.hamburger-btn')) {
      var btn = document.createElement('button');
      btn.className = 'hamburger-btn';
      btn.textContent = 'Menu';
      btn.setAttribute('aria-label', 'Menu');
      wrapper.appendChild(btn);

      var dd = document.createElement('div');
      dd.className = 'hamburger-dropdown';
      dd.innerHTML =
        '<div class="dd-greeting">' +
          '<div class="dd-avatar" id="hbAvatar">?</div>' +
          '<span class="dd-name" id="hbName">Hello</span>' +
        '</div>' +
        '<a href="index.html">Home</a>' +
        '<a href="start.html">Start</a>' +
        '<a href="account.html">Profilo</a>' +
        '<a href="analysis.html">AI Reports</a>' +
        '<hr>' +
        '<a href="#" id="hbThemeToggle">Tema chiaro/scuro</a>';
      wrapper.appendChild(dd);

      // Toggle dropdown
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (dd.classList.contains('open')) {
          dd.classList.remove('open');
          dd.classList.add('closing');
          setTimeout(function() { dd.classList.remove('closing'); }, 300);
        } else {
          // Close any other open dropdowns
          document.querySelectorAll('.hamburger-dropdown.open').forEach(function(d) {
            d.classList.remove('open');
            d.classList.add('closing');
            setTimeout(function() { d.classList.remove('closing'); }, 300);
          });
          dd.classList.add('open');
        }
      });

      // Close on outside click
      document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
          if (dd.classList.contains('open')) {
            dd.classList.remove('open');
            dd.classList.add('closing');
            setTimeout(function() { dd.classList.remove('closing'); }, 300);
          }
        }
      });

      // Theme toggle link
      var themeLink = document.getElementById('hbThemeToggle');
      if (themeLink) {
        themeLink.addEventListener('click', function(e) {
          e.preventDefault();
          var current = document.documentElement.getAttribute('data-theme') || 'dark';
          var next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          try { localStorage.setItem('sottotitoli-theme', next); } catch(ex) {}
          // Close dropdown
          if (dd.classList.contains('open')) {
            dd.classList.remove('open');
            dd.classList.add('closing');
            setTimeout(function() { dd.classList.remove('closing'); }, 300);
          }
        });
      }
    }

    // Listen for user data
    window.addEventListener('sottotitoli-user-ready', function(e) {
      var detail = e.detail || {};
      var avatarEl = document.getElementById('hbAvatar');
      var nameEl = document.getElementById('hbName');
      if (nameEl && detail.name) {
        var lang = (navigator.language || 'it').split('-')[0];
        var greetings = {it:'Ciao', en:'Hello', fr:'Bonjour', es:'Hola', de:'Hallo', pt:'Ola', nl:'Hallo', pl:'Czesc'};
        var greeting = greetings[lang] || 'Ciao';
        var firstName = detail.name.split(' ')[0];
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        nameEl.textContent = greeting + ', ' + firstName;
      }
      if (avatarEl) {
        if (detail.avatar && detail.avatar.indexOf('http') === 0) {
          avatarEl.style.backgroundImage = 'url(' + detail.avatar + ')';
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.textContent = '';
          avatarEl.style.color = 'transparent';
        } else if (detail.preset) {
          // Use preset gradient
          var presets = {
            purple: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            blue: 'linear-gradient(135deg,#2563eb,#60a5fa)',
            green: 'linear-gradient(135deg,#059669,#34d399)',
            rose: 'linear-gradient(135deg,#e11d48,#fb7185)',
            amber: 'linear-gradient(135deg,#d97706,#fbbf24)',
            cyan: 'linear-gradient(135deg,#0891b2,#22d3ee)',
            indigo: 'linear-gradient(135deg,#4f46e5,#818cf8)',
            teal: 'linear-gradient(135deg,#0d9488,#2dd4bf)'
          };
          avatarEl.style.backgroundImage = presets[detail.preset] || presets.purple;
          avatarEl.textContent = (detail.name || '?').charAt(0).toUpperCase();
          avatarEl.style.backgroundSize = 'cover';
        } else {
          avatarEl.style.backgroundImage = 'linear-gradient(135deg,#7c3aed,#a78bfa)';
          avatarEl.textContent = (detail.name || '?').charAt(0).toUpperCase();
          avatarEl.style.color = '#fff';
        }
      }
    });

    // Also check proactively (if event already fired)
    if (window.__sottotitoliUserReady) {
      window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', { detail: window.__sottotitoliUserReady }));
    }
    // Fallback: listen for the event stored on window (auth.js v9+ pattern)
    var checkInterval = setInterval(function() {
      if (window.__sottotitoliUserReady) {
        window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', { detail: window.__sottotitoliUserReady }));
        clearInterval(checkInterval);
      }
    }, 300);
    setTimeout(function() { clearInterval(checkInterval); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
