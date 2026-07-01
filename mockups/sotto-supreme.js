// ═══ Sotto Supreme · Panel Switching + Dropdowns ═══
var body = document.body;
var themeToggle = document.getElementById('themeToggle');
var themeText = document.querySelector('.theme-text');
var heroClose = document.getElementById('heroClose');
var heroBanner = document.getElementById('heroBanner');

function applyTheme(theme) {
  body.setAttribute('data-theme', theme);
  if (themeText) themeText.textContent = theme === 'dark' ? 'Light' : 'Dark';
  localStorage.setItem('sotto-supreme-theme', theme);
}

function initTheme() {
  var stored = localStorage.getItem('sotto-supreme-theme');
  applyTheme(stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

if (themeToggle) themeToggle.addEventListener('click', function() {
  applyTheme(body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ── Sidebar nav: switch content panels ──
document.querySelectorAll('.side-nav .nav-item[data-panel]').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    var panel = this.dataset.panel;
    // Update active state
    document.querySelectorAll('.side-nav .nav-item').forEach(function(n) { n.classList.remove('active'); });
    this.classList.add('active');
    // Switch panel
    document.querySelectorAll('.content-panel').forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById('pnl-' + panel);
    if (target) requestAnimationFrame(function() { target.classList.add('active'); });
  });
});

// ── Insights sub-tabs ──
document.querySelectorAll('.panel-tabs .tab-link[data-subtab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var subtab = this.dataset.subtab;
    var parent = this.closest('.content-panel');
    if (!parent) return;
    parent.querySelectorAll('.tab-link').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    parent.querySelectorAll('.subtab-pane').forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById('sub-' + subtab);
    if (target) requestAnimationFrame(function() { target.classList.add('active'); });
  });
});

// ── Dropdowns ──
function toggleDropdown(btnId, dropdownId) {
  var btn = document.getElementById(btnId);
  var dd = document.getElementById(dropdownId);
  if (!btn || !dd) return;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = dd.classList.contains('open');
    // Close all dropdowns
    document.querySelectorAll('.dropdown.open').forEach(function(d) { d.classList.remove('open'); });
    if (!isOpen) dd.classList.add('open');
  });
}
toggleDropdown('notifBtn', 'notifDropdown');
toggleDropdown('userBtn', 'userDropdown');
document.addEventListener('click', function() { document.querySelectorAll('.dropdown.open').forEach(function(d) { d.classList.remove('open'); }); });

// ── Banner close ──
if (heroClose && heroBanner) {
  heroClose.addEventListener('click', function() {
    heroBanner.classList.add('is-closing');
    setTimeout(function() { heroBanner.style.display = 'none'; }, 420);
  });
}

window.addEventListener('DOMContentLoaded', function() {
  initTheme();
  requestAnimationFrame(function() { body.classList.add('is-ready'); });
});

