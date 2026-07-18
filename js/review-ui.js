/**
 * review-ui.js — Dashboard rendering: KPI cards, queue cards, fallback table.
 * Renders from review-store.js state. No direct Supabase calls.
 */

import {
  subscribeReviewState,
  selectDashboardMetrics,
  selectAllQueues,
  selectAllWords
} from './review-store.js';
import { openReviewSession } from './review-session.js';

var rootRef = null;
var unsubscribe = null;

export function mountReviewDashboard(rootEl) {
  rootRef = rootEl;
  if (!rootRef) return;

  // Hide classic fallback now that review subsystem is active
  var fallback = document.getElementById('wbReviewClassicFallback');
  if (fallback) fallback.style.display = 'none';

  if (unsubscribe) unsubscribe();
  unsubscribe = subscribeReviewState(function () {
    renderReviewDashboard();
  });

  renderReviewDashboard();
  bindReviewDashboardEvents(rootRef);
}

export function renderReviewDashboard() {
  if (!rootRef) return;

  var metrics = selectDashboardMetrics();
  var queues = selectAllQueues();
  var words = selectAllWords();

  rootRef.innerHTML =
    '<section class="review-dashboard">' +
    renderReviewMetrics(metrics) +
    '<div class="review-primary-actions">' +
    '<button type="button" class="primary-btn" data-open-queue="due_all" data-mode="review" style="font-family:var(--font-ui);font-size:16px;padding:14px 28px">Ripassa tutto</button>' +
    '</div>' +
    renderReviewQueueCards(queues) +
    renderReviewTable(words) +
    '</section>';
}

export function renderReviewMetrics(metrics) {
  if (!metrics) metrics = {};
  var items = [
    { v: metrics.scheduled_today, l: 'In programma oggi' },
    { v: metrics.overdue, l: 'Scadute', urgent: metrics.overdue > 0 },
    { v: metrics.reviewed_today, l: 'Ripassate oggi' },
    { v: metrics.mastered, l: 'Padroneggiate' },
    { v: metrics.in_queue_now, l: 'In coda ora' },
    { v: metrics.unstable_new, l: 'Nuove instabili' },
    { v: metrics.fragile, l: 'Fragili' },
    { v: metrics.estimated_minutes_today, l: 'Minuti stimati', suffix: 'min' }
  ];

  return '<div class="stats-row" style="grid-template-columns:repeat(' + items.length + ',1fr);margin-bottom:0">' +
    items.map(function (item) {
      return '<div class="metric-card amber" style="min-height:70px;padding:12px 14px">' +
        '<div class="metric-label" style="margin-bottom:2px">' + item.l + '</div>' +
        '<div class="metric-value" style="font-size:24px;' + (item.urgent ? 'color:var(--amber)' : '') + '">' +
        item.v + (item.suffix || '') +
        '</div></div>';
    }).join('') +
    '</div>';
}

export function renderReviewQueueCards(queues) {
  if (!queues || !queues.length) {
    return '<div class="review-empty-state" style="text-align:center;padding:40px 20px;color:var(--text-faint)">' +
      '<div style="font-size:48px;margin-bottom:12px">🎉</div>' +
      '<h3 style="color:var(--text-soft)">Tutto in ordine</h3>' +
      '<p style="font-size:14px">Nessuna parola da ripassare ora.</p>' +
      '</div>';
  }

  // Colour schemes — one per queue type
  var palettes = {
    due_all:       { grad: 'rgba(6,182,212,.16),rgba(8,145,178,.09),rgba(6,182,212,.05)', border: 'rgba(6,182,212,.22)', accent: '#06b6d4', icon: 'fa-solid fa-layer-group', label: 'RIPASSA TUTTO' },
    due_verbs:     { grad: 'rgba(192,132,252,.16),rgba(99,102,241,.09),rgba(192,132,252,.05)', border: 'rgba(192,132,252,.22)', accent: '#c084fc', icon: 'fa-solid fa-bolt', label: 'VERBI' },
    due_adjectives:{ grad: 'rgba(59,130,246,.16),rgba(37,99,235,.09),rgba(59,130,246,.05)', border: 'rgba(59,130,246,.22)', accent: '#3b82f6', icon: 'fa-solid fa-paintbrush', label: 'AGGETTIVI' },
    due_nouns:     { grad: 'rgba(20,184,166,.16),rgba(13,148,136,.09),rgba(20,184,166,.05)', border: 'rgba(20,184,166,.22)', accent: '#14b8a6', icon: 'fa-solid fa-cube', label: 'SOSTANTIVI' },
    due_saved:     { grad: 'rgba(245,158,11,.16),rgba(217,119,6,.09),rgba(245,158,11,.05)', border: 'rgba(245,158,11,.22)', accent: '#f59e0b', icon: 'fa-solid fa-bookmark', label: 'SALVATE' },
    due_new:       { grad: 'rgba(16,185,129,.16),rgba(5,150,105,.09),rgba(16,185,129,.05)', border: 'rgba(16,185,129,.22)', accent: '#10b981', icon: 'fa-solid fa-seedling', label: 'NUOVE' },
    default:       { grad: 'rgba(192,132,252,.16),rgba(99,102,241,.09),rgba(192,132,252,.05)', border: 'rgba(192,132,252,.22)', accent: '#c084fc', icon: 'fa-solid fa-crown', label: 'RIPASSO' }
  };
  var aiPalette = { grad: 'rgba(244,114,182,.16),rgba(225,29,72,.09),rgba(244,114,182,.05)', border: 'rgba(244,114,182,.22)', accent: '#f472b6', icon: 'fa-solid fa-robot', label: 'AI' };

  return '<div class="rv-grid">' +
    queues.map(function (q) {
      var p = q.type === 'ai' ? aiPalette : (palettes[q.id] || palettes['default']);
      var urgencyLabel = q.urgency === 'high' ? '⚠ Urgente' : q.urgency === 'medium' ? 'In scadenza' : 'In programma';
      var urgencyChipColor = q.urgency === 'high' ? '#f59e0b' : q.urgency === 'medium' ? '#06b6d4' : p.accent;

      return '<div class="rv-panel" data-open-queue="' + q.id + '" data-mode="review" style="cursor:pointer">' +
        // ── Main gradient banner ──
        '<div class="rv-banner" style="background:linear-gradient(135deg,' + p.grad + ');border-color:' + p.border + '">' +
          '<div class="rv-banner-row1">' +
            '<i class="' + p.icon + '" style="color:' + p.accent + ';opacity:.85;font-size:26px"></i>' +
            '<span>' + q.title + ' · ' + p.label + '</span>' +
          '</div>' +
          '<div class="rv-banner-huge-wrap">' +
            '<span class="rv-banner-huge" style="color:' + p.accent + '">' + q.item_count + '</span>' +
            '<span class="rv-banner-of">parole</span>' +
          '</div>' +
          '<div class="rv-banner-bottom">' +
            '<span class="rv-banner-chip" style="color:' + urgencyChipColor + ';background-color:' + urgencyChipColor + '1a;border-color:' + urgencyChipColor + '33">' + urgencyLabel + '</span>' +
            '<span class="rv-banner-dl"><i class="fa-regular fa-clock"></i> ~' + q.estimated_minutes + ' min</span>' +
          '</div>' +
        '</div>' +
        // ── Streak / secondary bar ──
        '<div class="rv-streak" style="background:linear-gradient(135deg,' + p.accent + '0f,' + p.accent + '05);border-color:' + p.accent + '22">' +
          '<span class="rv-streak-icon" style="color:' + p.accent + '"><i class="fa-solid fa-arrow-right"></i></span>' +
          '<div class="rv-streak-body">' +
            '<span class="rv-streak-label">' + q.rationale + '</span>' +
            '<div class="rv-streak-actions">' +
              '<span class="rv-streak-cta" style="color:' + p.accent + '">Ripassa</span>' +
              '<span class="rv-streak-cta" style="color:' + p.accent + ';opacity:.6">o Testa</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '</div>';
    }).join('') +
    '</div>';
}

export function renderReviewTable(words) {
  if (!words || !words.length) return '';

  return '<div class="wb-table-wrap" style="margin-top:20px">' +
    '<table class="wb-table" style="width:100%;border-collapse:collapse;font-family:var(--font-ui)">' +
    '<thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint)">' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">Parola</th>' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">CEFR</th>' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">POS</th>' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">Ultimo ripasso</th>' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">Intervallo</th>' +
    '<th style="padding:6px 10px;border-bottom:2px solid var(--line-strong)">Stato</th>' +
    '</tr></thead>' +
    '<tbody>' +
    words.map(function (word) {
      var lastReview = word.last_reviewed_at
        ? new Date(word.last_reviewed_at).toLocaleDateString('it-IT')
        : '—';
      return '<tr style="font-size:13px;color:var(--text-soft)">' +
        '<td style="padding:8px 10px;font-weight:600;color:var(--text)">' + (word.lemma || '') + '</td>' +
        '<td style="padding:8px 10px">' + (word.cefr || '') + '</td>' +
        '<td style="padding:8px 10px">' + (word.pos || '') + '</td>' +
        '<td style="padding:8px 10px">' + lastReview + '</td>' +
        '<td style="padding:8px 10px">' + (word.interval_days || 0) + 'g</td>' +
        '<td style="padding:8px 10px">' + (word.review_state || '') + '</td>' +
        '</tr>';
    }).join('') +
    '</tbody>' +
    '</table>' +
    '</div>';
}

export function bindReviewDashboardEvents(rootEl) {
  rootEl.addEventListener('click', async function (event) {
    // Don't intercept clicks on buttons/inputs inside the cards
    if (event.target.closest('button') || event.target.closest('input')) return;

    var panel = event.target.closest('.rv-panel[data-open-queue]');
    if (!panel) return;

    var queueId = panel.getAttribute('data-open-queue');
    var mode = panel.getAttribute('data-mode') || 'review';
    await openQueue(queueId, mode);
  });
}

export async function openQueue(queueId, mode) {
  mode = mode || 'review';
  await openReviewSession(queueId, mode);
}

export function refreshReviewUI() {
  renderReviewDashboard();
}
