// js/panoramica/panels/sessions.js — Trascrizioni (Sessions) panel
import { getSupabase } from '../shared/supabase.js';
import { escapeHtml } from '../shared/dom.js';
import { formatDate, formatDuration } from '../shared/formatters.js';
import { emit } from '../shared/events.js';

var container = null;
var initialized = false;
var sessions = [];
var viewMode = 'table'; // 'table' | 'cards'
var sortField = 'created_at';
var sortDir = 'desc';
var filterText = '';

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
<div class="content-panel" id="pnl-trascrizioni">\
  <section class="panel-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">\
    <h2 data-i18n="saved_sessions">Sessioni salvate</h2>\
    <div style="display:flex;align-items:center;gap:8px">\
      <input type="text" id="trSearchInput" placeholder="Search sessions..." style="padding:8px 14px;border:1px solid var(--line);border-radius:100px;background:var(--bg);color:var(--text);font-size:13px;width:200px;font-family:inherit">\
      <button id="trViewTable" class="view-toggle active" style="padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--cyan);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Tabella</button>\
      <button id="trViewCards" class="view-toggle" style="padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text-soft);font-size:12px;font-weight:600;cursor:pointer">Card</button>\
      <button id="trRefreshBtn" style="padding:6px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text-soft);font-size:12px;font-weight:600;cursor:pointer">Aggiorna</button>\
    </div>\
  </section>\
  <div id="trBulkBar" style="display:none;align-items:center;gap:12px;padding:12px 20px;background:var(--cyan);color:#fff;border-radius:12px;margin-bottom:12px;font-size:13px;font-weight:700;font-family:Manrope,sans-serif">\
    <span id="trBulkCount">0 selezionati</span><div style="flex:1"></div>\
    <button id="trBulkDeselect" style="padding:6px 14px;border:1px solid rgba(255,255,255,.4);border-radius:100px;background:transparent;color:#fff;font-size:12px;font-weight:600;cursor:pointer">Annulla</button>\
    <button id="trBulkDelete" style="padding:6px 14px;border:none;border-radius:100px;background:rgba(255,255,255,.25);color:#fff;font-size:12px;font-weight:600;cursor:pointer">Elimina</button>\
  </div>\
  <div id="trTableWrap" style="overflow-x:auto">\
    <table id="trSessionsTable" style="width:100%;border-collapse:collapse;font-size:13px">\
      <thead><tr id="trTableHead"></tr></thead>\
      <tbody id="trTableBody"><tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Caricamento sessioni...</td></tr></tbody>\
    </table>\
  </div>\
  <div id="trCardsWrap" style="display:none;gap:12px;flex-wrap:wrap" class="tr-cards-grid"></div>\
  <div id="trPagination" style="display:flex;justify-content:center;margin-top:16px"></div>\
</div>';
}

export async function init() {
  if (initialized) return;
  initialized = true;

  // View toggle buttons
  var tblBtn = document.getElementById('trViewTable');
  var cardBtn = document.getElementById('trViewCards');
  if (tblBtn) tblBtn.addEventListener('click', function() { setViewMode('table'); });
  if (cardBtn) cardBtn.addEventListener('click', function() { setViewMode('cards'); });

  // Search
  var searchInput = document.getElementById('trSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterText = this.value.toLowerCase();
      renderSessionsList();
    });
  }

  // Refresh
  var refreshBtn = document.getElementById('trRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadSessions);

  // Bulk delete
  var bulkDel = document.getElementById('trBulkDelete');
  if (bulkDel) bulkDel.addEventListener('click', bulkDeleteSessions);
  var bulkDesel = document.getElementById('trBulkDeselect');
  if (bulkDesel) bulkDesel.addEventListener('click', clearSelection);

  // Sortable headers — delegated
  var thead = document.getElementById('trTableHead');
  if (thead) {
    thead.addEventListener('click', function(e) {
      var th = e.target.closest('th.sortable');
      if (!th) return;
      var field = th.getAttribute('data-sort');
      if (sortField === field) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
      else { sortField = field; sortDir = 'desc'; }
      renderSessionsList();
    });
  }

  await loadSessions();
}

export function destroy() {
  initialized = false;
  container = null;
  sessions = [];
}

// ── View mode ──
function setViewMode(mode) {
  viewMode = mode;
  var tblBtn = document.getElementById('trViewTable');
  var cardBtn = document.getElementById('trViewCards');
  if (tblBtn) { tblBtn.style.background = mode === 'table' ? 'var(--cyan)' : 'var(--card)'; tblBtn.style.color = mode === 'table' ? '#fff' : 'var(--text-soft)'; }
  if (cardBtn) { cardBtn.style.background = mode === 'cards' ? 'var(--cyan)' : 'var(--card)'; cardBtn.style.color = mode === 'cards' ? '#fff' : 'var(--text-soft)'; }
  document.getElementById('trTableWrap').style.display = mode === 'table' ? '' : 'none';
  document.getElementById('trCardsWrap').style.display = mode === 'cards' ? 'flex' : 'none';
  renderSessionsList();
}

// ── Load sessions ──
async function loadSessions() {
  var sb = getSupabase();
  var tbody = document.getElementById('trTableBody');
  if (!sb) { if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Accedi per visualizzare le sessioni.</td></tr>'; return; }

  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Caricamento...</td></tr>';

  try {
    var resp = await sb.from('sessions')
      .select('id, name, created_at, duration_seconds, words_count, wpm, language_pair, transcript_text')
      .order('created_at', { ascending: false })
      .limit(100);

    if (resp.error) throw resp.error;
    sessions = resp.data || [];
    renderSessionsList();
  } catch (e) {
    console.error('Sessions load failed:', e);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-faint)">Errore nel caricamento.</td></tr>';
  }
}

// ── Render sessions list ──
function renderSessionsList() {
  var filtered = sessions.filter(function(s) {
    if (!filterText) return true;
    var name = (s.name || '').toLowerCase();
    var lang = (s.language_pair || '').toLowerCase();
    return name.indexOf(filterText) !== -1 || lang.indexOf(filterText) !== -1;
  });

  // Sort
  filtered.sort(function(a, b) {
    var av = a[sortField] || '';
    var bv = b[sortField] || '';
    if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (viewMode === 'table') renderTable(filtered);
  else renderCards(filtered);
}

// ── Table view ──
function renderTable(list) {
  var thead = document.getElementById('trTableHead');
  var tbody = document.getElementById('trTableBody');

  if (thead) {
    var cols = [
      { field: 'name', label: 'Nome' },
      { field: 'created_at', label: 'Data' },
      { field: 'language_pair', label: 'Lingua' },
      { field: 'duration_seconds', label: 'Durata' },
      { field: 'words_count', label: 'Parole' },
      { field: 'wpm', label: 'WPM' }
    ];
    thead.innerHTML = '<th style="width:40px"><input type="checkbox" id="trSelectAll" style="cursor:pointer"></th>' +
      cols.map(function(c) {
        var arrow = sortField === c.field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
        return '<th class="sortable" data-sort="' + c.field + '" style="cursor:pointer;padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">' + c.label + arrow + '</th>';
      }).join('') +
      '<th style="width:60px"></th>';

    document.getElementById('trSelectAll').addEventListener('change', function() {
      var checked = this.checked;
      document.querySelectorAll('.tr-row-check').forEach(function(cb) { cb.checked = checked; });
      updateBulkBar();
    });
  }

  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-faint)">Nessuna sessione trovata.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function(s) {
    return '<tr style="border-bottom:1px solid var(--line)">' +
      '<td style="padding:8px"><input type="checkbox" class="tr-row-check" data-id="' + s.id + '" onchange="window._trUpdateBulkBar && window._trUpdateBulkBar()" style="cursor:pointer"></td>' +
      '<td style="padding:10px 12px;font-weight:600;color:var(--text)">' + escapeHtml(s.name || 'Senza nome') + '</td>' +
      '<td style="padding:10px 12px;color:var(--text-soft);white-space:nowrap">' + formatDate(s.created_at) + '</td>' +
      '<td style="padding:10px 12px;color:var(--text-soft)">' + escapeHtml(s.language_pair || '—') + '</td>' +
      '<td style="padding:10px 12px;color:var(--text-soft)">' + formatDuration(s.duration_seconds) + '</td>' +
      '<td style="padding:10px 12px;color:var(--text-soft)">' + (s.words_count || '—') + '</td>' +
      '<td style="padding:10px 12px;color:var(--text-soft)">' + (s.wpm || '—') + '</td>' +
      '<td style="padding:8px"><button onclick="window._trViewSession(\'' + s.id + '\')" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text-soft)">Apri</button></td>' +
      '</tr>';
  }).join('');

  // Expose helpers to window for inline handlers
  window._trUpdateBulkBar = updateBulkBar;
  window._trViewSession = viewSession;
}

// ── Cards view ──
function renderCards(list) {
  var wrap = document.getElementById('trCardsWrap');
  if (!wrap) return;
  if (!list.length) { wrap.innerHTML = '<p style="width:100%;text-align:center;padding:60px;color:var(--text-faint)">Nessuna sessione trovata.</p>'; return; }

  wrap.innerHTML = list.map(function(s) {
    return '<div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;width:280px;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
      '<strong style="color:var(--text);font-size:14px">' + escapeHtml(s.name || 'Senza nome') + '</strong>' +
      '<input type="checkbox" class="tr-row-check" data-id="' + s.id + '" onchange="window._trUpdateBulkBar && window._trUpdateBulkBar()" style="cursor:pointer">' +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-soft)">' + formatDate(s.created_at) + '</div>' +
      '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-soft)">' +
      '<span>' + formatDuration(s.duration_seconds) + '</span>' +
      '<span>' + (s.words_count || '—') + ' parole</span>' +
      '<span>' + (s.wpm || '—') + ' WPM</span>' +
      '</div>' +
      '<button onclick="window._trViewSession(\'' + s.id + '\')" style="margin-top:4px;padding:8px 16px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif">Apri</button>' +
      '</div>';
  }).join('');
}

// ── View session ──
function viewSession(id) {
  var s = sessions.find(function(x) { return x.id === id; });
  if (!s) return;
  var transcript = s.transcript_text || 'Nessuna trascrizione disponibile.';
  var content = '<div style="max-height:60vh;overflow-y:auto;white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text);padding:8px 0">' + escapeHtml(transcript) + '</div>';

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<div><h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">' + escapeHtml(s.name || 'Sessione') + '</h3>' +
    '<p style="margin:4px 0 0;font-size:12px;color:var(--text-soft)">' + formatDate(s.created_at, {withTime:true}) + ' · ' + formatDuration(s.duration_seconds) + ' · ' + (s.words_count || '—') + ' parole</p></div>' +
    '<button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim);padding:4px 8px">&times;</button>' +
    '</div>' + content + '</div>';
  modal.addEventListener('click', function(e) { if (e.target === modal || e.target.closest('button')) modal.remove(); });
  document.body.appendChild(modal);
}

// ── Bulk selection ──
function updateBulkBar() {
  var checked = document.querySelectorAll('.tr-row-check:checked');
  var bar = document.getElementById('trBulkBar');
  var count = document.getElementById('trBulkCount');
  if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
  if (count) count.textContent = checked.length + ' selezionati';
}

function clearSelection() {
  document.querySelectorAll('.tr-row-check').forEach(function(cb) { cb.checked = false; });
  var selectAll = document.getElementById('trSelectAll');
  if (selectAll) selectAll.checked = false;
  updateBulkBar();
}

async function bulkDeleteSessions() {
  var checked = document.querySelectorAll('.tr-row-check:checked');
  if (!checked.length) return;
  if (!confirm('Eliminare ' + checked.length + ' sessioni?')) return;

  var sb = getSupabase();
  if (!sb) return;
  var ids = Array.from(checked).map(function(cb) { return cb.getAttribute('data-id'); });

  try {
    for (var i = 0; i < ids.length; i++) {
      await sb.from('sessions').delete().eq('id', ids[i]);
    }
    emit('session:deleted', { ids: ids });
    clearSelection();
    await loadSessions();
  } catch (e) {
    console.error('Bulk delete failed:', e);
    alert('Errore durante l\'eliminazione.');
  }
}
