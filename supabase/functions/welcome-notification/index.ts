// Supabase Edge Function: Welcome Notification
// Sends a welcome notification on first login if user has no notifications yet
//
// SECURITY: the target user is derived from the verified JWT, never from the
// request body, so a caller can only create their own welcome notification.

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

    // Only send welcome if user has zero notifications
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    // `count === 0` is false when the count is null, so an unreadable count used to
    // mean the welcome was silently never sent — and the response said
    // {sent: false}, which looks like a normal "already welcomed".
    if (countError) {
      console.error('notification count unreadable for ' + user_id + ': ' + countError.message);
      return new Response(JSON.stringify({ error: 'could not read notifications' }), {
        status: 500,
        headers: corsHeaders(req),
      });
    }

    if (count === 0) {
      const { error: insertError } = await supabase.from('notifications').insert({
        user_id,
        type: 'welcome',
        title: 'Benvenuto su Sottotitoli! 🎧',
        message: 'Inizia la tua prima sessione per scoprire la tua fluidità in tempo reale.',
        action_url: '/caption-s8t.html',
      });
      // This used to be unchecked, so a failed insert still answered {sent: true}.
      if (insertError) {
        console.error('welcome insert failed for ' + user_id + ': ' + insertError.message);
        return new Response(JSON.stringify({ error: 'could not store welcome notification' }), {
          status: 500,
          headers: corsHeaders(req),
        });
      }
    }

    return new Response(JSON.stringify({ sent: count === 0 }), { headers: corsHeaders(req) });
  } catch (err) {
    console.error('welcome-notification error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: corsHeaders(req) });
  }
});
