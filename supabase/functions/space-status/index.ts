// Supabase Edge Function: space-status
// Deploy: supabase functions deploy space-status --no-verify-jwt
//
// CORS proxy for the HF Spaces API. The HF API only allows requests from
// huggingface.co, but ai-s8t.html needs to check Space status from our domain.
// This function fetches the status server-side and returns it with open CORS.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const SPACE_ID = 's8t/Sottotitoli-voice';
const HF_API = `https://huggingface.co/api/spaces/${SPACE_ID}`;
const ALLOWED_ORIGIN = 'https://www.sottotitoli.pro';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const resp = await fetch(HF_API);
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Failed to fetch Space status: ${err}` }), {
      status: 502,
      headers: corsHeaders(),
    });
  }
});
