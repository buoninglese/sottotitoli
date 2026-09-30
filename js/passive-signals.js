/* ═══ Passive Signals — extract + fold live-caption evidence into the profile ═══
 * The "observed beats predicted" layer. Sottotitoli already generates WPM,
 * transcripts, and per-segment timing; this module turns that into continuous
 * evidence that refines the learner profile without re-running the intake.
 *
 *   SottotitoliPassiveSignals.extract(session, segments, opts) → passive object
 *   SottotitoliPassiveSignals.fold(profile, passive)          → updated profile
 *   SottotitoliPassiveSignals.applyFromRecentSessions(profile) → Promise<profile>
 *
 * Reliability gate (composite — not just a session count): signals are only
 * surfaced once the learner has enough *volume*, because WPM/hesitation/pause
 * from one short session are noise. Three thresholds must ALL be met before
 * `passive.reliable` is true, so "not enough data yet" is a real state.
 *
 * Philosophy: passive signals are EVIDENCE. fold() merges measured error
 * categories into error_focus.observed_missed, but does not silently overwrite
 * the placement-derived estimated_cefr — it records a suggested level as
 * `passive.metrics.suggested_cefr` for the planner/report to weigh.
 */
(function (w) {
  'use strict';

  /* ── Reliability thresholds (composite) ──
   * All three must be met before signals are shown. The defaults are conservative:
   * ~3 completed sessions, ~10 minutes of speech, ~800 words. */
  var MIN_SESSIONS = 3;
  var MIN_MINUTES = 10;
  var MIN_WORDS = 800;

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

  function wordCount(session, segments) {
    var t = session.transcript_text || segments.map(function (s) { return s.original_text || ''; }).join(' ');
    return tokens(t).length;
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

  /* Mean of each numeric metric across the history. */
  function aggregate(history) {
    if (!history || !history.length) return null;
    var keys = ['wpm', 'hesitation_rate', 'pause_avg_seconds', 'code_switch_ratio', 'vocab_diversity'];
    var out = {};
    keys.forEach(function (k) {
      var vals = history.map(function (h) { return h[k]; }).filter(function (v) { return typeof v === 'number' && !isNaN(v); });
      if (vals.length) out[k] = Math.round((vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) * 1000) / 1000;
    });
    out.suggested_cefr = wpmToCefr(out.wpm);
    return out;
  }

  /* Merge measured error categories into observed_missed (deduplicated). */
  function fold(profile, passive) {
    profile = profile || {};
    if (!passive) return profile;

    profile.passive = passive;

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

  /* Read recent completed sessions, build a per-session time series, and gate on
   * the composite threshold. Non-breaking: any error returns the profile
   * unchanged, and an empty/thin result leaves `passive` absent (never a
   * fabricated metric). */
  async function applyFromRecentSessions(profile, limit) {
    limit = limit || 10;
    try {
      var sb = w.sottotitoliSupabase;
      if (!sb) return profile;
      var sess = await sb.auth.getSession();
      var uid = (sess && sess.data && sess.data.session) ? sess.data.session.user.id : null;
      if (!uid) return profile;

      // Newest first, reversed immediately below. Ordering ASCENDING with a
      // limit asks the database for the OLDEST `limit` rows, so once a learner
      // passed the limit the fold froze on their first sessions forever: the
      // graph stopped moving and `reliable` could never be re-evaluated.
      var r = await sb.from('sessions')
        .select('id,transcript_text,wpm,duration_seconds,created_at')
        .eq('user_id', uid)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (r.error || !r.data || !r.data.length) return profile;

      // Back to oldest → newest: this series is plotted, so it must run forwards.
      var rows = r.data.slice().reverse();

      var history = [];
      var totalMinutes = 0, totalWords = 0;
      for (var i = 0; i < rows.length; i++) {
        var s = rows[i];
        var segR = await sb.from('session_segments')
          .select('original_text,start_time,end_time,confidence')
          .eq('session_id', s.id)
          .order('sequence', { ascending: true })
          .limit(500);
        var segs = segR.data || [];
        var p = extract(s, segs);
        totalMinutes += (Number(s.duration_seconds) || 0) / 60;
        totalWords += wordCount(s, segs);
        history.push({
          at: s.created_at,
          wpm: p.wpm,
          hesitation_rate: p.hesitation_rate,
          pause_avg_seconds: p.pause_avg_seconds,
          code_switch_ratio: p.code_switch_ratio,
          vocab_diversity: p.vocab_diversity,
          words: wordCount(s, segs)
        });
      }

      var reliable = rows.length >= MIN_SESSIONS && totalMinutes >= MIN_MINUTES && totalWords >= MIN_WORDS;

      profile.passive = {
        reliable: reliable,
        sessions_analyzed: rows.length,
        total_minutes: Math.round(totalMinutes),
        total_words: totalWords,
        thresholds: { sessions: MIN_SESSIONS, minutes: MIN_MINUTES, words: MIN_WORDS },
        metrics: aggregate(history),
        history: history
      };

      return profile;
    } catch (e) {
      return profile;
    }
  }

  w.SottotitoliPassiveSignals = {
    extract: extract,
    fold: fold,
    aggregate: aggregate,
    applyFromRecentSessions: applyFromRecentSessions,
    thresholds: { sessions: MIN_SESSIONS, minutes: MIN_MINUTES, words: MIN_WORDS }
  };
})(window);
