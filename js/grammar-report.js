/* ═══ Grammar Report — generate the 2-credit synthesis report ═══
 * Triggered from the Grammatica panel (pnl-grammatica). Builds the report context
 * from the learner's profile (onboarding + questionnaire, basis='grammatica'),
 * charges 2 credits, enqueues module_key='15', polls session_ai_reports for the
 * completed report, and renders it inline.
 *
 *   SottotitoliGrammarReport.generate(profile, container)
 *
 * Billing mirrors js/panoramica-reportai.js: charge via deduct_tokens RPC first,
 * then insert; refund via refund_report_credits on failure.
 */
(function (w) {
  'use strict';

  var MODULE_KEY = '15';
  var CREDITS = 2;

  function sb() { return w.sottotitoliSupabase; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Minimal markdown → HTML. Good enough for the LLM's structured Italian report. */
  function mdToHtml(md) {
    var lines = String(md || '').split(/\r?\n/);
    var out = [];
    var list = null; // 'ul' | 'ol'
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m;
      if ((m = line.match(/^\s*###\s+(.*)$/))) { closeList(); out.push('<h3>' + inline(m[1]) + '</h3>'); }
      else if ((m = line.match(/^\s*##\s+(.*)$/))) { closeList(); out.push('<h2>' + inline(m[1]) + '</h2>'); }
      else if ((m = line.match(/^\s*#\s+(.*)$/))) { closeList(); out.push('<h1>' + inline(m[1]) + '</h1>'); }
      else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if (line.trim() === '') { closeList(); }
      else { closeList(); out.push('<p>' + inline(line) + '</p>'); }
    }
    closeList();
    return out.join('');
  }

  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderProcessing(container) {
    container.innerHTML =
      '<div class="gi-card gi-center">' +
        '<div class="gi-kicker">Report</div>' +
        '<h2 class="gi-title">Generazione in corso…</h2>' +
        '<p class="gi-sub">Sto scrivendo il tuo report. Può richiedere fino a un minuto.</p>' +
      '</div>';
  }

  function renderReport(container, text) {
    container.innerHTML =
      '<div class="gi-result">' +
        '<button class="gi-btn gi-btn-ghost" data-act="back-from-report"><i class="fa-solid fa-arrow-left"></i> Torna al piano</button>' +
        '<div class="gr-report">' + mdToHtml(text) + '</div>' +
      '</div>';
  }

  function renderError(container, msg) {
    container.innerHTML =
      '<div class="gi-card gi-center">' +
        '<div class="gi-kicker">Report</div>' +
        '<h2 class="gi-title">Non è stato possibile generare il report</h2>' +
        '<p class="gi-sub">' + esc(msg) + '</p>' +
        '<button class="gi-btn gi-btn-ghost" data-act="back-from-report">Torna al piano</button>' +
      '</div>';
  }

  async function generate(profile, container) {
    if (!container) return;
    renderProcessing(container);
    var client = sb();
    if (!client) { renderError(container, 'Effettua il login per generare il report.'); return; }

    var r = await client.auth.getSession();
    if (!r.data || !r.data.session) { renderError(container, 'Sessione scaduta. Rieffettua il login.'); return; }
    var uid = r.data.session.user.id;

    // Build context from the persisted profile + onboarding, basis='grammatica'.
    var context = null;
    if (w.SottotitoliGrammarReportContext) {
      var onboarding = {};
      try { onboarding = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}'); } catch (e) {}
      context = w.SottotitoliGrammarReportContext.build(profile || {}, onboarding, 'grammatica');
    }

    // Credit check.
    var balance = 0;
    try {
      var tb = await client.rpc('get_token_balance', { p_user_id: uid });
      if (tb.data !== null && tb.data !== undefined) balance = tb.data;
    } catch (e) { /* fall back below */ }
    if (balance === 0) {
      try {
        var tr = await client.from('user_tokens').select('balance').eq('user_id', uid).single();
        if (!tr.error && tr.data) balance = tr.data.balance;
      } catch (e2) {}
    }
    if (balance < CREDITS) {
      renderError(container, 'Crediti insufficienti. Hai ' + balance + ' crediti, servono ' + CREDITS + '.');
      return;
    }

    // Charge.
    var chargeRef = 'report_synthesis_' + Date.now();
    try {
      var deduct = await client.rpc('deduct_tokens', { p_user_id: uid, p_amount: CREDITS, p_reference: chargeRef });
      if (deduct.error || !deduct.data || deduct.data.success !== true) {
        renderError(container, 'Impossibile scalare i crediti. Riprova.');
        return;
      }
    } catch (e) {
      renderError(container, 'Impossibile scalare i crediti. Riprova.');
      return;
    }

    // Enqueue.
    var ins = await client.from('ai_report_requests').insert({
      user_id: uid,
      session_ids: [],
      module_key: MODULE_KEY,
      scope_type: 'single_session',
      status: 'queued',
      tokens_spent: CREDITS,
      context: context
    });
    if (ins.error) {
      try { await client.rpc('refund_report_credits', { p_user_id: uid, p_amount: CREDITS, p_reference: chargeRef }); } catch (e) {}
      renderError(container, 'Errore durante la richiesta: ' + ins.error.message + '. Crediti riaccreditati.');
      return;
    }

    // Poll for the completed report (module_id = 15).
    var polls = 0;
    var interval = setInterval(async function () {
      polls++;
      try {
        var check = await client.from('session_ai_reports')
          .select('id,summary,summary_text,status')
          .eq('user_id', uid)
          .eq('module_id', 15)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1);
        if (check.data && check.data.length) {
          clearInterval(interval);
          renderReport(container, check.data[0].summary_text || check.data[0].summary || '');
        }
      } catch (e) {}
      if (polls >= 30) { // ~60s
        clearInterval(interval);
        renderError(container, 'Il report è ancora in elaborazione. Controlla "I miei Report" tra poco.');
      }
    }, 2000);
  }

  w.SottotitoliGrammarReport = { generate: generate };
})(window);
