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
// Used only as the apikey for the caller-scoped client below. The role PostgREST
// resolves comes from that client's Authorization header (the caller's JWT), not
// from this key, so passing the service key here would not widen anything — hence
// the fallback if the project does not expose a separate anon key.
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || SUPABASE_SERVICE_ROLE_KEY;

// Pre-call gate only: estimate duration from bytes at a conservative bitrate so we
// can refuse before spending. The CHARGE never uses this — it uses the authoritative
// `usage.seconds` OpenAI returns. Measured on a real MediaRecorder m4a: ~5450 B/s
// (21,806 B → 4 s); 4000 is deliberately lower so the gate over-estimates duration
// and refuses early rather than late.
const ASSUMED_BPS = 4000;
const KEYWORD_LIMIT = 20;
const KEYWORD_MAXLEN = 64;
function sanitizeKeyword(s: unknown): string {
  // keywords must be single-line and may not contain < > CR LF, or the API 400s.
  return String(s ?? '').replace(/[<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, KEYWORD_MAXLEN);
}

// Origin allowlist — same reasoning as generate-learner-content. The custom headers
// below must stay, or the preflight for the iOS fallback stops passing.
const ALLOWED_ORIGINS = new Set([
  'https://www.sottotitoli.pro',
  'https://sottotitoli.pro',
  'https://buoninglese.github.io',
  'http://localhost:8000',
  'http://localhost:5500',
]);

function corsHeadersFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.sottotitoli.pro';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lang, X-Audio-Seconds, X-Session-Id',
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req.headers.get('Origin'));
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
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

    // ── Meter BEFORE spending ────────────────────────────────────────────────
    // The upload size is known here, so the ceiling can refuse rather than
    // transcribe-and-hope. Before this, the endpoint had no balance check, no rate
    // limit and no usage record: an authenticated account could loop it and burn
    // Whisper spend indefinitely, because the client is the only thing that ever
    // deducted minutes.
    //
    // Called through a CALLER-SCOPED client so auth.uid() inside the RPC resolves
    // to the real user. Using the service-role client instead would leave auth.uid()
    // null and the RPC would (correctly) refuse.
    // Pre-call gate estimate only — the client's duration is NOT trusted for
    // charging (the charge uses OpenAI's authoritative `usage.seconds`). A session
    // id attributes the charge so the save-time deduction can net it off.
    const gateSeconds = Math.max(1, Math.ceil(buf.byteLength / ASSUMED_BPS));
    const sessionId = (function () {
      const raw = (req.headers.get('X-Session-Id') || '').trim();
      return /^[0-9a-fA-F-]{36}$/.test(raw) ? raw : null;
    })();

    // Attribution is REQUIRED: without a session id the charge cannot be netted off
    // at save, which previously left a free lane. Clients send X-Session-Id
    // (real-mic.js, and record-fallback.js v3+).
    if (!sessionId) {
      return json({ error: 'Missing or invalid X-Session-Id', code: 'NO_SESSION_ID' }, 409);
    }

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: gateRows, error: gateErr } = await callerClient
      .rpc('authorize_transcription', { p_bytes: buf.byteLength, p_seconds: gateSeconds });
    const gate = Array.isArray(gateRows) ? gateRows[0] : gateRows;

    if (gateErr) {
      // Fail CLOSED: if we cannot meter, we do not spend.
      console.error('authorize_transcription failed:', gateErr.message);
      return json({ error: 'Metering unavailable, please retry', detail: gateErr.message }, 503);
    }
    if (!gate || !gate.allowed) {
      // 402 rather than 401/403: distinct from "not signed in" so the client can
      // offer "buy minutes", and distinct from "forbidden" so it is not read as a
      // permissions bug.
      return json({
        error: gate?.reason === 'daily transcription limit reached'
          ? 'Daily transcription limit reached. Try again tomorrow.'
          : 'No minutes available. Buy minutes to keep recording.',
        reason: gate?.reason || 'not allowed',
        code: 'NO_MINUTES',
      }, 402);
    }

    const mime = req.headers.get('Content-Type') || 'audio/webm';
    const ext = mime.includes('mp4') ? 'm4a' : 'webm';
    const lang = (req.headers.get('X-Lang') || 'en').trim().slice(0, 5);

    // Optional lesson vocabulary as keyword hints (helps domain terms). Best-effort:
    // any failure here must never fail the transcription.
    const keywords: string[] = [];
    try {
      const { data: vrows } = await callerClient
        .from('user_vocabulary')
        .select('word')
        .eq('lang', lang)
        .order('usage_count', { ascending: false })
        .limit(KEYWORD_LIMIT);
      (vrows || []).forEach((r: any) => {
        const k = sanitizeKeyword(r?.word);
        if (k) keywords.push(k);
      });
    } catch (_) { /* omit keywords */ }

    const form = new FormData();
    form.append('file', new Blob([buf], { type: mime }), `audio.${ext}`);
    // gpt-transcribe: OpenAI's recommended transcription model, billed per minute.
    // It returns the authoritative input duration as usage:{seconds,type:'duration'},
    // which is what we charge from — the client cannot influence it.
    // `languages` (plural) replaces the singular `language` on this model; sending
    // both is rejected. Keywords are hints only (literal, single-line).
    form.append('model', 'gpt-transcribe');
    form.append('languages[]', lang);
    form.append('response_format', 'json');
    for (const k of keywords) form.append('keywords[]', k);

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

    // Record only audio that was actually paid for, charging from OpenAI's
    // authoritative duration. Token counts are stored too (null for the
    // duration-billed model) so real cost can be read off actual usage.
    try {
      const usage: any = data?.usage || {};
      const chargedSeconds = (usage.type === 'duration' && Number.isFinite(usage.seconds))
        ? Math.max(1, Math.round(usage.seconds))
        : gateSeconds;
      const rec = await callerClient.rpc('record_transcription', {
        p_bytes: buf.byteLength,
        p_seconds: chargedSeconds,
        p_session_id: sessionId,
        p_input_tokens: Number.isFinite(usage.input_tokens) ? usage.input_tokens : null,
        p_output_tokens: Number.isFinite(usage.output_tokens) ? usage.output_tokens : null,
      });
      if (rec.error) console.error('record_transcription failed:', rec.error.message);
    } catch (recErr) {
      // Never fail the transcript because bookkeeping failed — the audio is
      // already transcribed and, if charged, already charged.
      console.error('record_transcription threw:', recErr);
    }

    return json({ text: String(data?.text || '').trim() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
