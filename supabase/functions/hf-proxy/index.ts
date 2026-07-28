// Supabase Edge Function: hf-proxy
// Deploy: supabase functions deploy hf-proxy --no-verify-jwt
//
// Proxies LLM chat requests through HF Inference Providers (Cerebras).
// The HF_TOKEN secret is injected server-side — never exposed to the browser.
//
// Set the secret before deploying:
//   supabase secrets set HF_TOKEN=hf_...
//
// Used by: panoramica.html Voice Orb (browser mode)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const HF_TOKEN = Deno.env.get('HF_TOKEN') || '';
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

  if (!HF_TOKEN) {
    return new Response(JSON.stringify({ error: 'HF_TOKEN not configured on server' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  let body: { messages?: unknown[]; model?: string; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const messages = body.messages || [];
  const model = body.model || 'google/gemma-4-31B-it:cerebras';
  const maxTokens = body.max_tokens || 512;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing or empty "messages" array' }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  try {
    const hfResp = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
      }),
    });

    const data = await hfResp.json();

    if (!hfResp.ok) {
      return new Response(JSON.stringify({ error: data.error || `HF API HTTP ${hfResp.status}` }), {
        status: hfResp.status,
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
