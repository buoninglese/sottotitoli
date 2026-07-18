// bank-ui-bridge.js — Thin bridge: store + engine → view models for DOM rendering.
// Does NOT touch the DOM. Returns plain objects for the UI to render.

import {
  getBankDefinition, getBankWords, getWordById, getLearningProfile,
  getBankDefinitionsByGroup
} from './bank-store.js';

import {
  buildWordRowView, primaryActionForBank, secondaryMetricForBank
} from './bank-engine.js';

// ── Build a bank card view model ──
export function buildBankCardView(bankKey) {
  const def = getBankDefinition(bankKey);
  if (!def) return null;
  const words = getBankWords(bankKey);
  const count = words.length;
  const secondary = secondaryMetricForBank(bankKey, words);

  return {
    key: def.key,
    title: def.title,
    group: def.group_key,
    badge: def.group_key === 'pinned' ? 'PINNED' : def.group_key === 'smart' ? 'SMART' : 'YOURS',
    subtitle: def.subtitle_template || def.description || '',
    description: def.description || '',
    bankType: def.bank_type,
    primaryCount: count,
    secondaryMetric: secondary,
    emptyState: def.empty_state_text,
    primaryActionLabel: primaryActionForBank(def),
    isPinned: def.is_pinned,
    isSmart: def.is_smart
  };
}

// ── Build a full bank detail view model ──
export function buildBankDetailView(bankKey) {
  const def = getBankDefinition(bankKey);
  if (!def) return null;

  const bankWords = getBankWords(bankKey);
  const wordRows = bankWords.map(bw => {
    const word = getWordById(bw.word_id);
    if (!word) return null;
    return {
      bankWordId: bw.id,
      wordView: buildWordRowView(word, bankKey)
    };
  }).filter(Boolean);

  const profile = getLearningProfile();

  return {
    definition: def,
    words: wordRows,
    total: bankWords.length,
    profile: profile
  };
}

// ── Build cards for an entire group ──
export function buildGroupCardViews(groupKey) {
  const defs = getBankDefinitionsByGroup(groupKey);
  return defs.map(def => buildBankCardView(def.key)).filter(Boolean);
}
