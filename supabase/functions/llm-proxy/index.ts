// Supabase Edge Function: llm-proxy
// Deploy: supabase functions deploy llm-proxy --no-verify-jwt
//
// Proxies LLM chat requests through OpenAI so the key never reaches the browser.
// Renamed from `hf-proxy` on 2026-11-08 when Hugging Face was removed; the old
// slug was deleted, and nothing in either repo referenced it except an unread
// config key.
//
// Used by: panoramica.html Voice Orb (browser mode)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
// Fixed on purpose: callers used to name a Hugging Face model here, and such an
// id is rejected by OpenAI with model_not_found.
const MODEL = 'gpt-6-luna';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const ALLOWED_ORIGIN = 'https://www.sottotitoli.pro';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Require an authenticated caller — this proxy spends HF inference credits.
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders() });
  }
  {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders() });
    }
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured on server' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  let body: { messages?: unknown[]; max_completion_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const messages = body.messages || [];
  const maxTokens = Math.min(Number(body.max_completion_tokens) || 512, 2048); // cap output (cost control)

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing or empty "messages" array' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_completion_tokens: maxTokens,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: data.error || `OpenAI API HTTP ${upstream.status}` }), {
        status: upstream.status,
        headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Proxy error: ${err}` }), {
      status: 502,
      headers: corsHeaders(),
    });
  }
});
