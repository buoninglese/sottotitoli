/* ═══ Passive Signals — extract + fold live-caption evidence into the profile ═══
 * The "observed beats predicted" layer. Sottotitoli already generates WPM,
 * transcripts, and per-segment timing; this module turns that into continuous
 * evidence that refines the learner profile without re-running the intake.
 *
 *   SottotitoliPassiveSignals.extract(session, segments, opts) → passive object
 *   SottotitoliPassiveSignals.fold(profile, passive)          → updated profile
 *   SottotitoliPassiveSignals.applyFromRecentSessions(profile) → Promise<profile>
 *
 * Signals (see enrichment/taxonomy/passive-signals.yaml):
 *   wpm, hesitation_rate, pause_avg_seconds, code_switch_ratio, vocab_diversity,
 *   error_categories (external — from generate-grammar-report / grammar-viz).
 *
 * Philosophy: passive signals are EVIDENCE. fold() merges them into the profile
 * and adds measured error categories to error_focus.observed_missed, but does
 * not silently overwrite the placement-derived estimated_cefr — it records a
 * suggested level as `passive.suggested_cefr` for the planner/report to weigh.
 */
(function (w) {
  'use strict';

  /* Small unambiguous Italian function-word list for code-switch detection
   * (target language English). Conservative by design — only function words a
   * learner would rarely produce as English. */
  var L1_FUNCTION_WORDS = [
    'che', 'per', 'ma', 'e', 'con', 'sono', 'come', 'cosa', 'perché', 'perche',
    'però', 'pero', 'anche', 'molto', 'bene', 'così', 'cosi', 'qui', 'questa',
    'questo', 'dove', 'quando', 'allora', 'adesso', 'sempre', 'mai', 'già',
    'gia', 'senza', 'dopo', 'prima', 'quindi', 'infatti', 'forse', 'tanto'
  ];

  function tokens(text) {
    return String(text || '').toLowerCase().replace(/[^a-zàèéìòù'']+/g, ' ').split(/\s+/).filter(Boolean);
  }

  function extract(session, segments, opts) {
    opts = opts || {};
    session = session || {};
    segments = segments || [];

    var transcript = session.transcript_text || '';
    if (!transcript) {
      transcript = segments.map(function (s) { return s.original_text || ''; }).join(' ');
    }
    var words = tokens(transcript);
    var total = words.length;

    // WPM — prefer the stored value, else estimate from transcript + duration.
    var wpm = Number(session.wpm) || 0;
    if (!wpm && session.duration_seconds && total) {
      wpm = Math.round(total / (session.duration_seconds / 60));
    }

    // Hesitation markers per 100 words.
    var hesitations = 0;
    var hesRe = /\b(uh|um|erm|er|ehm|hmm|ah)\b/gi;
    var m;
    var lower = transcript.toLowerCase();
    while ((m = hesRe.exec(lower)) !== null) hesitations++;
    var hesitationRate = total ? Math.round((hesitations / total) * 100) : 0;

    // Silent pause length — average positive gap between consecutive segments.
    var gaps = [];
    for (var i = 1; i < segments.length; i++) {
      var prevEnd = Number(segments[i - 1].end_time);
      var curStart = Number(segments[i].start_time);
      if (!isNaN(prevEnd) && !isNaN(curStart) && curStart > prevEnd) {
        gaps.push(curStart - prevEnd);
      }
    }
    var pauseAvg = gaps.length
      ? Math.round((gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length) * 100) / 100
      : 0;

    // Code-switching — L1 insertions / total tokens.
    var l1Count = 0;
    words.forEach(function (wd) {
      if (L1_FUNCTION_WORDS.indexOf(wd) !== -1) l1Count++;
    });
    var codeSwitchRatio = total ? Math.round((l1Count / total) * 1000) / 1000 : 0;

    // Vocabulary diversity — type/token ratio.
    var unique = {};
    words.forEach(function (wd) { unique[wd] = true; });
    var vocabDiversity = total ? Math.round((Object.keys(unique).length / total) * 1000) / 1000 : 0;

    return {
      wpm: wpm,
      hesitation_rate: hesitationRate,
      pause_avg_seconds: pauseAvg,
      code_switch_ratio: codeSwitchRatio,
      vocab_diversity: vocabDiversity,
      error_categories: (opts.errorCategories || []).slice(),
      suggested_cefr: wpmToCefr(wpm),
      recorded_at: new Date().toISOString()
    };
  }

  function wpmToCefr(wpm) {
    if (!wpm) return null;
    if (wpm < 60) return 'A2';
    if (wpm < 90) return 'B1';
    if (wpm < 120) return 'B2';
    return 'C1';
  }

  function fold(profile, passive) {
    profile = profile || {};
    if (!passive) return profile;

    profile.passive = passive;

    // Fold measured error categories into observed_missed (deduplicated). These
    // are observed evidence, so they join the placement misses — never the
    // L1-predicted list.
    if (passive.error_categories && passive.error_categories.length) {
      profile.derived = profile.derived || {};
      profile.derived.error_focus = profile.derived.error_focus || { observed_missed: [], predicted_l1: [] };
      var observed = profile.derived.error_focus.observed_missed || [];
      passive.error_categories.forEach(function (cat) {
        if (cat && observed.indexOf(cat) === -1) observed.push(cat);
      });
      profile.derived.error_focus.observed_missed = observed;
    }

    return profile;
  }

  /* Read recent completed sessions + their segments and fold their signals into
   * the profile. Auth convention mirrors the rest of the app. Non-breaking: any
   * error returns the profile unchanged. */
  async function applyFromRecentSessions(profile, limit) {
    limit = limit || 5;
    try {
      var sb = w.sottotitoliSupabase;
      if (!sb) return profile;
      var sess = await sb.auth.getSession();
      var uid = (sess && sess.data && sess.data.session) ? sess.data.session.user.id : null;
      if (!uid) return profile;

      var r = await sb.from('sessions')
        .select('id,transcript_text,wpm,duration_seconds')
        .eq('user_id', uid)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (r.error || !r.data || !r.data.length) return profile;

      // Fold across the most recent sessions, newest last so it wins.
      for (var i = r.data.length - 1; i >= 0; i--) {
        var s = r.data[i];
        var segR = await sb.from('session_segments')
          .select('original_text,start_time,end_time,confidence')
          .eq('session_id', s.id)
          .order('sequence', { ascending: true })
          .limit(500);
        var segs = (segR.data || []);
        var passive = extract(s, segs);
        fold(profile, passive);
      }
      return profile;
    } catch (e) {
      return profile;
    }
  }

  w.SottotitoliPassiveSignals = {
    extract: extract,
    fold: fold,
    applyFromRecentSessions: applyFromRecentSessions
  };
})(window);
