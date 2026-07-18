/**
 * review-api.js — Supabase data layer for review subsystem.
 * Only this file talks to Supabase / edge functions.
 */

function getSupabaseClient() {
  var sb = window.sottotitoliSupabase;
  if (!sb || typeof sb.from !== 'function') {
    throw new Error('Supabase client non disponibile');
  }
  return sb;
}

export async function fetchReviewDashboard() {
  var supabase = getSupabaseClient();
  var result = await supabase.rpc('get_review_dashboard');
  if (result.error) throw result.error;
  return result.data;
}

export async function fetchReviewWords() {
  var supabase = getSupabaseClient();
  var result = await supabase
    .from('review_words')
    .select('id,user_id,lemma,normalized,translation_primary,translation_variants,accepted_answers,pos,cefr,topic,source_type,source_ref,is_saved,is_new,review_state,interval_days,ease_factor,reps,lapses,mastery_score,recognition_score,production_score,speech_score,typing_score,last_result,last_reviewed_at,next_review_at,ai_tags,metadata,created_at,updated_at')
    .order('next_review_at', { ascending: true, nullsFirst: false });

  if (result.error) throw result.error;
  return result.data || [];
}

export async function fetchReviewQueues() {
  var supabase = getSupabaseClient();

  var results = await Promise.all([
    supabase.from('review_custom_queues').select('*').order('updated_at', { ascending: false }),
    supabase.from('review_ai_queues').select('*').order('rank_score', { ascending: false })
  ]);

  var customResult = results[0];
  var aiResult = results[1];

  if (customResult.error) throw customResult.error;
  if (aiResult.error) throw aiResult.error;

  return {
    customQueues: customResult.data || [],
    aiQueues: aiResult.data || []
  };
}

export async function startReviewSession(queueId, queueType, mode, totalItems) {
  var supabase = getSupabaseClient();
  var result = await supabase.rpc('start_review_session', {
    p_queue_id: queueId,
    p_queue_type: queueType,
    p_mode: mode,
    p_total_items: totalItems
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function submitReviewAttempt(payload) {
  var supabase = getSupabaseClient();
  var result = await supabase.rpc('submit_review_attempt_rpc', payload);
  if (result.error) throw result.error;
  return result.data;
}

export async function completeReviewSession(sessionId, status, sessionSummary) {
  sessionSummary = sessionSummary || {};
  var supabase = getSupabaseClient();
  var result = await supabase.rpc('complete_review_session', {
    p_session_id: sessionId,
    p_status: status,
    p_session_summary: sessionSummary
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function createCustomQueue(opts) {
  opts = opts || {};
  var supabase = getSupabaseClient();
  var result = await supabase
    .from('review_custom_queues')
    .insert({
      title: opts.title,
      filter: opts.filter || {},
      is_pinned: opts.is_pinned || false
    })
    .select()
    .single();

  if (result.error) throw result.error;
  return result.data;
}

export async function fetchAIQueues() {
  var supabase = getSupabaseClient();
  var result = await supabase
    .from('review_ai_queues')
    .select('*')
    .order('rank_score', { ascending: false });

  if (result.error) throw result.error;
  return result.data || [];
}

export async function refreshReviewDashboard() {
  var results = await Promise.all([
    fetchReviewDashboard(),
    fetchReviewWords(),
    fetchReviewQueues()
  ]);

  return {
    dashboard: results[0],
    words: results[1],
    customQueues: results[2].customQueues,
    aiQueues: results[2].aiQueues
  };
}
