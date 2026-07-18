/**
 * review-ai.js — AI-generated review queues from weakness signals.
 * V1: rule-based clustering. V2+: transcript/profile-driven.
 */

export function deriveWeaknessClusters(words, attempts, profileSignals, transcriptSignals) {
  words = words || [];
  attempts = attempts || [];
  profileSignals = profileSignals || [];
  transcriptSignals = transcriptSignals || [];

  var lowProduction = words.filter(function (w) { return (w.production_score || 0) < 40; });

  var goalRelevant = words.filter(function (w) {
    return profileSignals.some(function (signal) {
      return signal.topic && signal.topic === w.topic;
    });
  });

  var recentFailuresWordIds = {};
  for (var i = 0; i < attempts.length && i < 50; i++) {
    if (attempts[i].grade === 'again') {
      recentFailuresWordIds[attempts[i].word_id] = true;
    }
  }
  var recentFailures = words.filter(function (w) { return recentFailuresWordIds[w.id]; });

  return [
    { slug: 'ai_low_production', title: 'Suggerita da AI: parole che capisci ma usi poco', words: lowProduction },
    { slug: 'ai_goal_relevant', title: 'Suggerita da AI: lessico utile per il tuo contesto', words: goalRelevant },
    { slug: 'ai_recent_failures', title: 'Suggerita da AI: parole ancora instabili', words: recentFailures }
  ];
}

export function explainAISuggestion(cluster) {
  if (cluster.slug === 'ai_low_production') return 'Lessico fragile sul piano produttivo';
  if (cluster.slug === 'ai_goal_relevant') return 'Parole coerenti con i tuoi obiettivi e il tuo contesto';
  if (cluster.slug === 'ai_recent_failures') return 'Parole che hai sbagliato di recente';
  return 'Selezione generata dall\'AI';
}

export function rankAISuggestionClusters(clusters) {
  if (!Array.isArray(clusters)) return [];
  return clusters.slice().sort(function (a, b) {
    return (b.words ? b.words.length : 0) - (a.words ? a.words.length : 0);
  });
}

export function buildAISuggestionQueues(clusters) {
  return rankAISuggestionClusters(clusters).map(function (cluster, index) {
    return {
      id: cluster.slug,
      type: 'ai',
      title: cluster.title,
      rationale: explainAISuggestion(cluster),
      urgency: index === 0 ? 'high' : 'medium',
      item_count: cluster.words ? cluster.words.length : 0,
      estimated_minutes: Math.max(1, Math.ceil((cluster.words ? cluster.words.length : 0) / 3)),
      word_ids: (cluster.words || []).map(function (w) { return w.id; }),
      filter: { source: 'ai', slug: cluster.slug }
    };
  }).filter(function (queue) { return queue.item_count > 0; });
}

export async function refreshAISuggestions(userId) {
  // V1: client-side only. V2: edge function call.
  return { userId: userId, ok: true };
}
