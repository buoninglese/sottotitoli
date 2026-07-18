// bank-engine.js — Pure logic for bank scoring, reason codes, and UI mapping.
// No Supabase, no DOM. Importable by both store and UI layers.

// ── SRS helpers ──
export function isWordDue(word, now) {
  if (!word || !word.next_review_at) return false;
  return new Date(word.next_review_at) <= (now || new Date());
}

export function computeRecognitionGap(word) {
  return (Number(word.recognition_score) || 0) - (Number(word.production_score) || 0);
}

// ── Final recommendation score ──
export function computeFinalRecommendationScore(word) {
  const goal = Number(word.goal_relevance_score || 0);
  const usage = Number(word.personal_frequency || 0);
  const progression = Number(word.progression_fit_score || 0);
  const readiness = Number(word.relevance_score || 0);
  const roadmap = Number(word.roadmap_relevance_score || 0);
  return Number((0.30 * goal + 0.25 * usage + 0.20 * progression + 0.15 * readiness + 0.10 * roadmap).toFixed(2));
}

// ── Derive reason_code for a word in a given bank ──
export function deriveReasonCode(bankKey, word, now) {
  const dt = now || new Date();
  switch (bankKey) {
    case 'review_due_now':
      return isWordDue(word, dt) ? 'due_now' : 'not_due';
    case 'new_from_sessions':
      return word.is_new ? 'recent_new' : 'not_new';
    case 'saved_from_sessions':
      return word.saved_origin === 'session' ? 'saved_session' : 'not_saved_session';
    case 'fragile_words':
      if ((word.mastery_score || 0) < 40) return 'low_mastery';
      if ((word.lapses || 0) >= 2) return 'repeated_lapses';
      if (word.last_result === 'again' || word.last_result === 'hard') return 'recent_fail';
      return 'stable';
    case 'ready_to_activate':
      return computeRecognitionGap(word) >= 20 ? 'recognition_gap' : 'no_gap';
    case 'goal_next_step':
      return (word.goal_relevance_score || 0) >= 1 ? 'goal_relevant' : 'goal_low';
    case 'build_from_known':
      return (word.progression_fit_score || 0) >= 1 ? 'progression_fit' : 'progression_low';
    case 'activate_recognized':
      return computeRecognitionGap(word) > 0 ? 'recognition_gt_production' : 'balanced';
    case 'upcoming_useful_vocab':
      return (word.roadmap_relevance_score || 0) >= 1 ? 'roadmap_relevant' : 'roadmap_low';
    default:
      return 'generic';
  }
}

// ── Reason code → human text ──
export function reasonCodeToText(bankKey, reasonCode) {
  const map = {
    due_now: 'Due now',
    recent_new: 'Captured recently',
    saved_session: 'Saved during a session',
    low_mastery: 'Weak retention',
    repeated_lapses: 'Repeated lapses',
    recent_fail: 'Recently failed',
    recognition_gap: 'You understand this more than you use it',
    recognition_gt_production: 'You understand this more than you use it',
    goal_relevant: 'Relevant to your goal',
    progression_fit: 'Next step from known words',
    personal_frequent: 'Frequent in your sessions',
    roadmap_relevant: 'Useful for your next stage',
    stable: 'Stable',
    balanced: 'Balanced',
    generic: 'Suggested by Sottotitoli'
  };
  if (map[reasonCode]) return map[reasonCode];
  // Fallbacks by bank
  if (bankKey === 'review_due_now') return 'Ready for review';
  if (bankKey === 'new_from_sessions') return 'Recently captured';
  if (bankKey === 'saved_from_sessions') return 'Manually saved';
  if (bankKey === 'fragile_words') return 'Needs reinforcement';
  return 'Suggested';
}

// ── Status chip label ──
export function computeStatusChip(bankKey, word, now) {
  if (bankKey === 'review_due_now' && isWordDue(word, now)) return 'Due';
  if (bankKey === 'new_from_sessions' && word.is_new) return 'New';
  if (bankKey === 'fragile_words') return 'Fragile';
  if (bankKey === 'ready_to_activate') return 'Activate';
  if (bankKey === 'saved_from_sessions') return 'Saved';
  const group = bankKey.startsWith('goal_') || bankKey.startsWith('build_') ||
                bankKey.startsWith('activate_') || bankKey.startsWith('upcoming');
  if (group) return 'Suggested';
  return word.is_new ? 'New' : 'Active';
}

// ── Build word-row view model ──
export function buildWordRowView(word, bankKey, now) {
  const dt = now || new Date();
  const reasonCode = deriveReasonCode(bankKey, word, dt);
  return {
    id: word.id,
    lemma: word.lemma || '',
    quickMeaning: word.translation_primary || '',
    reasonCode,
    reasonText: reasonCodeToText(bankKey, reasonCode),
    statusChip: computeStatusChip(bankKey, word, dt),
    cefr: word.cefr || null,
    pos: word.pos || null,
    mastery: word.mastery_score || 0,
    recognition: word.recognition_score || 0,
    production: word.production_score || 0,
    speech: word.speech_score || 0,
    typing: word.typing_score || 0
  };
}

// ── Primary action label per bank type ──
export function primaryActionForBank(bankDef) {
  if (!bankDef) return 'Open';
  switch (bankDef.bank_type) {
    case 'queue':
    case 'rescue-queue':
    case 'activation-queue':
      return 'Start review';
    case 'recommendation':
      return 'See suggestions';
    case 'collection-queue':
      return 'Review selected';
    case 'user-collection':
      return 'Manage collection';
    default:
      return 'Open';
  }
}

// ── Count secondary metric for bank cards ──
export function secondaryMetricForBank(bankKey, words) {
  if (!words || !words.length) return '';
  switch (bankKey) {
    case 'review_due_now': {
      const overdue = words.filter(w => new Date(w.next_review_at) < new Date()).length;
      return overdue > 0 ? overdue + ' overdue' : '';
    }
    case 'new_from_sessions': {
      const unreviewed = words.filter(w => w.is_new).length;
      return unreviewed > 0 ? unreviewed + ' unreviewed' : '';
    }
    case 'saved_from_sessions': {
      const due = words.filter(w => isWordDue(w)).length;
      return due > 0 ? due + ' due today' : '';
    }
    case 'fragile_words': {
      const atRisk = words.filter(w => (w.mastery_score || 0) < 30).length;
      return atRisk > 0 ? atRisk + ' at risk' : '';
    }
    default:
      return '';
  }
}
