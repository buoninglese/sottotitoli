// js/panoramica/panels/vocab-builder.js — Vocabulary Builder panel
import { getSupabase } from '../shared/supabase.js';
import { escapeHtml, showToast } from '../shared/dom.js';
import { cefrBadge, posBadge } from '../shared/formatters.js';

var container = null;
var initialized = false;
var activeTab = 'en-builder';

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
<div class="content-panel" id="pnl-vocabulary-builder">\
  <section class="panel-head"><h2>Vocabulary Builder</h2></section>\
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap" id="vbTabs">\
    <button class="vb-tab-btn active" data-tab="en-builder" style="padding:8px 18px;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--cyan);color:#fff">EN Builder</button>\
    <button class="vb-tab-btn" data-tab="it-builder" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">IT Builder</button>\
    <button class="vb-tab-btn" data-tab="cefr-explorer" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">CEFR Explorer</button>\
    <button class="vb-tab-btn" data-tab="srs-trainer" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">SRS Trainer</button>\
  </div>\
  <div id="vbSearchArea" style="margin-bottom:20px">\
    <div style="display:flex;gap:8px">\
      <input type="text" id="vbSearchInput" placeholder="Cerca una parola in inglese..." style="flex:1;padding:12px 18px;border:1px solid var(--line);border-radius:100px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit">\
      <button id="vbSearchBtn" style="padding:12px 24px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif">Cerca</button>\
    </div>\
  </div>\
  <div id="vbResults" style="min-height:200px"><p style="text-align:center;color:var(--text-faint);padding:60px">Cerca una parola per iniziare.</p></div>\
</div>';
}

export async function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById('vbTabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.vb-tab-btn');
    if (!btn) return;
    activeTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.vb-tab-btn').forEach(function(b) {
      b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
      b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
      b.style.border = b === btn ? 'none' : '1px solid var(--line)';
    });
    updateSearchPlaceholder();
  });

  var searchBtn = document.getElementById('vbSearchBtn');
  var searchInput = document.getElementById('vbSearchInput');
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });

  updateSearchPlaceholder();
}

export function destroy() {
  initialized = false;
  container = null;
}

function updateSearchPlaceholder() {
  var input = document.getElementById('vbSearchInput');
  if (!input) return;
  var map = { 'en-builder': 'Cerca una parola in inglese...', 'it-builder': 'Cerca una parola in italiano...', 'cefr-explorer': 'Cerca per livello CEFR...', 'srs-trainer': 'Cerca una parola da ripassare...' };
  input.placeholder = map[activeTab] || 'Cerca...';
}

async function doSearch() {
  var input = document.getElementById('vbSearchInput');
  var results = document.getElementById('vbResults');
  var word = (input.value || '').trim();
  if (!word) return;

  results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Cercando "' + escapeHtml(word) + '"...</p>';

  try {
    var defs = await fetchDefinitions(word);
    renderDefinitionResults(word, defs);
  } catch (e) {
    results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Errore nella ricerca. Riprova.</p>';
  }
}

async function fetchDefinitions(word) {
  try {
    var resp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    return [];
  }
}

function renderDefinitionResults(word, defs) {
  var results = document.getElementById('vbResults');
  if (!defs || !defs.length) {
    results.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:40px">Nessuna definizione trovata per "' + escapeHtml(word) + '".</p>';
    return;
  }

  var entry = defs[0];
  var phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '';
  var meanings = entry.meanings || [];

  var html = '<div style="margin-bottom:16px">';
  html += '<h3 style="font-size:22px;font-weight:800;color:var(--text);margin:0 0 4px;font-family:Manrope,sans-serif">' + escapeHtml(entry.word || word) + '</h3>';
  if (phonetic) html += '<span style="font-size:14px;color:var(--text-soft);font-family:JetBrains Mono,monospace">' + escapeHtml(phonetic) + '</span>';
  html += '</div>';

  meanings.forEach(function(m) {
    html += '<div style="margin-bottom:20px">';
    html += '<div style="font-size:12px;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">' + escapeHtml(m.partOfSpeech || '') + '</div>';
    var defs = (m.definitions || []).slice(0, 3);
    defs.forEach(function(d, i) {
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;color:var(--text);line-height:1.6">';
      html += '<strong>' + (i + 1) + '.</strong> ' + escapeHtml(d.definition);
      if (d.example) html += '<br><span style="color:var(--text-soft);font-style:italic">"' + escapeHtml(d.example) + '"</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  // Add to bank button
  html += '<div style="margin-top:16px"><button onclick="window._vbAddWord(\'' + word.replace(/'/g, "\\'") + '\')" style="padding:10px 24px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif">+ Aggiungi a banca</button></div>';

  results.innerHTML = html;

  window._vbAddWord = async function(w) {
    var sb = getSupabase();
    if (!sb) { showToast('Accedi per salvare parole.', 'error'); return; }
    try {
      var userResp = await sb.auth.getUser();
      var userId = userResp.data.user?.id;
      var bankResp = await sb.from('user_wordbanks').select('id').eq('user_id', userId).eq('lang', 'en').limit(1);
      var bankId;
      if (bankResp.data && bankResp.data.length) {
        bankId = bankResp.data[0].id;
      } else {
        var createResp = await sb.from('user_wordbanks').insert({ name: 'My English Bank', lang: 'en', user_id: userId }).select('id').single();
        if (createResp.error) throw createResp.error;
        bankId = createResp.data.id;
      }
      await sb.from('user_wordbank_words').insert({ wordbank_id: bankId, word: w, user_id: userId, status: 'new', added_at: new Date().toISOString() });
      showToast('"' + w + '" salvata!', 'success');
    } catch (e) {
      console.error('Add word failed:', e);
      showToast('Errore nel salvataggio.', 'error');
    }
  };
}
