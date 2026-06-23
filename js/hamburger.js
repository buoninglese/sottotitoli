// js/hamburger.js — Dropdown hamburger for all pages
// Requires: css/theme.css (hb-idx / hb-start body classes)
// Displays: avatar + greeting, nav links, credits info, purchase link, settings, logout
(function() {
  'use strict';

  var _credits = { tokens: '—', captionMin: '—', translationMin: '—' };

  function buildDropdown(dd) {
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
      '<div class="dd-credits" id="hbCredits">' +
        '<div class="dd-credit-row"><span>Crediti</span><span id="hbTokens">—</span></div>' +
        '<div class="dd-credit-row"><span>Minuti</span><span id="hbCapMin">—</span></div>' +
        '<div class="dd-credit-sub">caption</div>' +
        '<div class="dd-credit-row"><span>Minuti</span><span id="hbTraMin">—</span></div>' +
        '<div class="dd-credit-sub">traduzione</div>' +
      '</div>' +
      '<hr>' +
      '<a href="purchase.html">💳 Acquista crediti</a>' +
      '<hr>' +
      '<a href="account.html#cs-profile">⚙️ Impostazioni</a>' +
      '<a href="#" id="hbLogoutBtn" class="hb-logout">🚪 Esci</a>';
  }

  function updateCreditsDisplay() {
    var tokensEl = document.getElementById('hbTokens');
    var capEl = document.getElementById('hbCapMin');
    var traEl = document.getElementById('hbTraMin');
    if (tokensEl) tokensEl.textContent = _credits.tokens;
    // Caption: 0.5 credit/min → 1 credit = 2 min
    // Traduzione: 1 credit/min → 1 credit = 1 min
    if (capEl) capEl.textContent = _credits.captionMin + ' min';
    if (traEl) traEl.textContent = _credits.translationMin + ' min';
  }

  async function fetchCredits() {
    try {
      var sb = window.sottotitoliSupabase;
      if (!sb) return;
      var resp = await sb.auth.getSession();
      var userId = resp.data?.session?.user?.id;
      if (!userId) return;

      // Fetch tokens (universal credits)
      var tr = await sb.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
      var tokens = tr.data?.balance || 0;
      _credits.tokens = tokens;
      // Caption: 0.5 credit/min → tokens × 2
      _credits.captionMin = tokens * 2;
      // Traduzione: 1 credit/min → tokens × 1
      _credits.translationMin = tokens;

      updateCreditsDisplay();
    } catch(e) {
      // Silently fail
    }
  }

  function init() {
    var wrapper = document.getElementById('hamburger');
    if (!wrapper) return;

    if (!wrapper.querySelector('.hamburger-btn')) {
      var btn = document.createElement('button');
      btn.className = 'hamburger-btn';
      btn.textContent = 'Menu';
      btn.setAttribute('aria-label', 'Menu');
      wrapper.appendChild(btn);

      var dd = document.createElement('div');
      dd.className = 'hamburger-dropdown';
      buildDropdown(dd);
      wrapper.appendChild(dd);

      // Toggle dropdown
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (dd.classList.contains('open')) {
          dd.classList.remove('open');
          dd.classList.add('closing');
          setTimeout(function() { dd.classList.remove('closing'); }, 300);
        } else {
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

      // Logout
      var logoutBtn = document.getElementById('hbLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
          e.preventDefault();
          try {
            if (window.sottotitoliSupabase) {
              await window.sottotitoliSupabase.auth.signOut();
            }
          } catch(ex) {}
          try { localStorage.removeItem('sottotitoli_return_page'); } catch(ex) {}
          try { localStorage.removeItem('sottotitoli_referrer'); } catch(ex) {}
          window.location.href = 'index.html';
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
      // Fetch credits now that user is ready
      fetchCredits();
    });

    // Proactive check
    if (window.__sottotitoliUserReady) {
      window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', { detail: window.__sottotitoliUserReady }));
    }
    var checkInterval = setInterval(function() {
      if (window.__sottotitoliUserReady) {
        window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', { detail: window.__sottotitoliUserReady }));
        clearInterval(checkInterval);
      }
    }, 300);
    setTimeout(function() { clearInterval(checkInterval); }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
