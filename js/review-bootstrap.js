/**
 * review-bootstrap.js — Wire review subsystem into the dashboard.
 * Load after Supabase/auth are ready.
 */

import { hydrateReviewWords, hydrateReviewQueues, setDashboardMetrics } from './review-store.js';
import { buildStandardQueues, buildAIQueues, computeDashboardMetrics } from './review-engine.js';
import { mountReviewDashboard } from './review-ui.js';
import { refreshReviewDashboard } from './review-api.js';

export async function initReviewDashboard() {
  var root = document.getElementById('reviewDashboardMount');
  if (!root) return;

  try {
    var data = await refreshReviewDashboard();
    var words = data.words || [];
    var customQueues = data.customQueues || [];
    var aiQueues = data.aiQueues || [];

    var standardQueues = buildStandardQueues(words);
    var generatedAiQueues = buildAIQueues(words, [], []);
    var mergedQueues = standardQueues.concat(generatedAiQueues).concat(customQueues).concat(aiQueues);

    hydrateReviewWords(words);
    hydrateReviewQueues(mergedQueues);

    var metrics = computeDashboardMetrics(words);
    if (data.dashboard && data.dashboard.metrics) {
      Object.assign(metrics, data.dashboard.metrics);
    }
    setDashboardMetrics(metrics);

    mountReviewDashboard(root);
  } catch (e) {
    console.warn('Review dashboard init failed (maybe not logged in):', e.message);
    if (root) {
      root.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)">' +
        '<div style="font-size:48px;margin-bottom:12px">🔒</div>' +
        '<h3 style="color:var(--text-soft);margin-bottom:6px">Accedi per vedere il riepilogo</h3>' +
        '<p style="font-size:14px">Il sistema di ripasso è disponibile dopo l\'accesso.</p>' +
        '</div>';
    }
  }
}

window.initReviewDashboard = initReviewDashboard;
