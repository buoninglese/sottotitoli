// js/panoramica/panels/wordbanks.js — Banche parole (Word Banks) panel
import { getSupabase } from '../shared/supabase.js';
import { escapeHtml, showToast } from '../shared/dom.js';
import { formatDate } from '../shared/formatters.js';

var container = null;
var initialized = false;
var banks = [];
var activeTab = 'overview'; // overview | english | italian | review

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
<div class="content-panel" id="pnl-wordbanks">\
  <section class="panel-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">\
    <h2>Word Banks</h2>\
    <div style="display:flex;align-items:center;gap:8px">\
      <button id="wbCreateBtn" style="padding:8px 18px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif">+ Nuova Banca</button>\
      <button id="wbRefreshBtn" style="padding:6px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text-soft);font-size:12px;font-weight:600;cursor:pointer">Aggiorna</button>\
    </div>\
  </section>\
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap" id="wbTabs">\
    <button class="wb-tab-btn active" data-tab="overview" style="padding:8px 18px;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--cyan);color:#fff">Panoramica</button>\
    <button class="wb-tab-btn" data-tab="english" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">English</button>\
    <button class="wb-tab-btn" data-tab="italian" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">Italiano</button>\
    <button class="wb-tab-btn" data-tab="review" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">Da ripassare</button>\
  </div>\
  <div id="wbContent" style="min-height:300px"><p style="text-align:center;color:var(--text-faint);padding:60px">Caricamento banche...</p></div>\
</div>';
}

export async function init() {
  if (initialized) return;
  initialized = true;

  // Tab switching
  document.getElementById('wbTabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.wb-tab-btn');
    if (!btn) return;
    activeTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.wb-tab-btn').forEach(function(b) {
      b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
      b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
      b.style.border = b === btn ? 'none' : '1px solid var(--line)';
    });
    renderContent();
  });

  // Create bank
  var createBtn = document.getElementById('wbCreateBtn');
  if (createBtn) createBtn.addEventListener('click', showCreateBankDialog);

  // Refresh
  var refreshBtn = document.getElementById('wbRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadBanks);

  await loadBanks();
}

export function destroy() {
  initialized = false;
  container = null;
  banks = [];
}

// ── Load banks ──
async function loadBanks() {
  var sb = getSupabase();
  if (!sb) { document.getElementById('wbContent').innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Accedi per visualizzare le banche.</p>'; return; }

  try {
    var resp = await sb.from('user_wordbanks').select('id, name, lang, created_at').order('created_at', { ascending: false });
    if (resp.error) throw resp.error;
    banks = resp.data || [];
    renderContent();
  } catch (e) {
    console.error('Wordbanks load failed:', e);
    document.getElementById('wbContent').innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Errore nel caricamento.</p>';
  }
}

// ── Render content based on active tab ──
function renderContent() {
  var content = document.getElementById('wbContent');
  if (!content) return;

  var filtered = banks.filter(function(b) {
    if (activeTab === 'overview') return true;
    if (activeTab === 'english') return (b.lang || '').toLowerCase().indexOf('en') !== -1;
    if (activeTab === 'italian') return (b.lang || '').toLowerCase().indexOf('it') !== -1;
    return true;
  });

  if (activeTab === 'review') {
    content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Da ripassare — in arrivo.</p>';
    return;
  }

  if (!filtered.length) {
    content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Nessuna banca trovata. Crea la tua prima banca!</p>';
    return;
  }

  if (activeTab === 'overview') {
    content.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">' +
      filtered.map(renderBankCard).join('') + '</div>';
  } else {
    content.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">' +
      filtered.map(renderBankRow).join('') + '</div>';
  }
}

function renderBankCard(b) {
  return '<div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;transition:border-color .15s" onclick="window._wbViewBank(\'' + b.id + '\')" onmouseover="this.style.borderColor=\'var(--cyan)\'" onmouseout="this.style.borderColor=\'var(--line)\'">' +
    '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">' +
    '<strong style="color:var(--text);font-size:15px">' + escapeHtml(b.name) + '</strong>' +
    '<span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(6,182,212,.1);color:var(--cyan)">' + escapeHtml(b.lang || '—') + '</span>' +
    '</div>' +
    '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-soft)">' +
    '<span>' + (b.word_count || 0) + ' parole</span>' +
    '<span>' + formatDate(b.created_at) + '</span>' +
    '</div>' +
    '</div>';
}

function renderBankRow(b) {
  return '<div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="window._wbViewBank(\'' + b.id + '\')">' +
    '<div><strong style="color:var(--text)">' + escapeHtml(b.name) + '</strong><span style="margin-left:12px;font-size:12px;color:var(--text-soft)">' + (b.word_count || 0) + ' parole</span></div>' +
    '<span style="font-size:11px;color:var(--text-faint)">' + escapeHtml(b.lang || '') + '</span>' +
    '</div>';
}

// ── View bank details ──
async function viewBank(id) {
  var b = banks.find(function(x) { return x.id === id; });
  if (!b) return;

  var sb = getSupabase();
  var words = [];
  if (sb) {
    try {
      var resp = await sb.from('user_wordbank_words').select('word, pos, cefr_level, status, added_at').eq('wordbank_id', id).order('added_at', { ascending: false }).limit(200);
      if (!resp.error) words = resp.data || [];
    } catch (e) { console.warn('Words load failed:', e); }
  }

  var wordList = words.length ? words.map(function(w) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--line);font-size:13px">' +
      '<span style="font-weight:600;color:var(--text)">' + escapeHtml(w.word) + '</span>' +
      '<span style="color:var(--text-soft);font-size:11px">' + escapeHtml(w.pos || '') + (w.cefr_level ? ' · ' + w.cefr_level : '') + '</span>' +
      '</div>';
  }).join('') : '<p style="text-align:center;color:var(--text-faint);padding:40px">Nessuna parola ancora.</p>';

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">' + escapeHtml(b.name) + '</h3>' +
    '<button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim)">&times;</button>' +
    '</div>' +
    '<p style="font-size:12px;color:var(--text-soft);margin:0 0 16px">' + (b.word_count || words.length) + ' parole · ' + escapeHtml(b.lang || '') + '</p>' +
    wordList + '</div>';
  modal.addEventListener('click', function(e) { if (e.target === modal || e.target.closest('button')) modal.remove(); });
  document.body.appendChild(modal);
}

// ── Create bank dialog ──
function showCreateBankDialog() {
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
    '<h3 style="margin:0 0 16px;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">Nuova Banca Parole</h3>' +
    '<input id="wbNewName" placeholder="Nome banca" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;margin-bottom:12px;box-sizing:border-box">' +
    '<select id="wbNewLang" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;margin-bottom:16px;box-sizing:border-box"><option value="en">English</option><option value="it">Italiano</option></select>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button id="wbNewCancel" style="padding:10px 20px;border:1px solid var(--line);border-radius:100px;background:var(--card);color:var(--text-soft);font-size:13px;font-weight:600;cursor:pointer">Annulla</button>' +
    '<button id="wbNewConfirm" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;cursor:pointer">Crea</button>' +
    '</div></div>';

  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  modal.querySelector('#wbNewCancel').addEventListener('click', function() { modal.remove(); });
  modal.querySelector('#wbNewConfirm').addEventListener('click', async function() {
    var name = document.getElementById('wbNewName').value.trim();
    var lang = document.getElementById('wbNewLang').value;
    if (!name) { alert('Inserisci un nome.'); return; }
    var sb = getSupabase();
    if (!sb) { modal.remove(); return; }
    try {
      var userResp = await sb.auth.getUser();
      var userId = userResp.data.user?.id;
      if (!userId) throw new Error('Not authenticated');
      var resp = await sb.from('user_wordbanks').insert({ name: name, lang: lang, user_id: userId });
      if (resp.error) throw resp.error;
      modal.remove();
      showToast('Banca creata!', 'success');
      await loadBanks();
    } catch (e) {
      console.error('Create bank failed:', e);
      alert('Errore: ' + e.message);
    }
  });

  document.body.appendChild(modal);
}

// Expose helpers
window._wbViewBank = viewBank;
