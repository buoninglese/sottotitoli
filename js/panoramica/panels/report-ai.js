// js/panoramica/panels/report-ai.js — Report AI panel
import { getSupabase } from '../shared/supabase.js';
import { escapeHtml, showToast } from '../shared/dom.js';
import { formatDate, statusBadge } from '../shared/formatters.js';

var container = null;
var initialized = false;
var activeTab = 'rai-crea';
var reports = [];

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = '\
<div class="content-panel" id="pnl-report-ai">\
  <section class="panel-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">\
    <h2>Report AI</h2><span class="premium-pill">PREMIUM</span>\
  </section>\
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap" id="raiTabs">\
    <button class="rai-tab-btn active" data-tab="rai-crea" style="padding:8px 18px;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--cyan);color:#fff">Crea Report</button>\
    <button class="rai-tab-btn" data-tab="rai-miei" style="padding:8px 18px;border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Manrope,sans-serif;background:var(--card);color:var(--text-soft)">I miei Report</button>\
  </div>\
  <div id="raiContent" style="min-height:300px"></div>\
</div>';
}

export async function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById('raiTabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.rai-tab-btn');
    if (!btn) return;
    activeTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.rai-tab-btn').forEach(function(b) {
      b.style.background = b === btn ? 'var(--cyan)' : 'var(--card)';
      b.style.color = b === btn ? '#fff' : 'var(--text-soft)';
      b.style.border = b === btn ? 'none' : '1px solid var(--line)';
    });
    renderContent();
  });

  await loadReports();
  renderContent();
}

export function destroy() {
  initialized = false;
  container = null;
  reports = [];
}

async function loadReports() {
  var sb = getSupabase();
  if (!sb) { reports = []; return; }
  try {
    var resp = await sb.from('session_ai_reports').select('id, created_at, overall_score, summary, status, session_count').order('created_at', { ascending: false }).limit(50);
    if (!resp.error) reports = resp.data || [];
  } catch (e) { console.warn('Reports load failed:', e); }
}

function renderContent() {
  var content = document.getElementById('raiContent');
  if (!content) return;

  if (activeTab === 'rai-crea') {
    content.innerHTML = '\
<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px;max-width:600px">\
  <h3 style="font-size:18px;font-weight:700;color:var(--text);margin:0 0 8px;font-family:Manrope,sans-serif">Genera un Report AI</h3>\
  <p style="font-size:13px;color:var(--text-soft);margin:0 0 20px;line-height:1.6">Analizza le tue sessioni di conversazione e ricevi feedback dettagliati su grammatica, vocabolario, fluidit&agrave; e pronuncia.</p>\
  <div style="margin-bottom:16px">\
    <label style="display:block;font-size:12px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Lingua</label>\
    <select id="raiLang" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;box-sizing:border-box"><option value="en">English</option><option value="it">Italiano</option></select>\
  </div>\
  <div style="margin-bottom:16px">\
    <label style="display:block;font-size:12px;font-weight:700;color:var(--text-soft);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Sessioni da analizzare</label>\
    <select id="raiSessionCount" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;box-sizing:border-box"><option value="1">Ultima sessione</option><option value="3">Ultime 3 sessioni</option><option value="5">Ultime 5 sessioni</option><option value="10">Ultime 10 sessioni</option></select>\
  </div>\
  <button id="raiGenerateBtn" style="width:100%;padding:14px 28px;background:var(--cyan);color:#fff;border:none;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;transition:all .2s">Genera Report</button>\
  <p id="raiGenerateMsg" style="font-size:12px;color:var(--text-soft);margin:12px 0 0;text-align:center;min-height:18px"></p>\
</div>';
    document.getElementById('raiGenerateBtn').addEventListener('click', generateReport);
  } else {
    if (!reports.length) {
      content.innerHTML = '<p style="text-align:center;color:var(--text-faint);padding:60px">Nessun report ancora. <a href="javascript:void(0)" onclick="document.querySelector(\'.rai-tab-btn[data-tab=rai-crea]\').click()" style="color:var(--cyan);text-decoration:underline">Genera il tuo primo report</a>.</p>';
      return;
    }
    content.innerHTML = '\
<table style="width:100%;border-collapse:collapse;font-size:13px">\
  <thead><tr style="border-bottom:2px solid var(--line)">\
    <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase">Data</th>\
    <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase">Punteggio</th>\
    <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase">Sessioni</th>\
    <th style="padding:10px 12px;text-align:left;font-weight:700;color:var(--text-soft);font-size:11px;text-transform:uppercase">Stato</th>\
    <th style="padding:10px 12px"></th>\
  </tr></thead>\
  <tbody>' + reports.map(function(r) { return '\
    <tr style="border-bottom:1px solid var(--line)">\
      <td style="padding:10px 12px;color:var(--text)">' + formatDate(r.created_at) + '</td>\
      <td style="padding:10px 12px;color:var(--text);font-weight:700">' + (r.overall_score || '—') + '</td>\
      <td style="padding:10px 12px;color:var(--text-soft)">' + (r.session_count || '—') + '</td>\
      <td style="padding:10px 12px">' + statusBadge(r.status) + '</td>\
      <td style="padding:10px 12px"><button onclick="window._raiViewReport(\'' + r.id + '\')" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text-soft)">Dettagli</button></td>\
    </tr>'; }).join('') + '</tbody></table>';
    window._raiViewReport = viewReport;
  }
}

async function generateReport() {
  var msg = document.getElementById('raiGenerateMsg');
  var btn = document.getElementById('raiGenerateBtn');
  var sb = getSupabase();

  if (!sb) { if (msg) msg.textContent = 'Accedi per generare report.'; return; }

  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generazione in corso...'; }
    if (msg) msg.textContent = 'Analisi in corso...';

    var resp = await sb.functions.invoke('generate-ai-report', {
      body: { language: document.getElementById('raiLang').value, session_count: parseInt(document.getElementById('raiSessionCount').value) }
    });

    if (resp.error) throw resp.error;

    if (msg) msg.textContent = 'Report generato!';
    showToast('Report AI generato con successo!', 'success');
    if (btn) { btn.disabled = false; btn.textContent = 'Genera Report'; }

    await loadReports();
    activeTab = 'rai-miei';
    document.querySelector('.rai-tab-btn[data-tab="rai-miei"]').click();
    renderContent();
  } catch (e) {
    console.error('Report generation failed:', e);
    if (msg) msg.textContent = 'Errore: ' + e.message;
    if (btn) { btn.disabled = false; btn.textContent = 'Genera Report'; }
  }
}

function viewReport(id) {
  var r = reports.find(function(x) { return x.id === id; });
  if (!r) return;
  var summary = r.summary || 'Nessun riepilogo disponibile.';
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="background:var(--card);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">\
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">\
    <h3 style="margin:0;font-family:Manrope,sans-serif;font-size:18px;color:var(--text)">Report AI</h3>\
    <button style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-dim)">&times;</button></div>\
    <p style="font-size:12px;color:var(--text-soft);margin:0 0 8px">' + formatDate(r.created_at, {withTime:true}) + ' · Punteggio: ' + (r.overall_score || '—') + ' · ' + (r.session_count || '—') + ' sessioni</p>\
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;color:var(--text)">' + escapeHtml(summary) + '</div></div>';
  modal.addEventListener('click', function(e) { if (e.target === modal || e.target.closest('button')) modal.remove(); });
  document.body.appendChild(modal);
}
