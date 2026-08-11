// js/panoramica/panels/dashboard.js — Panoramica (Dashboard) panel
// Hero banner + metric cards + 14-day chart

import { escapeHtml } from '../shared/dom.js';
import { getSupabase } from '../shared/supabase.js';
import { formatDate, formatNumber } from '../shared/formatters.js';
import { store } from '../shared/state.js';
import { emit } from '../shared/events.js';

var container = null;
var initialized = false;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `
    <div class="content-panel active" id="pnl-panoramica">
      <section class="panel-head"><h2>Panoramica</h2></section>

      <!-- Hero Banner -->
      <div class="hero-glass-card" style="background:linear-gradient(135deg,rgba(6,182,212,.06),rgba(168,85,247,.04));border:1px solid var(--line);border-radius:20px;padding:32px 36px;margin-bottom:24px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h2 style="font-size:32px;font-weight:800;margin:0 0 8px;font-family:Manrope,sans-serif;letter-spacing:-.02em;color:var(--text)">
              <span>Bentornato,</span> <em id="heroName" style="font-style:normal;color:var(--cyan)">—</em>
            </h2>
            <p id="heroText" style="font-size:15px;color:var(--text-soft);margin:0;line-height:1.6" data-i18n="your_stats_ready">
              Le tue statistiche di apprendimento sono pronte.
            </p>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div class="metric-card" data-metric="total-sessions" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;min-width:100px;text-align:center">
              <div class="metric-value" id="heroSessions" style="font-size:28px;font-weight:800;color:var(--text);font-family:Manrope,sans-serif">—</div>
              <div class="metric-label" style="font-size:11px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Sessioni</div>
            </div>
            <div class="metric-card" data-metric="total-minutes" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;min-width:100px;text-align:center">
              <div class="metric-value" id="heroMinutes" style="font-size:28px;font-weight:800;color:var(--text);font-family:Manrope,sans-serif">—</div>
              <div class="metric-label" style="font-size:11px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em" data-i18n="minutes">Minuti</div>
            </div>
            <div class="metric-card" data-metric="total-words" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;min-width:100px;text-align:center">
              <div class="metric-value" id="heroWords" style="font-size:28px;font-weight:800;color:var(--text);font-family:Manrope,sans-serif">—</div>
              <div class="metric-label" style="font-size:11px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em" data-i18n="words">Parole</div>
            </div>
          </div>
        </div>
        <div style="position:absolute;top:-60px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(6,182,212,.08),transparent 70%);border-radius:50%;pointer-events:none"></div>
      </div>

      <!-- 14-Day Chart -->
      <div class="glass-card" style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:700;margin:0 0 16px;color:var(--text);font-family:Manrope,sans-serif">Andamento 14 giorni</h3>
        <div id="dailyChart" style="display:flex;align-items:flex-end;gap:6px;height:160px;padding:0 4px">
          <p style="color:var(--text-faint);text-align:center;width:100%;padding:40px" data-i18n="loading">Caricamento…</p>
        </div>
      </div>

      <!-- Metric Cards Row -->
      <div class="stats-row" id="metricsRow" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
      </div>
    </div>
  `;
}

export async function init() {
  if (initialized) return;
  initialized = true;

  await refreshHero();
  await refreshChart();
  await refreshMetrics();

  // Listen for session saves
  var events = await import('../shared/events.js');
  events.on('session:saved', function () { refreshHero(); refreshChart(); refreshMetrics(); });
  events.on('session:deleted', function () { refreshHero(); refreshChart(); refreshMetrics(); });
}

export function destroy() {
  initialized = false;
  container = null;
}

export async function rerender() {
  // Re-apply i18n labels
  if (typeof I18n !== 'undefined' && I18n.apply && container) {
    I18n.apply(container);
  }
}

// ── Refresh functions ──

async function refreshHero() {
  var profile = window._sottotitoliProfile || window.profile;
  var nameEl = document.getElementById('heroName');
  if (nameEl) {
    nameEl.textContent = (profile && profile.display_name) || (profile && profile.full_name) || 'Utente';
  }

  // Aggregate stats from EN + IT
  var statsEN = window.statsEN;
  var statsIT = window.statsIT;

  var totalSessions = (statsEN ? statsEN.total_sessions || 0 : 0) + (statsIT ? statsIT.total_sessions || 0 : 0);
  var totalMinutes = (statsEN ? statsEN.total_minutes || 0 : 0) + (statsIT ? statsIT.total_minutes || 0 : 0);
  var totalWords = (statsEN ? statsEN.total_words || 0 : 0) + (statsIT ? statsIT.total_words || 0 : 0);

  var sEl = document.getElementById('heroSessions');
  var mEl = document.getElementById('heroMinutes');
  var wEl = document.getElementById('heroWords');
  if (sEl) sEl.textContent = formatNumber(totalSessions);
  if (mEl) mEl.textContent = formatNumber(totalMinutes);
  if (wEl) wEl.textContent = formatNumber(totalWords);
}

async function refreshChart() {
  var chartEl = document.getElementById('dailyChart');
  if (!chartEl) return;

  try {
    var sb = getSupabase();
    if (!sb) { chartEl.innerHTML = '<p style="color:var(--text-faint);text-align:center;width:100%;padding:40px">Accedi per vedere il grafico</p>'; return; }

    var since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    var resp = await sb.from('sessions')
      .select('created_at, duration_seconds')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (resp.error) throw resp.error;

    var sessions = resp.data || [];
    var days = {};
    for (var i = 0; i < 14; i++) {
      var d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
      var key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }

    sessions.forEach(function (s) {
      var key = s.created_at ? s.created_at.slice(0, 10) : null;
      if (key && days[key] !== undefined) days[key] += Math.round((s.duration_seconds || 0) / 60);
    });

    var values = Object.values(days);
    var maxVal = Math.max.apply(null, values.concat([1]));

    var isEn = window.I18n && window.I18n.getLang && window.I18n.getLang() === 'en';
    var dayLabels = isEn ? ['6d', '5d', '4d', '3d', '2d', 'yest', 'today'] : ['6g', '5g', '4g', '3g', '2g', 'ieri', 'oggi'];

    chartEl.innerHTML = values.map(function (v, i) {
      var h = maxVal > 0 ? Math.max(4, (v / maxVal) * 140) : 4;
      var isToday = i === values.length - 1;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">' +
        '<span style="font-size:10px;font-weight:600;color:var(--text-soft)">' + (v || '') + '</span>' +
        '<div class="bar" style="width:100%;max-width:32px;height:' + h + 'px;background:' + (isToday ? 'var(--cyan)' : 'var(--cyan)') + ';opacity:' + (isToday ? '1' : '.4') + ';border-radius:6px 6px 0 0;transition:height .3s" title="' + v + ' min"></div>' +
        '<span style="font-size:9px;color:var(--text-soft);opacity:.6">' + dayLabels[Math.floor(i / 2)] + '</span>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.warn('Chart load failed:', e.message);
    chartEl.innerHTML = '<p style="color:var(--text-faint);text-align:center;width:100%;padding:40px">Dati non disponibili</p>';
  }
}

async function refreshMetrics() {
  var row = document.getElementById('metricsRow');
  if (!row) return;

  var statsEN = window.statsEN || {};
  var statsIT = window.statsIT || {};

  var metrics = [
    { icon: 'speed', label: 'WPM medio', value: statsEN.avg_wpm || statsIT.avg_wpm || '—', suffix: '' },
    { icon: 'translate', label: 'Diversità lessicale', value: statsEN.avg_lexical_diversity || statsIT.avg_lexical_diversity || '—', suffix: '%' },
    { icon: 'auto_awesome', label: 'Livello CEFR', value: statsEN.cefr_level || statsIT.cefr_level || '—', suffix: '' },
    { icon: 'trending_up', label: 'Sessioni questa settimana', value: statsEN.week_sessions || statsIT.week_sessions || 0, suffix: '' }
  ];

  row.innerHTML = metrics.map(function (m) {
    var v = typeof m.value === 'number' ? formatNumber(m.value) : m.value;
    return '<div class="metric-card" style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:6px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="material-symbols-outlined" style="font-size:20px;color:var(--cyan)">' + m.icon + '</span>' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-soft);text-transform:uppercase;letter-spacing:.03em">' + m.label + '</span>' +
      '</div>' +
      '<div style="font-size:28px;font-weight:800;color:var(--text);font-family:Manrope,sans-serif">' + v + (m.suffix ? '<span style="font-size:16px;font-weight:500;opacity:.6">' + m.suffix + '</span>' : '') + '</div>' +
      '</div>';
  }).join('');

  // Apply i18n
  if (typeof I18n !== 'undefined' && I18n.apply) { I18n.apply(row); }
}
