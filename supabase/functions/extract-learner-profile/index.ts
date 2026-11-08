// Supabase Edge Function: extract-learner-profile
//
// Turns a learner's onboarding prose into structured, non-identifying facts,
// stored in learner_profile_extractions. Reports then read the facts instead of
// the prose, so the prose never has to leave the building.
//
// Why this exists at all: two consumers were handling the same input in opposite
// ways. process-ai-reports used an allow-list and sent no prose; starter-report
// used a denylist and sent the prose deliberately, because the prose genuinely is
// the richest signal. Both were right; the pair was incoherent. Interpreting once
// removes the trade-off instead of picking a side.
//
// Deploy: supabase functions deploy extract-learner-profile --no-verify-jwt
// (`--no-verify-jwt` is REQUIRED for the backfill path, which authenticates with
//  the x-s8t-cron header. User calls are authenticated inside, below.)
//
// Inputs:
//   { }                          -> extract for the calling user
//   { mode: 'backfill', limit }  -> internal only (x-s8t-cron), re-extract stale
//
// Output: { profile: {...}, coverage, confidence, extracted: bool, reason }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';

const MODEL = 'gpt-6-luna';
const PROMPT_VERSION = '1';
const SCHEMA_VERSION = '1';

// A reformulated fact is short. A quotation of the learner is long, and a quote
// is exactly what can carry a name or a city into the payload, so long fields are
// dropped rather than truncated — a truncated quote is still a quote.
const MAX_FACT_CHARS = 200;
const MAX_LIST_ITEMS = 12;

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
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-s8t-cron',
  };
}

// ── The prompt ────────────────────────────────────────────────────────────
//
// The honesty rules are the substance. Three of them do the real work:
//
//   * emptiness is a valid answer, and every list may be empty. A prompt that
//     only says "do not invent" still invents, because a helpful model treats a
//     gap as a task. Saying the gap IS the correct output removes the task.
//   * no quotation. Reformulating is what strips names and places mechanically
//     rather than by the model's judgement.
//   * coverage is a required self-assessment, so "I had almost nothing" is
//     something the model has to say out loud rather than something we infer.
const SYSTEM_PROMPT = `Sei un analista che interpreta le risposte di onboarding di uno studente di inglese.
Trasformi testo libero in FATTI STRUTTURATI. Restituisci SOLO JSON, nessun markdown, nessun testo fuori dal JSON.

Schema:
{
  "goals": {
    "short_term": [{"text": "...", "timeframe": "settimane|mesi|null", "source": "scritto|parlato"}],
    "long_term":  [{"text": "...", "timeframe": "mesi|anni|null",   "source": "scritto|parlato"}]
  },
  "difficulties": [{"area": "grammatica|vocabolario|pronuncia|ascolto|parlato|scrittura|lettura|fiducia", "detail": "...", "source": "scritto|parlato|selezionato"}],
  "contexts": ["riunione","email","presentazione","sociale","studio","viaggio","certificazione"],
  "motivation": ["strumentale","integrativa","intrinseca"],
  "cefr_self_assessed": "A1|A2|B1|B2|C1|C2|null",
  "profession_field": "stringa breve o null",
  "constraints": ["tempo","denaro","timidezza","altro"],
  "coverage": "none|thin|substantial",
  "confidence": 0.0
}

REGOLE (tutte obbligatorie):
1. Ogni lista PUO' essere vuota. Ogni campo PUO' essere null. Se lo studente non ha detto qualcosa, la lista è vuota o il campo è null.
2. NON inventare, NON dedurre, NON completare, NON fare esempi. Un campo vuoto è una risposta corretta, non un'omissione da correggere.
3. NON citare lo studente. Riformula sempre in un fatto breve. Se non riesci a riformulare senza citare, ometti il campo.
4. NON includere nomi di persona, città, aziende, indirizzi, email o numeri di telefono, anche se compaiono chiaramente nel testo. Descrivi il settore o il contesto, mai l'identità.
5. "coverage" riflette quanto materiale c'era davvero: "none" se non c'è quasi nulla da cui estrarre, "thin" se c'è poco, "substantial" se c'è materiale ricco.
6. "confidence" è quanto sei sicuro dell'estrazione (0.0-1.0), non un giudizio sullo studente.
7. Non tradurre: scrivi i fatti in italiano, come lo schema indica.`;

// ── Deterministic gate ────────────────────────────────────────────────────
//
// The one thing the prompt cannot guarantee is that we bother calling it. If the
// learner gave nothing, we write coverage='none' and stop: nothing is invented,
// and nothing is billed. This is what makes "there may simply be no data" a
// property of the system rather than a request to the model.
const PROSE_FIELDS = [
  'intake_conversation_transcript',
  'ai_objectives_conversation_transcript',
  'shortterm_transcript',
  'short_term_goal',
  'long_term_goal',
  'difficulties_other',
  'profession_other',
  'why_english_other',
  'spoken_languages_other',
  'improve_languages_other',
  'native_lang_other',
  'heard_from_other',
] as const;

// Structured answers count as material even with no prose: "riunioni" + "B1" is
// a real signal, and refusing to read it because the learner typed little would
// punish a terse but complete answer.
const STRUCTURED_FIELDS = [
  'why_english', 'difficulties', 'english_situations', 'english_level',
  'profession', 'native_lang',
] as const;

interface Source {
  prose: string;
  proseChars: number;
  structuredCount: number;
  hasAnything: boolean;
}

function readSource(row: Record<string, unknown> | null): Source {
  if (!row) return { prose: '', proseChars: 0, structuredCount: 0, hasAnything: false };
  const parts: string[] = [];
  for (const f of PROSE_FIELDS) {
    const v = row[f];
    if (typeof v === 'string' && v.trim()) parts.push(`${f}: ${v.trim()}`);
  }
  const prose = parts.join('\n');
  let structuredCount = 0;
  for (const f of STRUCTURED_FIELDS) {
    const v = row[f];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) ? v.length : String(v).trim() !== '') structuredCount++;
  }
  return {
    prose,
    proseChars: prose.length,
    structuredCount,
    hasAnything: prose.length > 0 || structuredCount > 0,
  };
}

// SHA-256 of the prose plus the prompt version, so a prompt improvement
// re-extracts everyone automatically and an unchanged input costs nothing.
async function sourceHash(prose: string, structured: string): Promise<string> {
  const data = new TextEncoder().encode(`${PROMPT_VERSION}\u0000${structured}\u0000${prose}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Scrub ─────────────────────────────────────────────────────────────────
//
// Defence in depth behind rule 4. The model is told not to leak identity; this
// removes the mechanical shapes that carry it regardless of instruction.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL_RE = /https?:\/\/\S+/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

function scrubString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(EMAIL_RE, ' ').replace(URL_RE, ' ').replace(PHONE_RE, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  // Too long to be a reformulated fact → it is a quotation. Drop it.
  if (cleaned.length > MAX_FACT_CHARS) return null;
  return cleaned;
}

function scrubList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = scrubString(item);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

function scrubGoals(v: unknown): Array<{ text: string; timeframe: string | null; source: string | null }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ text: string; timeframe: string | null; source: string | null }> = [];
  for (const item of v) {
    const o = (item || {}) as Record<string, unknown>;
    const text = scrubString(o.text);
    if (!text) continue;                       // a goal with no text is not a goal
    out.push({
      text,
      timeframe: scrubString(o.timeframe),
      source: o.source === 'scritto' || o.source === 'parlato' ? o.source : null,
    });
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

function scrubDifficulties(v: unknown): Array<{ area: string; detail: string | null; source: string | null }> {
  const AREAS = new Set(['grammatica', 'vocabolario', 'pronuncia', 'ascolto', 'parlato', 'scrittura', 'lettura', 'fiducia']);
  if (!Array.isArray(v)) return [];
  const out: Array<{ area: string; detail: string | null; source: string | null }> = [];
  for (const item of v) {
    const o = (item || {}) as Record<string, unknown>;
    const area = typeof o.area === 'string' ? o.area.toLowerCase() : '';
    if (!AREAS.has(area)) continue;            // unknown area is not a fact
    const source = o.source === 'scritto' || o.source === 'parlato' || o.source === 'selezionato' ? o.source : null;
    out.push({ area, detail: scrubString(o.detail), source });
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

const EMPTY_PAYLOAD = {
  goals: { short_term: [] as unknown[], long_term: [] as unknown[] },
  difficulties: [] as unknown[],
  contexts: [] as string[],
  motivation: [] as string[],
  cefr_self_assessed: null as string | null,
  profession_field: null as string | null,
  constraints: [] as string[],
};

/** True when the payload contains no fact at all. */
function payloadIsEmpty(p: Record<string, unknown>): boolean {
  const goals = (p.goals || {}) as Record<string, unknown>;
  const lists = [
    goals.short_term, goals.long_term, p.difficulties,
    p.contexts, p.motivation, p.constraints,
  ];
  const anyList = lists.some((l) => Array.isArray(l) && l.length > 0);
  const anyScalar = Boolean(p.cefr_self_assessed) || Boolean(p.profession_field);
  return !anyList && !anyScalar;
}

/** Shape an arbitrary model response into the contract, dropping anything that
 *  does not fit. A field that cannot be made to fit is omitted, never guessed. */
function shapePayload(raw: unknown): { payload: Record<string, unknown>; coverage: string; confidence: number | null } {
  const o = (raw || {}) as Record<string, unknown>;
  const goals = (o.goals || {}) as Record<string, unknown>;
  let coverage = o.coverage === 'none' || o.coverage === 'thin' || o.coverage === 'substantial'
    ? o.coverage
    : 'thin';                                   // an unlabelled extraction is at best thin
  const conf = typeof o.confidence === 'number' && Number.isFinite(o.confidence)
    ? Math.max(0, Math.min(1, o.confidence))
    : null;
  const cefr = typeof o.cefr_self_assessed === 'string' && /^(A1|A2|B1|B2|C1|C2)$/.test(o.cefr_self_assessed)
    ? o.cefr_self_assessed
    : null;
  const payload = {
    goals: { short_term: scrubGoals(goals.short_term), long_term: scrubGoals(goals.long_term) },
    difficulties: scrubDifficulties(o.difficulties),
    contexts: scrubList(o.contexts),
    motivation: scrubList(o.motivation),
    cefr_self_assessed: cefr,
    profession_field: scrubString(o.profession_field),
    constraints: scrubList(o.constraints),
  };

  // coverage and payload must agree, because consumers branch on coverage alone.
  // The model's judgement is kept where it is a judgement (none vs thin vs
  // substantial), but the edge cases are decided here:
  //
  //   * an empty payload is 'none', whatever the model called it
  //   * 'none' cannot coexist with extracted facts — observed in the wild, and
  //     it would have made every downstream `if coverage === 'none'` guard a lie
  const empty = payloadIsEmpty(payload);
  if (empty) coverage = 'none';
  else if (coverage === 'none') coverage = 'thin';

  return { payload, coverage, confidence: empty ? null : conf };
}

interface Extraction {
  payload: Record<string, unknown>;
  coverage: string;
  confidence: number | null;
  model: string | null;
  error: string | null;
}

/** Run the model. Any failure returns coverage 'none' with the reason recorded —
 *  never a fabricated payload, and never silence, because silence and "the
 *  learner wrote nothing" must not look the same downstream. */
async function extract(prose: string, structured: string): Promise<Extraction> {
  if (!OPENAI_API_KEY) {
    return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: null, error: 'OPENAI_API_KEY not set' };
  }
  let resp: Response;
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        // gpt-6-luna rejects max_tokens ("use max_completion_tokens") and rejects
        // any temperature other than the default, so neither is sent.
        max_completion_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              'RISPOSTE STRUTTURATE (valori selezionati dallo studente):\n' + (structured || '(nessuna)') +
              '\n\nTESTO LIBERO DELLO STUDENTE:\n' + (prose || '(nessuno)') +
              '\n\nEstrai i fatti ora.',
          },
        ],
      }),
    });
  } catch (e) {
    return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: MODEL, error: 'fetch failed: ' + (e as Error).message };
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: MODEL, error: `OpenAI ${resp.status}: ${detail.slice(0, 200)}` };
  }

  let raw = '';
  try {
    const data = await resp.json();
    raw = (data.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: MODEL, error: 'unreadable response: ' + (e as Error).message };
  }

  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s === -1 || e === -1) {
      return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: MODEL, error: 'model returned non-JSON' };
    }
    try { parsed = JSON.parse(raw.slice(s, e + 1)); }
    catch { return { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: MODEL, error: 'model returned invalid JSON' }; }
  }

  const shaped = shapePayload(parsed);
  return { payload: shaped.payload, coverage: shaped.coverage, confidence: shaped.confidence, model: MODEL, error: null };
}

// ── Persist ───────────────────────────────────────────────────────────────

async function persist(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ext: Extraction,
  hash: string,
  inputChars: number,
): Promise<Record<string, unknown>> {
  const row = {
    user_id: userId,
    schema_version: SCHEMA_VERSION,
    payload: ext.payload,
    coverage: ext.coverage,
    confidence: ext.confidence,
    input_chars: inputChars,
    source_hash: hash,
    model: ext.model,
    prompt_version: PROMPT_VERSION,
    error_message: ext.error,
    extracted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('learner_profile_extractions')
    .upsert(row, { onConflict: 'user_id' })
    .select('coverage, confidence, payload, extracted_at')
    .single();
  if (error) throw new Error('upsert failed: ' + error.message);
  return data as Record<string, unknown>;
}

async function extractFor(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  force = false,
): Promise<Record<string, unknown> | null> {
  const { data: onboarding, error: onboardingError } = await supabase
    .from('onboarding_responses')
    .select(PROSE_FIELDS.join(',') + ',' + STRUCTURED_FIELDS.join(','))
    .eq('user_id', userId)
    .maybeSingle();
  // An unreadable onboarding row would otherwise look exactly like a learner who
  // never filled it in, and the extraction would quietly record "no profile".
  if (onboardingError) {
    console.warn('onboarding unreadable for ' + userId + ': ' + onboardingError.message);
  }

  const src = readSource(onboarding as Record<string, unknown> | null);
  const structured = JSON.stringify(
    STRUCTURED_FIELDS.reduce((acc, f) => {
      const v = (onboarding as Record<string, unknown> | null)?.[f];
      if (v !== undefined && v !== null) acc[f] = v;
      return acc;
    }, {} as Record<string, unknown>),
  );
  const hash = await sourceHash(src.prose, structured);

  // Idempotence: same input and same prompt version means nothing to do.
  if (!force) {
    const { data: existing, error: existingError } = await supabase
      .from('learner_profile_extractions')
      .select('source_hash, coverage, confidence, payload, extracted_at, error_message')
      .eq('user_id', userId)
      .maybeSingle();
    // Failing to read the previous extraction means we cannot prove the work is
    // already done, so it gets redone — harmless, but worth knowing.
    if (existingError) {
      console.warn('previous extraction unreadable for ' + userId + ': ' + existingError.message +
        ' — re-extracting');
    }
    const prev = existing as Record<string, unknown> | null;
    if (prev && prev.source_hash === hash) {
      return { ...prev, extracted: false, reason: 'unchanged' };
    }
  }

  // The deterministic gate. No input at all → no model call, no cost, no invention.
  if (!src.hasAnything) {
    const saved = await persist(
      supabase, userId,
      { payload: EMPTY_PAYLOAD, coverage: 'none', confidence: null, model: null, error: null },
      hash, 0,
    );
    return { ...saved, extracted: true, reason: 'no input to read' };
  }

  const ext = await extract(src.prose, structured);
  const saved = await persist(supabase, userId, ext, hash, src.proseChars);
  return { ...saved, extracted: true, reason: ext.error ? 'model failed' : 'ok' };
}

// ── Serve ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeadersFor(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    // Internal path for the backfill sweep. FAIL-CLOSED: an unset secret can
    // never match, so a forgotten env var cannot open this branch.
    const cronHeader = req.headers.get('x-s8t-cron') || '';
    const isInternal = CRON_SECRET !== '' && cronHeader === CRON_SECRET;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body is the normal case */ }

    if (isInternal && body.mode === 'backfill') {
      const limit = Math.max(1, Math.min(50, Number(body.limit) || 20));
      // Candidates: completed onboarding. No staleness query is needed here —
      // extractFor() skips anyone whose extraction already matches the current
      // source hash, so re-running this is free.
      const { data: rows, error: rowsError } = await supabase
        .from('onboarding_responses')
        .select('user_id')
        .eq('onboarding_completed', true)
        .limit(500);
      // A backfill that cannot read its own work list would otherwise process
      // nobody and still report success.
      if (rowsError) {
        return new Response(JSON.stringify({ error: 'could not list users to backfill: ' + rowsError.message }),
          { status: 500, headers: cors });
      }

      const results: Array<Record<string, unknown>> = [];
      let processed = 0;
      let skipped = 0;
      let scanned = 0;
      for (const r of (rows || []) as Array<{ user_id: string }>) {
        if (processed >= limit || scanned >= 200) break;
        scanned++;
        const out = await extractFor(supabase, r.user_id);
        if (out && out.extracted === false) { skipped++; continue; }   // already current
        results.push({ user_id: r.user_id, coverage: out?.coverage ?? null, reason: out?.reason ?? null });
        processed++;
      }
      return new Response(
        JSON.stringify({ backfill: true, processed, skipped, results }),
        { status: 200, headers: cors },
      );
    }

    // User path: authenticate, then extract for the caller only. The user id comes
    // from the verified token and never from the body, so no caller can ask for
    // someone else's profile to be interpreted.
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });

    const force = body.force === true;
    const out = await extractFor(supabase, user.id, force);
    return new Response(JSON.stringify({ profile: out }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
