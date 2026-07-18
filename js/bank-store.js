// bank-store.js — Central state management for word bank catalog
// Pure in-memory store with pub/sub. No Supabase dependency.

const listeners = new Set();

const state = {
  banksByKey: {},        // key → definition row
  bankOrderByGroup: {    // pinned / smart / yours → [key, ...]
    pinned: [],
    smart: [],
    yours: []
  },
  bankWordsByKey: {},    // key → array of bank_word rows
  wordsById: {},         // id → review_words row
  learningProfile: null,
  loading: false
};

function emit() {
  const snap = getBankState();
  for (const fn of listeners) fn(snap);
}

export function getBankState() {
  return {
    banksByKey: { ...state.banksByKey },
    bankOrderByGroup: {
      pinned: [...state.bankOrderByGroup.pinned],
      smart: [...state.bankOrderByGroup.smart],
      yours: [...state.bankOrderByGroup.yours]
    },
    bankWordsByKey: { ...state.bankWordsByKey },
    wordsById: { ...state.wordsById },
    learningProfile: state.learningProfile ? { ...state.learningProfile } : null,
    loading: state.loading
  };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLoading(v) {
  state.loading = !!v;
  emit();
}

// ── Hydrate bank definitions ──
export function hydrateBankDefinitions(definitions) {
  const byKey = {};
  const order = { pinned: [], smart: [], yours: [] };
  for (const def of definitions) {
    byKey[def.key] = def;
    if (order[def.group_key]) order[def.group_key].push(def.key);
  }
  state.banksByKey = byKey;
  state.bankOrderByGroup = order;
  emit();
}

// ── Hydrate words for a specific bank ──
export function hydrateBankWords(bankKey, bankWordRows, wordRows) {
  const wordMap = { ...state.wordsById };
  for (const w of wordRows) {
    if (w && w.id) wordMap[w.id] = { ...(wordMap[w.id] || {}), ...w };
  }
  state.wordsById = wordMap;
  state.bankWordsByKey[bankKey] = [...bankWordRows];
  emit();
}

// ── Hydrate learning profile ──
export function hydrateLearningProfile(profile) {
  state.learningProfile = profile || null;
  emit();
}

// ── Upsert a single bank word ──
export function upsertBankWord(bankKey, bankWordRow, wordRow) {
  const current = state.bankWordsByKey[bankKey] || [];
  const idx = current.findIndex(r => r.id === bankWordRow.id);
  if (idx === -1) {
    state.bankWordsByKey[bankKey] = [...current, bankWordRow];
  } else {
    const next = [...current];
    next[idx] = { ...next[idx], ...bankWordRow };
    state.bankWordsByKey[bankKey] = next;
  }
  if (wordRow && wordRow.id) {
    state.wordsById[wordRow.id] = { ...(state.wordsById[wordRow.id] || {}), ...wordRow };
  }
  emit();
}

// ── Remove a bank word ──
export function removeBankWord(bankKey, bankWordId) {
  const current = state.bankWordsByKey[bankKey] || [];
  state.bankWordsByKey[bankKey] = current.filter(r => r.id !== bankWordId);
  emit();
}

// ── Selectors ──
export function getBankDefinition(key) {
  return state.banksByKey[key] || null;
}

export function getBankDefinitionsByGroup(groupKey) {
  const keys = state.bankOrderByGroup[groupKey] || [];
  return keys.map(k => state.banksByKey[k]).filter(Boolean);
}

export function getBankWords(key) {
  return state.bankWordsByKey[key] || [];
}

export function getWordById(wordId) {
  return state.wordsById[wordId] || null;
}

export function getLearningProfile() {
  return state.learningProfile;
}
