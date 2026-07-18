// bank-api.js — Supabase data layer for bank catalog.
// Assumes window.sottotitoliSupabase exists (loaded via js/auth.js).

function sb() {
  if (!window.sottotitoliSupabase) throw new Error('Supabase client not available');
  // sottotitoliSupabase already IS the supabase client (not a wrapper)
  return window.sottotitoliSupabase;
}

// ── Fetch all bank definitions ──
export async function fetchBankDefinitions() {
  const { data, error } = await sb()
    .from('review_bank_definitions')
    .select('*')
    .order('group_key', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Fetch words for a specific bank ──
export async function fetchBankWords(bankKey) {
  const { data, error } = await sb()
    .from('review_bank_words')
    .select(`
      id, user_id, bank_key, word_id, source_type,
      rank_score, reason_code, reason_text, evidence, status,
      inserted_at, updated_at,
      review_words (*)
    `)
    .eq('bank_key', bankKey)
    .eq('status', 'active')
    .order('rank_score', { ascending: false })
    .limit(50);

  if (error) throw error;

  const bankWordRows = (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    bank_key: row.bank_key,
    word_id: row.word_id,
    source_type: row.source_type,
    rank_score: row.rank_score,
    reason_code: row.reason_code,
    reason_text: row.reason_text,
    evidence: row.evidence,
    status: row.status,
    inserted_at: row.inserted_at,
    updated_at: row.updated_at
  }));

  const wordRows = (data || []).map(row => row.review_words).filter(Boolean);

  return { bankWordRows, wordRows };
}

// ── Fetch learning profile ──
export async function fetchLearningProfile() {
  const { data, error } = await sb()
    .from('review_user_learning_profile')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// ── Upsert learning profile ──
export async function upsertLearningProfile(profile) {
  const { data, error } = await sb()
    .from('review_user_learning_profile')
    .upsert(profile, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Mark suggestion feedback ──
export async function markSuggestionFeedback({ bankKey, wordId, action, feedbackReason, metadata }) {
  const { data, error } = await sb()
    .from('review_suggestion_feedback')
    .insert({
      bank_key: bankKey,
      word_id: wordId,
      action,
      feedback_reason: feedbackReason || null,
      metadata: metadata || {}
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ── Update bank word status ──
export async function updateBankWordStatus(bankWordId, status) {
  const { data, error } = await sb()
    .from('review_bank_words')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bankWordId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ── Move word to Yours bank ──
export async function promoteWordToYours(wordId, targetBankKey) {
  const { data, error } = await sb()
    .from('review_bank_words')
    .insert({
      word_id: wordId,
      bank_key: targetBankKey || 'new_words',
      source_type: 'user',
      rank_score: 0,
      reason_code: 'user_promoted',
      reason_text: 'Moved by you',
      status: 'active'
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ── Fetch all bank words for summary counts (lightweight) ──
export async function fetchAllBankSummaries() {
  const { data, error } = await sb()
    .from('review_bank_words')
    .select('bank_key, status, word_id')
    .eq('status', 'active');
  if (error) throw error;
  // Group by bank_key
  const summary = {};
  (data || []).forEach(row => {
    if (!summary[row.bank_key]) summary[row.bank_key] = { total: 0, words: [] };
    summary[row.bank_key].total++;
    summary[row.bank_key].words.push(row.word_id);
  });
  return summary;
}
