// Supabase Edge Function: generate-learner-content (Phase 2)
// Generates a personalized, objectives-driven Italian "Mission" lesson for the
// Learner panel. Uses OpenAI gpt-6-luna, seeded with the user's REAL words
// (word banks + spaced review) and adapted to their profile
// (goal_primary, domain, native_lang, learning_profile) + estimated CEFR band.
// Persists to the learner_lessons table and returns the inserted row.
//
// Auth: requires a valid user JWT (Authorization: Bearer <access_token>).
// Deploy: supabase functions deploy generate-learner-content
// Secret: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Origin allowlist. This function answered with `*`, which let any site call it.
// It requires a user JWT, so nothing leaked — but there is no reason to answer
// strangers, and it made the four wildcard endpoints look like a deliberate
// posture rather than an oversight. Mirrors starter-report / process-session-analytics.
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
    // The value now depends on the request, so it must be marked as varying or a
    // cache can replay one origin's header back to a different origin.
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

const CEFR_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const CEFR_NAMES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Weighted average CEFR of the user's real words → target band for the lesson.
function estimatedCefr(words: any[]): string {
  const ranks = (words || [])
    .map((w) => CEFR_RANK[String(w.cefr || '').toUpperCase()])
    .filter((r): r is number => !!r);
  if (!ranks.length) return 'A2';
  const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const idx = Math.max(1, Math.min(6, Math.round(avg)));
  return CEFR_NAMES[idx - 1];
}

function bandRange(level: string): string {
  if (level === 'A1') return 'A1-A2';
  if (level === 'A2') return 'A2-B1';
  if (level === 'B1') return 'B1-B2';
  if (level === 'B2') return 'B2-C1';
  return 'C1-C2';
}

Deno.serve(async (req: Request) => {
  // Bound to THIS request's Origin rather than module state: one isolate serves
  // concurrent requests, so a module-level value could answer with the wrong origin.
  const cors = corsHeadersFor(req.headers.get('Origin'));
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const focus = typeof body.focus === 'string' && body.focus ? body.focus : null;
    // target = the language being taught ('en' primary for Italians, 'it' reverse)
    const target = body.target === 'it' ? 'it' : 'en';
    const explain = target === 'it' ? 'en' : 'it'; // translation/explanation language
    const CONTENT_NAME = target === 'it' ? 'italiano' : 'inglese';
    const EXPLAIN_NAME = explain === 'it' ? 'italiano' : 'inglese';

    // ── 1. Profile ──
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goal_primary,domain,native_lang,learning_profile,use_cases,display_name,full_name')
      .eq('id', user.id)
      .maybeSingle();
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('level,native_lang')
      .eq('user_id', user.id)
      .maybeSingle();
    // These two decide the language and level of everything generated below, so a
    // failed read is a wrong lesson, not just a missing detail.
    if (profileError) console.warn('profile unreadable for ' + user.id + ': ' + profileError.message);
    if (prefsError) console.warn('user_preferences unreadable for ' + user.id + ': ' + prefsError.message);
    const nativeLang = profile?.native_lang || prefs?.native_lang || 'it';

    // ── 2. Seed words — in the TARGET language, from word banks + spaced review ──
    const words: any[] = [];
    {
      const { data: wbs, error: wbsError } = await supabase.from('user_wordbanks').select('id,lang').eq('user_id', user.id);
      // Fewer seed words makes a weaker lesson, not a broken one — but a dead
      // try/catch made it completely invisible.
      if (wbsError) console.warn('wordbank list unreadable for ' + user.id + ': ' + wbsError.message);
      for (const b of (wbs || [])) {
        if (b.lang !== target) continue;
        const { data: wws, error: wwsError } = await supabase
          .from('user_wordbank_words')
          .select('word,pos,usage_count,created_at')
          .eq('wordbank_id', b.id)
          .limit(60);
        if (wwsError) console.warn('wordbank words unreadable for bank ' + b.id + ': ' + wwsError.message);
        (wws || []).forEach((w: any) => words.push({ word: w.word, pos: w.pos || '', usage: w.usage_count || 0 }));
      }
    }
    {
      const { data: rw, error: rwError } = await supabase
        .from('review_words')
        .select('lemma,pos,cefr,translation_primary,reps,personal_frequency')
        .eq('user_id', user.id)
        .eq('lang', target)
        .limit(60);
      if (rwError) console.warn('review_words unreadable for ' + user.id + ': ' + rwError.message);
      (rw || []).forEach((w: any) =>
        words.push({ word: w.lemma, pos: w.pos || '', cefr: w.cefr || '', translation: w.translation_primary || '' }));
    }

    const seen = new Set<string>();
    const unique = words.filter((w) => {
      const k = String(w.word || '').toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const seed = unique.slice(0, 24);
    const level = estimatedCefr(unique);

    // ── 3. Prompt ──
    const focusText = focus || profile?.domain || 'generale';
    const objectiveText = profile?.goal_primary ||
      (target === 'it' ? 'migliorare l\u2019italiano nella vita quotidiana e professionale' : 'migliorare l\u2019inglese nella vita quotidiana e professionale');
    const lp = profile?.learning_profile || {};
    const profileDesc = [
      `Target: ${CONTENT_NAME} (spiegazioni in ${EXPLAIN_NAME})`,
      focus ? `Focus richiesto dall'utente: ${focus}` : null,
      `Dominio: ${profile?.domain || 'generale'}`,
      `Obiettivo: ${objectiveText}`,
      `Lingua madre: ${nativeLang}`,
      lp && typeof lp === 'object' && Object.keys(lp).length ? `Profilo di apprendimento: ${JSON.stringify(lp)}` : null,
      Array.isArray(profile?.use_cases) && profile.use_cases.length ? `Casi d'uso: ${profile.use_cases.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const SYSTEM_PROMPT = `Sei un coach di ${CONTENT_NAME} come lingua straniera. Genera una "missione" di allenamento breve e mirata.
Rispondi SOLO con JSON valido (senza markdown, senza commenti), con esattamente questa struttura:
{
  "title": "Titolo breve della missione in italiano (2-6 parole)",
  "subtitle": "Sottotitolo di 1 frase in italiano",
  "objective": "Obiettivo SMART in italiano (1-2 frasi)",
  "words": [
    {"word":"parola in ${CONTENT_NAME}","translation":"traduzione in ${EXPLAIN_NAME}","pos":"n|v|adj|adv","cefr":"B1","example_word":"frase d'esempio in ${CONTENT_NAME} che usa la parola","example_translation":"frase d'esempio tradotta in ${EXPLAIN_NAME}"}
  ],
  "convo": [
    {"role":"A","text":"frase in ${CONTENT_NAME}","translation":"traduzione in ${EXPLAIN_NAME}"},
    {"role":"B","text":"frase in ${CONTENT_NAME}","translation":"traduzione in ${EXPLAIN_NAME}"}
  ]
}`;

    const USER_PROMPT = `${SYSTEM_PROMPT}

PROFILO DELLO STUDENTE:
${profileDesc}

LIVELLO STIMATO: ${level}

PAROLE REALI DELLO STUDENTE (usale come base, NON inventarne di troppo distanti):
${seed.map((w: any) => `- ${w.word}${w.cefr ? ` (${w.cefr})` : ''}${w.translation ? ` = ${w.translation}` : ''}`).join('\n') || '- nessuna parola disponibile'}

REGOLE:
- Genera 6-10 parole nuove O collegate alle parole reali, coerenti col tema "${focusText}" e il livello ${level}.
- Le frasi d'esempio DEVONO usare le parole generate.
- convo: 4-6 turni brevi di dialogo realistico sul tema.
- Tutto il contenuto (words.word, words.example_word, convo.text) è in ${CONTENT_NAME}.
- Le traduzioni (words.translation, words.example_translation, convo.translation) sono in ${EXPLAIN_NAME}.
- title, subtitle, objective sono SEMPRE in italiano (è la lingua dell'interfaccia).
- Non superare di molto il livello: resta nel range ${bandRange(level)}.
- Output compatto: massimo ~700 token.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-6-luna',
        messages: [{ role: 'user', content: USER_PROMPT }],
        // gpt-6-luna rejects max_tokens ("use max_completion_tokens") and rejects
        // any temperature other than the default, so neither is sent.
        max_completion_tokens: 1400,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: `OpenAI error: ${resp.status}`, detail: errText.slice(0, 300) }, 502);
    }

    const data = await resp.json();
    let raw = (data.choices?.[0]?.message?.content || '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    let lesson: any;
    try {
      lesson = JSON.parse(raw);
    } catch {
      const s = raw.indexOf('{');
      const e = raw.lastIndexOf('}');
      if (s === -1 || e === -1) return json({ error: 'AI response was not valid JSON', raw: raw.slice(0, 500) }, 422);
      try {
        lesson = JSON.parse(raw.slice(s, e + 1));
      } catch {
        return json({ error: 'AI response was not valid JSON', raw: raw.slice(0, 500) }, 422);
      }
    }

    // ── 4. Normalize + persist ──
    lesson.title = typeof lesson.title === 'string' && lesson.title ? lesson.title : 'Missione';
    lesson.subtitle = lesson.subtitle || '';
    lesson.objective = lesson.objective || '';
    lesson.words = Array.isArray(lesson.words) ? lesson.words.slice(0, 10) : [];
    lesson.convo = Array.isArray(lesson.convo) ? lesson.convo.slice(0, 6) : [];

    const { data: row, error: insErr } = await supabase
      .from('learner_lessons')
      .insert({
        user_id: user.id,
        lesson_type: 'mission',
        focus: focusText,
        title: lesson.title,
        subtitle: lesson.subtitle || null,
        objective: lesson.objective || null,
        content: lesson,
        source_profile: { level, seed_count: seed.length },
      })
      .select('*')
      .single();

    if (insErr) return json({ error: `insert failed: ${insErr.message}` }, 500);

    return json({ lesson: row });
  } catch (e) {
    return json({ error: `Server error: ${(e as Error).message}` }, 500);
  }
});
