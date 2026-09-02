// Supabase Edge Function: transcribe-audio
// Receives a binary audio blob from MediaRecorder (iOS fallback) and returns
// OpenAI Whisper transcription. Mirrors generate-word-bank auth (valid user JWT).
//
// Auth: Authorization: Bearer <user access_token> (401 otherwise)
// Deploy: supabase functions deploy transcribe-audio
// Secret: OPENAI_API_KEY (already set on project)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lang',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return json({ error: 'Missing Authorization header' }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);
    if (!OPENAI_API_KEY) return json({ error: 'Server missing OPENAI_API_KEY' }, 500);

    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'Empty audio' }, 400);
    if (buf.byteLength > 20 * 1024 * 1024) return json({ error: 'Audio too large (max 20MB)' }, 413);

    const mime = req.headers.get('Content-Type') || 'audio/webm';
    const ext = mime.includes('mp4') ? 'm4a' : 'webm';
    const lang = (req.headers.get('X-Lang') || 'en').trim().slice(0, 5);

    const form = new FormData();
    form.append('file', new Blob([buf], { type: mime }), `audio.${ext}`);
    form.append('model', 'whisper-1');
    form.append('language', lang);
    form.append('response_format', 'json');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 300);
      return json({ error: `Whisper request failed (${r.status})`, detail }, 502);
    }

    const data = await r.json();
    return json({ text: String(data?.text || '').trim() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
