// js/hamburger.js — Dropdown hamburger for all pages
// Requires: css/theme.css (hb-idx / hb-start body classes)
// Displays: avatar + greeting, nav links, credits info, purchase link, settings, logout
(function() {
  'use strict';

  var _credits = { tokens: '—', minutes: '—' };

  function buildDropdown(dd) {
    dd.innerHTML =
      '<div class="dd-greeting">' +
        '<div class="dd-avatar" id="hbAvatar">S</div>' +
        '<span class="dd-name" id="hbName">Hello…</span>' +
      '</div>' +
      '<a href="index.html"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-home"></use></svg> Home</a>' +
      '<a href="panoramica.html"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-insights"></use></svg> Panoramica</a>' +
      '<a href="start.html"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-mic"></use></svg> Start</a>' +
      '<a href="account.html"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-user"></use></svg> Profilo</a>' +
      '<a href="analysis.html"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-star"></use></svg> Report AI</a>' +
      '<hr>' +
      '<div class="dd-credits" id="hbCredits">' +
        '<div class="dd-credit-row"><span>Minuti</span><span id="hbMinutes">—</span></div>' +
        '<div class="dd-credit-row"><span>Crediti report</span><span id="hbTokens">—</span></div>' +
      '</div>' +
      '<hr>' +
      '<a href="purchase.html" style="color:var(--blue);font-weight:600"><svg class="icon" style="width:14px;height:14px;margin-right:6px;vertical-align:middle"><use href="#i-gift"></use></svg> Acquista crediti</a>' +
      '<hr>' +
      '<a href="account.html#cs-profile">Impostazioni</a>' +
      '<a href="panoramica.html#aiuto">Aiuto</a>' +
      '<a href="#" id="hbLogoutBtn" style="font-weight:700">Esci</a>';
  }

  function updateCreditsDisplay() {
    var minEl = document.getElementById('hbMinutes');
    var tokEl = document.getElementById('hbTokens');
    if (minEl) minEl.textContent = (_credits.minutes !== '—' ? _credits.minutes : '0') + ' min';
    if (tokEl) tokEl.textContent = _credits.tokens !== '—' ? _credits.tokens : '0';
  }

  async function fetchCredits() {
    try {
      var sb = window.sottotitoliSupabase;
      if (!sb) return;
      var resp = await sb.auth.getSession();
      var userId = resp.data?.session?.user?.id;
      if (!userId) return;

      // Minutes pool (shared between caption 0.5× & translation 1×)
      var cr = await sb.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
      _credits.minutes = cr.data?.balance_minutes || 0;

      // Credits (reports only)
      var tr = await sb.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
      _credits.tokens = tr.data?.balance || 0;

      updateCreditsDisplay();
    } catch(e) { /* silent */ }
  }

  function init() {
    var wrapper = document.getElementById('hamburger');
    if (!wrapper) return;

    if (!wrapper.querySelector('.hamburger-btn')) {
      var btn = document.createElement('button');
      btn.className = 'hamburger-btn';
      btn.textContent = '';
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
          var letter = (detail.name || 'S').charAt(0).toUpperCase();
          avatarEl.textContent = letter === '?' ? 'S' : letter;
          avatarEl.style.color = '#fff';
        }
      }
      // Fetch credits now that user is ready
      fetchCredits();
    });

    // Listen for avatar preset changes from account page
    window.addEventListener('sottotitoli-avatar-preset-changed', function(e) {
      var avatarEl = document.getElementById('hbAvatar');
      if (!avatarEl || !e.detail) return;
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
      var keys = Object.keys(presets);
      var idx = parseInt(e.detail.preset) || 0;
      var key = keys[idx] || 'purple';
      avatarEl.style.backgroundImage = presets[key];
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.color = '#fff';
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
