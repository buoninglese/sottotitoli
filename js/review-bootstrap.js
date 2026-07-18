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

  function showStatus(msg, isError) {
    var fb = document.getElementById('wbReviewClassicFallback');
    if (fb) {
      fb.style.display = 'block';
      fb.insertAdjacentHTML('beforebegin', '<div class="rv-debug" style="padding:12px 18px;margin-bottom:12px;background:' + (isError ? 'rgba(220,38,38,.1)' : 'rgba(6,182,212,.1)') + ';border:1px solid ' + (isError ? 'rgba(220,38,38,.25)' : 'rgba(6,182,212,.25)') + ';border-radius:12px;font-size:13px;font-family:var(--font-ui);color:' + (isError ? '#dc2626' : 'var(--cyan)') + '"><strong>' + (isError ? '✗' : '→') + '</strong> ' + msg + '</div>');
    }
  }

  try {
    showStatus('Controllo autenticazione…');
    var sb = window.sottotitoliSupabase;
    if (!sb || typeof sb.auth === 'undefined') {
      throw new Error('AUTH_MISSING: Supabase client non trovato');
    }
    var sessionResp = await sb.auth.getSession();
    if (!sessionResp.data || !sessionResp.data.session) {
      throw new Error('AUTH_MISSING: nessuna sessione attiva');
    }
    showStatus('Autenticazione OK — caricamento dashboard…');

    var data = await refreshReviewDashboard();
    showStatus('Dati ricevuti: ' + (data.words ? data.words.length : 0) + ' parole, dashboard OK');

    var words = data.words || [];
    var customQueues = data.customQueues || [];
    var aiQueues = data.aiQueues || [];

    var standardQueues = buildStandardQueues(words);
    var generatedAiQueues = buildAIQueues(words, [], []);
    var mergedQueues = standardQueues.concat(generatedAiQueues).concat(customQueues).concat(aiQueues);
    showStatus('Code generate: ' + mergedQueues.length + ' — rendering…');

    hydrateReviewWords(words);
    hydrateReviewQueues(mergedQueues);

    var metrics = computeDashboardMetrics(words);
    if (data.dashboard && data.dashboard.metrics) {
      Object.assign(metrics, data.dashboard.metrics);
    }
    setDashboardMetrics(metrics);

    mountReviewDashboard(root);
    showStatus('Dashboard montata con successo ✓');
    // Clean up debug messages after 3s
    setTimeout(function() {
      var debugs = document.querySelectorAll('.rv-debug');
      for (var i = 0; i < debugs.length; i++) debugs[i].remove();
    }, 3000);
  } catch (e) {
    showStatus('ERRORE: ' + e.message, true);
    console.warn('Review dashboard init postponed:', e.message);
  }
}

window.initReviewDashboard = initReviewDashboard;
