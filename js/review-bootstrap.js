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
    var sb = window.sottotitoliSupabase;
    if (!sb || typeof sb.auth === 'undefined') {
      throw new Error('AUTH_MISSING');
    }
    var sessionResp = await sb.auth.getSession();
    if (!sessionResp.data || !sessionResp.data.session) {
      throw new Error('AUTH_MISSING');
    }

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
    console.warn('Review dashboard init postponed:', e.message);
  }
}

window.initReviewDashboard = initReviewDashboard;
