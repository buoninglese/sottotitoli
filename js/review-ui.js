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

  // Color scheme per queue type (matches #05 Gradient Banner style)
  var schemes = {
    due_all:      { grad: 'rgba(6,182,212,.15),rgba(8,145,178,.08),rgba(6,182,212,.04)', border: 'rgba(6,182,212,.2)', accent: '#06b6d4', icon: 'fa-solid fa-layer-group' },
    due_verbs:    { grad: 'rgba(192,132,252,.15),rgba(99,102,241,.08),rgba(192,132,252,.04)', border: 'rgba(192,132,252,.2)', accent: '#c084fc', icon: 'fa-solid fa-bolt' },
    due_adjectives:{ grad: 'rgba(59,130,246,.15),rgba(37,99,235,.08),rgba(59,130,246,.04)', border: 'rgba(59,130,246,.2)', accent: '#3b82f6', icon: 'fa-solid fa-paint-brush' },
    due_nouns:    { grad: 'rgba(20,184,166,.15),rgba(13,148,136,.08),rgba(20,184,166,.04)', border: 'rgba(20,184,166,.2)', accent: '#14b8a6', icon: 'fa-solid fa-cube' },
    due_saved:    { grad: 'rgba(245,158,11,.15),rgba(217,119,6,.08),rgba(245,158,11,.04)', border: 'rgba(245,158,11,.2)', accent: '#f59e0b', icon: 'fa-solid fa-bookmark' },
    due_new:      { grad: 'rgba(16,185,129,.15),rgba(5,150,105,.08),rgba(16,185,129,.04)', border: 'rgba(16,185,129,.2)', accent: '#10b981', icon: 'fa-solid fa-seedling' },
    default:      { grad: 'rgba(192,132,252,.15),rgba(99,102,241,.08),rgba(192,132,252,.04)', border: 'rgba(192,132,252,.2)', accent: '#c084fc', icon: 'fa-solid fa-crown' }
  };
  var aiScheme = { grad: 'rgba(244,114,182,.15),rgba(225,29,72,.08),rgba(244,114,182,.04)', border: 'rgba(244,114,182,.2)', accent: '#f472b6', icon: 'fa-solid fa-robot' };

  return '<div class="rv-queue-grid">' +
    queues.map(function (queue) {
      var s = queue.type === 'ai' ? aiScheme : (schemes[queue.id] || schemes['default']);
      var urgencyColor = queue.urgency === 'high' ? '#f59e0b' : queue.urgency === 'medium' ? '#06b6d4' : 'rgba(255,255,255,.25)';
      return '<article class="rv-banner" style="background:linear-gradient(135deg,' + s.grad + ');border-color:' + s.border + '">' +
        // Row 1: icon + title
        '<div class="rv-row1"><i class="' + s.icon + '" style="color:' + s.accent + ';opacity:.85"></i><span>' + queue.title + '</span></div>' +
        // Row 2: big count + detail
        '<div class="rv-huge-wrap"><span class="rv-huge" style="color:' + s.accent + '">' + queue.item_count + '</span><span class="rv-of">parole</span></div>' +
        // Row 3: meta chips
        '<div class="rv-bottom">' +
          '<span class="rv-chip" style="color:' + urgencyColor + ';background:' + urgencyColor.replace(')',',.12)').replace('rgb','rgba') + ';border-color:' + urgencyColor.replace(')',',.2)').replace('rgb','rgba') + '">' +
            (queue.urgency === 'high' ? '⚠ Urgente' : queue.urgency === 'medium' ? 'In scadenza' : 'In programma') +
          '</span>' +
          '<span class="rv-dl"><i class="fa-regular fa-clock"></i> ~' + queue.estimated_minutes + ' min</span>' +
          '<span class="rv-dl" style="margin-left:auto;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + queue.rationale + '</span>' +
        '</div>' +
        // Row 4: CTA buttons
        '<div class="rv-actions">' +
          '<button type="button" class="rv-btn rv-btn-primary" data-open-queue="' + queue.id + '" data-mode="review" style="background:' + s.accent + ';border-color:' + s.accent + '">Ripassa</button>' +
          '<button type="button" class="rv-btn" data-open-queue="' + queue.id + '" data-mode="test_typing" style="border-color:' + s.accent + ';color:' + s.accent + '">Testa</button>' +
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
