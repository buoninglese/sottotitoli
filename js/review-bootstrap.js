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
    // Quick auth check first — is Supabase even available?
    var sb = window.sottotitoliSupabase;
    if (!sb || !sb.client) {
      throw new Error('AUTH_MISSING');
    }
    var sessionResp = await sb.client.auth.getSession();
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
    console.warn('Review dashboard init failed:', e.message);
    if (root) {
      var errMsg = e.message || '';
      // Distinguish: auth missing vs backend not ready vs network error
      if (errMsg === 'AUTH_MISSING' || errMsg.indexOf('Not authenticated') >= 0) {
        root.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)">' +
          '<div style="font-size:48px;margin-bottom:12px">🔒</div>' +
          '<h3 style="color:var(--text-soft);margin-bottom:6px">Accedi per vedere il riepilogo</h3>' +
          '<p style="font-size:14px">Il sistema di ripasso è disponibile dopo l\'accesso.</p>' +
          '</div>';
      } else if (errMsg.indexOf('function') >= 0 && errMsg.indexOf('does not exist') >= 0 ||
                 errMsg.indexOf('relation') >= 0 && errMsg.indexOf('does not exist') >= 0 ||
                 errMsg.indexOf('42P01') >= 0) {
        // Backend tables/RPCs not yet deployed — show setup hint
        root.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)">' +
          '<div style="font-size:48px;margin-bottom:12px">⚙️</div>' +
          '<h3 style="color:var(--text-soft);margin-bottom:6px">Review system in setup</h3>' +
          '<p style="font-size:14px;max-width:440px;margin:0 auto;line-height:1.5">Le tabelle di ripasso sono in fase di configurazione. Esegui le migrazioni Supabase per attivare il sistema.</p>' +
          '</div>';
      } else {
        // Generic fallback — try the old renderer
        root.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-faint)">' +
          '<p style="font-size:13px;margin-bottom:12px">Sistema di ripasso in caricamento…</p>' +
          '<button class="fchip" onclick="if(window.renderReviewDue)renderReviewDue()" style="font-size:12px;padding:8px 16px;font-family:var(--font-ui)">Riprova in modalità classica</button>' +
          '</div>';
      }
    }
  }
}

window.initReviewDashboard = initReviewDashboard;
