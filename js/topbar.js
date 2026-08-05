// js/topbar.js — Unified site-wide topbar component
// Include AFTER css/theme.css and before any page-specific scripts.
// Renders a consistent topbar with nav links + hamburger menu on all pages.

(function() {
  // Only inject if #topbar doesn't already exist (pages can opt-out by having their own)
  if (document.getElementById('topbar')) return;

  // Determine current page for active state
  var path = window.location.pathname.split('/').pop() || 'index.html';

  var pages = [
    { href: 'index.html', label: 'Home' },
    { href: 'panoramica.html', label: 'Panoramica' },
    { href: 'account.html', label: 'Mio Profilo' },
    { href: 'analysis.html', label: 'Report AI' }
  ];

  var navHTML = '';
  pages.forEach(function(p) {
    var isActive = (path === p.href || (path === '' && p.href === 'index.html'));
    navHTML += '<li><a href="' + p.href + '"' + (isActive ? ' class="active"' : '') + '>' + p.label + '</a></li>';
  });

  var topbarHTML =
    '<header class="topbar" id="topbar">' +
    '  <a href="index.html" class="logo">Sotto<span>titoli</span><span class="dot"></span></a>' +
    '  <ul class="nav-links">' + navHTML + '</ul>' +
    '  <div style="display:flex;align-items:center;gap:8px" id="authSection"></div>' +
    '  <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>' +
    '</header>' +
    '<div class="overlay" id="overlay">' +
    '  <nav>' +
    '    <a href="index.html">Home</a>' +
    '    <a href="panoramica.html">Panoramica</a>' +
    '    <a href="account.html">Mio Profilo</a>' +
    '    <a href="analysis.html">Report AI</a>' +
    '  </nav>' +
    '</div>';

  // Insert at top of body
  var body = document.body;
  var temp = document.createElement('div');
  temp.innerHTML = topbarHTML;
  while (temp.firstChild) {
    body.insertBefore(temp.firstChild, body.firstChild);
  }

  // Hamburger toggle
  var hamburger = document.getElementById('hamburger');
  var overlay = document.getElementById('overlay');
  if (hamburger && overlay) {
    hamburger.addEventListener('click', function() {
      overlay.classList.toggle('open');
      hamburger.classList.toggle('open');
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        hamburger.classList.remove('open');
      }
    });
  }
})();
