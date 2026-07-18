/**
 * review-store.js — Client-side source-of-truth for review subsystem.
 * No DOM logic. Pure state management with subscribe/render pattern.
 */

const listeners = new Set();

const state = {
  wordsById: {},
  queuesById: {},
  queueOrder: [],
  dashboardMetrics: {
    scheduled_today: 0,
    overdue: 0,
    reviewed_today: 0,
    mastered: 0,
    in_queue_now: 0,
    unstable_new: 0,
    fragile: 0,
    estimated_minutes_today: 0
  },
  reviewSession: null,
  lastHydratedAt: null
};

function emit() {
  const frozen = getReviewState();
  for (const listener of listeners) listener(frozen);
}

export function createReviewStore() {
  return {
    getState: getReviewState,
    setState: setReviewState,
    subscribe: subscribeReviewState
  };
}

export function getReviewState() {
  return JSON.parse(JSON.stringify(state));
}

export function setReviewState(patch) {
  Object.assign(state, patch);
  emit();
}

export function subscribeReviewState(listener) {
  listeners.add(listener);
  return function () { listeners.delete(listener); };
}

export function hydrateReviewWords(words) {
  if (!Array.isArray(words)) return;
  const next = {};
  for (var i = 0; i < words.length; i++) {
    next[words[i].id] = words[i];
  }
  state.wordsById = next;
  state.lastHydratedAt = new Date().toISOString();
  emit();
}

export function hydrateReviewQueues(queues) {
  if (!Array.isArray(queues)) return;
  var byId = {};
  var order = [];
  for (var i = 0; i < queues.length; i++) {
    byId[queues[i].id] = queues[i];
    order.push(queues[i].id);
  }
  state.queuesById = byId;
  state.queueOrder = order;
  emit();
}

export function upsertReviewWord(word) {
  if (!word || !word.id) return;
  state.wordsById[word.id] = Object.assign({}, state.wordsById[word.id] || {}, word);
  emit();
}

export function upsertReviewWords(words) {
  if (!Array.isArray(words)) return;
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (w && w.id) {
      state.wordsById[w.id] = Object.assign({}, state.wordsById[w.id] || {}, w);
    }
  }
  emit();
}

export function removeReviewWord(wordId) {
  delete state.wordsById[wordId];
  emit();
}

export function setDashboardMetrics(metrics) {
  if (!metrics) return;
  state.dashboardMetrics = Object.assign({}, state.dashboardMetrics, metrics);
  emit();
}

export function setReviewSession(sessionState) {
  state.reviewSession = sessionState;
  emit();
}

export function getWordById(wordId) {
  return state.wordsById[wordId] || null;
}

export function getQueueById(queueId) {
  return state.queuesById[queueId] || null;
}

export function selectAllWords() {
  return Object.keys(state.wordsById).map(function (k) { return state.wordsById[k]; });
}

export function selectAllQueues() {
  return state.queueOrder.map(function (id) { return state.queuesById[id]; }).filter(Boolean);
}

export function selectDueWords(now) {
  now = now || new Date();
  return selectAllWords().filter(function (word) {
    if (!word.next_review_at) return false;
    return new Date(word.next_review_at) <= now;
  });
}

export function selectDueWordsByPOS(pos, now) {
  return selectDueWords(now).filter(function (word) { return word.pos === pos; });
}

export function selectSavedDueWords(now) {
  return selectDueWords(now).filter(function (word) { return word.is_saved; });
}

export function selectNewDueWords(now) {
  return selectDueWords(now).filter(function (word) { return word.is_new; });
}

export function selectWordsByFilter(filter, now) {
  now = now || new Date();
  var words = selectAllWords();

  if (filter.due === true) {
    words = words.filter(function (word) {
      return word.next_review_at && new Date(word.next_review_at) <= now;
    });
  }
  if (filter.pos_in && filter.pos_in.length) {
    words = words.filter(function (word) { return filter.pos_in.indexOf(word.pos) >= 0; });
  }
  if (filter.topic_in && filter.topic_in.length) {
    words = words.filter(function (word) { return filter.topic_in.indexOf(word.topic) >= 0; });
  }
  if (filter.saved === true) {
    words = words.filter(function (word) { return word.is_saved; });
  }
  if (filter.is_new === true) {
    words = words.filter(function (word) { return word.is_new; });
  }
  if (typeof filter.mastery_lt === 'number') {
    words = words.filter(function (word) { return (word.mastery_score || 0) < filter.mastery_lt; });
  }

  return words;
}

export function selectDashboardMetrics() {
  return Object.assign({}, state.dashboardMetrics);
}

export function resetReviewStore() {
  state.wordsById = {};
  state.queuesById = {};
  state.queueOrder = [];
  state.dashboardMetrics = {
    scheduled_today: 0,
    overdue: 0,
    reviewed_today: 0,
    mastered: 0,
    in_queue_now: 0,
    unstable_new: 0,
    fragile: 0,
    estimated_minutes_today: 0
  };
  state.reviewSession = null;
  state.lastHydratedAt = null;
  emit();
}
