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

  return '<div class="review-queue-grid alt-card-grid" style="margin-top:16px">' +
    queues.map(function (queue) {
      return '<article class="alt-card review-queue-card" data-urgency="' + queue.urgency + '" style="padding:18px 20px">' +
        '<h3 style="margin:0 0 6px;font-size:15px">' + queue.title + '</h3>' +
        '<p style="margin:0 0 10px;font-size:12px;color:var(--text-soft)">' + queue.rationale + '</p>' +
        '<div style="display:flex;gap:12px;font-size:12px;color:var(--text-faint);margin-bottom:12px">' +
        '<span>' + queue.item_count + ' parole</span>' +
        '<span>~' + queue.estimated_minutes + ' min</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button type="button" class="fchip" data-open-queue="' + queue.id + '" data-mode="review" style="font-size:12px;padding:6px 14px;font-family:var(--font-ui)">Ripassa</button>' +
        '<button type="button" class="fchip" data-open-queue="' + queue.id + '" data-mode="test_typing" style="font-size:12px;padding:6px 14px;font-family:var(--font-ui)">Testa</button>' +
        '</div>' +
        '</article>';
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
    var btn = event.target.closest('[data-open-queue]');
    if (!btn) return;

    var queueId = btn.getAttribute('data-open-queue');
    var mode = btn.getAttribute('data-mode') || 'review';
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
