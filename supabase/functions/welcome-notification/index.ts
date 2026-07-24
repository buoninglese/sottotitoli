// Supabase Edge Function: Welcome Notification
// Sends a welcome notification on first login if user has no notifications yet

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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Only send welcome if user has zero notifications
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    if (count === 0) {
      await supabase.from('notifications').insert({
        user_id,
        type: 'welcome',
        title: 'Benvenuto su Sottotitoli! 🎧',
        message: 'Inizia la tua prima sessione per scoprire la tua fluidità in tempo reale.',
        action_url: '/caption-s8t.html',
      });
    }

    return new Response(JSON.stringify({ sent: count === 0 }), {
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
