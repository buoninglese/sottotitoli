/**
 * review-engine.js — Scheduling, queue generation, SRS math.
 * Pure functions. No DOM, no network, no side effects.
 */

export function isWordDue(word, now) {
  now = now || new Date();
  if (!word || !word.next_review_at) return false;
  return new Date(word.next_review_at) <= now;
}

export function computeUrgency(word, now) {
  now = now || new Date();
  if (!word || !word.next_review_at) return 'low';
  var diff = new Date(word.next_review_at).getTime() - now.getTime();
  if (diff <= 0) return 'high';
  if (diff <= 1000 * 60 * 60 * 24) return 'medium'; // within 24h
  return 'low';
}

export function estimateQueueMinutes(wordCount, mode) {
  mode = mode || 'review';
  var divisor = mode === 'review' ? 3 : 2;
  return Math.max(1, Math.ceil(wordCount / divisor));
}

export function sortQueueWords(words) {
  if (!Array.isArray(words)) return [];
  return words.slice().sort(function (a, b) {
    var aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : Number.MAX_SAFE_INTEGER;
    var bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function buildStandardQueues(words, now) {
  now = now || new Date();
  if (!Array.isArray(words)) words = [];

  var due = words.filter(function (word) { return isWordDue(word, now); });

  function makeQueue(id, title, rationale, queueWords, filter) {
    return {
      id: id,
      type: 'standard',
      title: title,
      rationale: rationale,
      urgency: queueWords.some(function (w) { return computeUrgency(w, now) === 'high'; }) ? 'high' : 'medium',
      item_count: queueWords.length,
      estimated_minutes: estimateQueueMinutes(queueWords.length),
      word_ids: queueWords.map(function (w) { return w.id; }),
      filter: filter || null
    };
  }

  var queues = [
    makeQueue('due_all', 'Ripassa tutto', due.length + ' parole in scadenza', due, { due: true }),
    makeQueue('due_verbs', 'Ripassa verbi', 'Verbi in scadenza', due.filter(function (w) { return w.pos === 'verb'; }), { due: true, pos_in: ['verb'] }),
    makeQueue('due_adjectives', 'Ripassa aggettivi', 'Aggettivi in scadenza', due.filter(function (w) { return w.pos === 'adjective' || w.pos === 'adj'; }), { due: true, pos_in: ['adjective', 'adj'] }),
    makeQueue('due_nouns', 'Ripassa sostantivi', 'Sostantivi in scadenza', due.filter(function (w) { return w.pos === 'noun' || w.pos === 'n'; }), { due: true, pos_in: ['noun', 'n'] }),
    makeQueue('due_saved', 'Ripassa salvate', 'Parole salvate da consolidare', due.filter(function (w) { return w.is_saved; }), { due: true, saved: true }),
    makeQueue('due_new', 'Ripassa nuove', 'Parole nuove da stabilizzare', due.filter(function (w) { return w.is_new; }), { due: true, is_new: true })
  ];

  return queues.filter(function (q) { return q.item_count > 0; });
}

export function buildCustomQueue(words, filter, now) {
  now = now || new Date();
  if (!Array.isArray(words)) words = [];
  filter = filter || {};

  var filtered = words.filter(function (word) {
    if (filter.due && !isWordDue(word, now)) return false;
    if (filter.pos_in && filter.pos_in.length && filter.pos_in.indexOf(word.pos) < 0) return false;
    if (filter.topic_in && filter.topic_in.length && filter.topic_in.indexOf(word.topic) < 0) return false;
    if (filter.saved === true && !word.is_saved) return false;
    return true;
  });

  return {
    id: 'custom_' + Math.random().toString(36).substr(2, 9),
    type: 'custom',
    title: filter.title || 'Ripasso specifico',
    rationale: 'Coda personalizzata',
    urgency: filtered.some(function (w) { return computeUrgency(w, now) === 'high'; }) ? 'high' : 'medium',
    item_count: filtered.length,
    estimated_minutes: estimateQueueMinutes(filtered.length),
    word_ids: filtered.map(function (w) { return w.id; }),
    filter: filter
  };
}

export function buildAIQueues(words, profileSignals, transcriptSignals, now) {
  now = now || new Date();
  if (!Array.isArray(words)) words = [];
  profileSignals = profileSignals || [];
  transcriptSignals = transcriptSignals || [];

  var weakProduction = words.filter(function (w) {
    return (w.production_score || 0) < 40 && isWordDue(w, now);
  });
  var recentFragile = words.filter(function (w) {
    return (w.mastery_score || 0) < 40 && isWordDue(w, now);
  });
  var goalRelevant = words.filter(function (w) {
    return profileSignals.some(function (s) { return s.topic && s.topic === w.topic; });
  });

  var queues = [
    {
      id: 'ai_low_production',
      type: 'ai',
      title: 'Suggerita da AI: parole che capisci ma usi poco',
      rationale: 'Lessico fragile sul piano produttivo',
      urgency: 'high',
      item_count: weakProduction.length,
      estimated_minutes: estimateQueueMinutes(weakProduction.length, 'test'),
      word_ids: weakProduction.map(function (w) { return w.id; }),
      filter: { due: true, production_lt: 40 }
    },
    {
      id: 'ai_recent_failures',
      type: 'ai',
      title: 'Suggerita da AI: parole ancora instabili',
      rationale: 'Parole recenti con tenuta debole',
      urgency: 'medium',
      item_count: recentFragile.length,
      estimated_minutes: estimateQueueMinutes(recentFragile.length),
      word_ids: recentFragile.map(function (w) { return w.id; }),
      filter: { due: true, mastery_lt: 40 }
    },
    {
      id: 'ai_goal_relevant',
      type: 'ai',
      title: 'Suggerita da AI: lessico utile per i tuoi obiettivi',
      rationale: 'Parole coerenti con il tuo contesto',
      urgency: 'medium',
      item_count: goalRelevant.length,
      estimated_minutes: estimateQueueMinutes(goalRelevant.length),
      word_ids: goalRelevant.map(function (w) { return w.id; }),
      filter: { topic_in: profileSignals.map(function (s) { return s.topic; }).filter(Boolean) }
    }
  ];

  return queues.filter(function (q) { return q.item_count > 0; });
}

export function computeDashboardMetrics(words, now) {
  now = now || new Date();
  if (!Array.isArray(words)) words = [];

  var due = words.filter(function (w) { return isWordDue(w, now); });
  var overdue = due.filter(function (w) { return new Date(w.next_review_at) < now; });
  var mastered = words.filter(function (w) { return w.review_state === 'mastered'; });
  var unstableNew = words.filter(function (w) { return w.is_new; });
  var fragile = words.filter(function (w) { return (w.mastery_score || 0) < 40; });

  return {
    scheduled_today: due.length,
    overdue: overdue.length,
    reviewed_today: 0,
    mastered: mastered.length,
    in_queue_now: due.length,
    unstable_new: unstableNew.length,
    fragile: fragile.length,
    estimated_minutes_today: estimateQueueMinutes(due.length)
  };
}

export function normalizeGrade(input) {
  var value = String(input || '').toLowerCase();
  if (['again', 'hard', 'good', 'easy'].indexOf(value) >= 0) return value;
  return 'again';
}

export function computeNextInterval(word, grade) {
  var current = Math.max(0, Number(word.interval_days || 0));
  var ease = Math.max(1.3, Number(word.ease_factor || 2.5));

  if (grade === 'again') return 0;
  if (grade === 'hard') return Math.max(1, Math.round(Math.max(current, 1) * 1.2));
  if (grade === 'good') return Math.max(1, Math.round(Math.max(current, 1) * ease));
  if (grade === 'easy') return Math.max(2, Math.round(Math.max(current, 1) * (ease + 0.3)));
  return 1;
}

export function computeNextReviewAt(reviewedAt, intervalDays) {
  var next = new Date(reviewedAt);
  next.setDate(next.getDate() + intervalDays);
  return next.toISOString();
}

export function applySrsGrade(word, grade, reviewedAt) {
  reviewedAt = reviewedAt || new Date();
  var normalizedGrade = normalizeGrade(grade);
  var intervalDays = computeNextInterval(word, normalizedGrade);

  var easeFactor = Math.max(1.3, Number(word.ease_factor || 2.5));
  if (normalizedGrade === 'again') easeFactor = Math.max(1.3, easeFactor - 0.2);
  if (normalizedGrade === 'hard') easeFactor = Math.max(1.3, easeFactor - 0.1);
  if (normalizedGrade === 'easy') easeFactor = easeFactor + 0.1;

  var reps = Number(word.reps || 0) + (normalizedGrade === 'again' ? 0 : 1);
  var lapses = Number(word.lapses || 0) + (normalizedGrade === 'again' ? 1 : 0);

  var reviewState = word.review_state || 'new';
  if (normalizedGrade === 'again') reviewState = 'relearning';
  else if (reviewState === 'new') reviewState = 'learning';
  else if (reviewState === 'learning') reviewState = 'review';
  if (intervalDays >= 30 && (word.production_score || 0) >= 70) reviewState = 'mastered';

  return Object.assign({}, word, {
    last_result: normalizedGrade,
    last_reviewed_at: reviewedAt.toISOString(),
    next_review_at: computeNextReviewAt(reviewedAt, intervalDays),
    interval_days: intervalDays,
    ease_factor: Number(easeFactor.toFixed(2)),
    reps: reps,
    lapses: lapses,
    review_state: reviewState,
    is_new: false
  });
}

export function markWordReviewed(word, attemptSummary) {
  attemptSummary = attemptSummary || {};
  return Object.assign({}, word, {
    mastery_score: Math.min(100, (word.mastery_score || 0) + 5),
    recognition_score: Math.min(100, (word.recognition_score || 0) + 4),
    production_score: Math.min(100, (word.production_score || 0) + (attemptSummary.mode && attemptSummary.mode.indexOf('speaking') >= 0 ? 5 : 3)),
    speech_score: Math.min(100, (word.speech_score || 0) + (attemptSummary.speechScoreDelta || 0)),
    typing_score: Math.min(100, (word.typing_score || 0) + (attemptSummary.typingScoreDelta || 0))
  });
}

export function markWordFailed(word, attemptSummary) {
  attemptSummary = attemptSummary || {};
  return Object.assign({}, word, {
    mastery_score: Math.max(0, (word.mastery_score || 0) - 6),
    production_score: Math.max(0, (word.production_score || 0) - 5),
    speech_score: Math.max(0, (word.speech_score || 0) - (attemptSummary.mode && attemptSummary.mode.indexOf('speaking') >= 0 ? 4 : 0)),
    typing_score: Math.max(0, (word.typing_score || 0) - (attemptSummary.mode && attemptSummary.mode.indexOf('typing') >= 0 ? 4 : 0))
  });
}

export function markWordShaky(word) {
  return Object.assign({}, word, {
    mastery_score: Math.max(0, (word.mastery_score || 0) - 2)
  });
}
