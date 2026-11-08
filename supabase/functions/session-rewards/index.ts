// Supabase Edge Function: Session Rewards
// Called after a session completes — checks metrics, streaks, clarity
// and generates metric / boost / motivational notifications
//
// SECURITY: user_id is derived from the verified JWT, never the request body,
// and the session is scoped to that user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://www.sottotitoli.pro',
  'https://sottotitoli.pro',
  'https://buoninglese.github.io',
  'http://localhost:8000',
  'http://localhost:5500',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.sottotitoli.pro';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── Verify caller and derive user_id from JWT (never trust the body) ──
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });

    const user_id = user.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const session_id = body?.session_id;

    const notifications = [];

    // ── Fetch session stats ──
    let totalWords = 0;
    let durationMin = 0;
    let clarityScore = 0;

    if (session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        // ⚠️ These must be real `sessions` columns. This select used to be
        // 'total_words, duration_minutes, clarity_score' — total_words and
        // clarity_score don't exist, so the whole select 400'd, `session` came
        // back null, and every word-milestone / duration / clarity notification
        // was silently skipped.
        .select('words_count, duration_minutes, business_clarity_score')
        .eq('id', session_id)
        .eq('user_id', user_id)
        .maybeSingle();

      // Same failure shape, different cause: an unreadable row must not read as
      // "this session had no words". A missed nudge is not worth failing the whole
      // response over, but it is worth a line in the log.
      if (sessionError) {
        console.warn('session stats unreadable for ' + session_id + ': ' + sessionError.message +
          ' — milestone notifications skipped');
      }

      if (session) {
        totalWords = session.words_count || 0;
        durationMin = session.duration_minutes || 0;
        clarityScore = session.business_clarity_score || 0;
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
    const { data: recentSessions, error: recentError } = await supabase
      .from('sessions')
      .select('created_at')
      .eq('user_id', user_id)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false });

    if (recentError) {
      console.warn('recent sessions unreadable for ' + user_id + ': ' + recentError.message +
        ' — streak notification skipped');
    }

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
    }), { headers: corsHeaders(req) });

  } catch (err) {
    console.error('session-rewards error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: corsHeaders(req),
    });
  }
});
