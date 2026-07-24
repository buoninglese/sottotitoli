// Supabase Edge Function: Session Rewards
// Called after a session completes — checks metrics, streaks, clarity
// and generates metric / boost / motivational notifications

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { user_id, session_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const notifications = [];

    // ── Fetch session stats ──
    let totalWords = 0;
    let durationMin = 0;
    let clarityScore = 0;

    if (session_id) {
      const { data: session } = await supabase
        .from('sessions')
        .select('total_words, duration_minutes, clarity_score')
        .eq('id', session_id)
        .maybeSingle();

      if (session) {
        totalWords = session.total_words || 0;
        durationMin = session.duration_minutes || 0;
        clarityScore = session.clarity_score || 0;
      }
    }

    // ── Metric: word milestones ──
    if (totalWords >= 300) {
      notifications.push({
        user_id,
        type: 'metric',
        title: 'Milestone raggiunto! 🎯',
        message: `Hai raggiunto ${totalWords} parole in questa sessione.`,
        data: { milestone: '300_words', total_words: totalWords },
      });
    } else if (totalWords >= 100) {
      notifications.push({
        user_id,
        type: 'metric',
        title: 'Buon ritmo!',
        message: `Hai detto ${totalWords} parole in questa sessione. Continua così.`,
        data: { total_words: totalWords },
      });
    }

    // ── Boost: streak detection ──
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('created_at')
      .eq('user_id', user_id)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false });

    const recentDays = new Set(
      (recentSessions || []).map((s) => s.created_at.substring(0, 10))
    );

    if (recentDays.size >= 3) {
      notifications.push({
        user_id,
        type: 'boost',
        title: '3 giorni di fila! 🔥',
        message: 'Stai costruendo un ottimo ritmo. Continua così.',
        data: { streak_days: recentDays.size },
      });
    } else if (recentDays.size >= 2) {
      notifications.push({
        user_id,
        type: 'boost',
        title: 'Secondo giorno consecutivo! 💪',
        message: 'Un altro giorno e sarai a quota tre.',
        data: { streak_days: recentDays.size },
      });
    }

    // ── Motivational: clarity ──
    if (clarityScore >= 85) {
      notifications.push({
        user_id,
        type: 'motivational',
        title: 'Chiarezza eccezionale! ✨',
        message: `La tua chiarezza è al ${clarityScore}%. Sei più preciso della media.`,
        data: { clarity: clarityScore },
      });
    } else if (clarityScore >= 70 && clarityScore < 85) {
      notifications.push({
        user_id,
        type: 'motivational',
        title: 'Ottimo lavoro!',
        message: `La tua chiarezza è al ${clarityScore}%. Continua a fare pratica.`,
        data: { clarity: clarityScore },
      });
    }

    // ── Duration milestone ──
    if (durationMin >= 30) {
      notifications.push({
        user_id,
        type: 'metric',
        title: 'Sessione intensa! ⏱️',
        message: `Hai parlato per ${durationMin} minuti. Ottima resistenza.`,
        data: { duration: durationMin },
      });
    }

    // ── Insert all notifications ──
    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      sent: notifications.length,
      types: notifications.map((n) => n.type),
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
