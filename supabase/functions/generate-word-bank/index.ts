// Supabase Edge Function: generate-word-bank
// AI-generates a vocabulary word bank from a user topic/focus and persists it
// (a new `user_wordbanks` row + `user_wordbank_words` rows). Mirrors the
// generate-learner-content pattern (JWT auth + OpenAI gpt-4o-mini).
//
// Auth: requires a valid user JWT (Authorization: Bearer <access_token>).
// Deploy: supabase functions deploy generate-word-bank
// Secret: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    // target = language being taught ('en' primary for Italians, 'it' reverse)
    const target = body.target === 'it' ? 'it' : 'en';
    const explain = target === 'it' ? 'en' : 'it';
    const CONTENT_NAME = target === 'it' ? 'italiano' : 'inglese';
    const EXPLAIN_NAME = explain === 'it' ? 'italiano' : 'inglese';
    const topic = typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : 'vocabolario generale';
    const count = Math.min(24, Math.max(8, parseInt(body.count, 10) || 14));
    // bank name: auto title from topic, or explicit
    const bankName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : topic;

    // ── 1. Profile (lightweight — used for level fit) ──
    let level = 'B1';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('goal_primary,domain,native_lang')
        .eq('id', user.id)
        .maybeSingle();
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('level,native_lang')
        .eq('user_id', user.id)
        .maybeSingle();
      level = prefs?.level || profile?.level || 'B1';
    } catch (e) { /* non-fatal */ }

    // ── 2. Prompt ──
    const SYSTEM_PROMPT = `Sei un coach di ${CONTENT_NAME} come lingua straniera. Genera una banca parole (word bank) su un tema.
Rispondi SOLO con JSON valido (senza markdown, senza commenti), con esattamente questa struttura:
{
  "title": "Titolo breve della banca in italiano (2-5 parole)",
  "words": [
    {"word":"parola in ${CONTENT_NAME}","translation":"traduzione in ${EXPLAIN_NAME}","pos":"n|v|adj|adv|phrase","cefr":"B1","example_word":"frase d'esempio in ${CONTENT_NAME}","example_translation":"frase d'esempio tradotta in ${EXPLAIN_NAME}"}
  ]
}`;

    const USER_PROMPT = `${SYSTEM_PROMPT}

TEMA RICHIESTO: ${topic}
LIVELLO STIMATO: ${level}

REGOLE:
- Genera ${count} parole utili e coerenti col tema "${topic}", adatte al livello ${level}.
- Le frasi d'esempio DEVONO usare la parola generata.
- words.word ed example_word sono in ${CONTENT_NAME}; words.translation ed example_translation sono in ${EXPLAIN_NAME}.
- title è in italiano (è la lingua dell'interfaccia).
- Output compatto: massimo ~900 token.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: USER_PROMPT }],
        temperature: 0.7,
        max_tokens: 1600,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: `OpenAI error: ${resp.status}`, detail: errText.slice(0, 300) }, 502);
    }

    const data = await resp.json();
    let raw = (data.choices?.[0]?.message?.content || '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    let bank: any;
    try {
      bank = JSON.parse(raw);
    } catch {
      const s = raw.indexOf('{');
      const e = raw.lastIndexOf('}');
      if (s === -1 || e === -1) return json({ error: 'AI response was not valid JSON', raw: raw.slice(0, 500) }, 422);
      try {
        bank = JSON.parse(raw.slice(s, e + 1));
      } catch {
        return json({ error: 'AI response was not valid JSON', raw: raw.slice(0, 500) }, 422);
      }
    }

    const words = Array.isArray(bank.words) ? bank.words.slice(0, count) : [];
    if (!words.length) return json({ error: 'AI returned no words' }, 422);

    // ── 3. Persist: create bank, then words ──
    const { data: created, error: insErr } = await supabase
      .from('user_wordbanks')
      .insert({ user_id: user.id, name: bankName, lang: target })
      .select('*')
      .single();
    if (insErr || !created) return json({ error: `insert bank failed: ${insErr?.message}` }, 500);

    const rows = words.map((w: any) => ({
      wordbank_id: created.id,
      word: String(w.word || '').trim(),
      pos: w.pos || null,
      usage_count: 0,
    })).filter((r: any) => r.word);
    if (rows.length) {
      const { error: wErr } = await supabase.from('user_wordbank_words').insert(rows);
      if (wErr) {
        // best-effort: bank exists, words may partially fail
        console.warn('word insert:', wErr.message);
      }
    }

    return json({ bank: created, wordCount: rows.length, ai: { title: bank.title, words } });
  } catch (e) {
    return json({ error: `Server error: ${(e as Error).message}` }, 500);
  }
});
