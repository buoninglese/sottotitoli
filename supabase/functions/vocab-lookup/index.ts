/**
 * vocab-lookup — Word definitions, synonyms, POS for 7 languages.
 * English: Free Dictionary API + Datamuse
 * Other languages: OpenAI gpt-6-luna
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
// Hugging Face was removed on 2026-11-08 — the free Inference Providers tier
// returned 402, so every non-English lookup failed and returned an empty entry.
const MODEL = 'gpt-6-luna';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.sottotitoli.pro',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ── English: Free Dictionary API ──
async function lookupFreeDictionary(word: string): Promise<{ definition: string | null; pos: string | null; phonetic: string | null; } | null> {
  try {
    const clean = word.toLowerCase().replace(/[^\p{L}'-]/gu, '');
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data) || !data.length) return null;
    const entry = data[0], meaning = entry.meanings?.[0], def = meaning?.definitions?.[0];
    return { definition: def?.definition ?? null, pos: meaning?.partOfSpeech ?? null, phonetic: entry.phonetic ?? entry.phonetics?.[0]?.text ?? null };
  } catch (e) {
    // Best-effort external dictionary. A network or JSON failure means "no entry",
    // and the caller falls back to another provider — but nothing used to say so,
    // which made "dictionary is down" indistinguishable from "word not found".
    console.warn('dictionaryapi lookup failed for "' + clean + '": ' + (e as Error).message);
    return null;
  }
}

// ── English: Datamuse synonyms ──
async function lookupDatamuse(word: string, relation: string): Promise<string[]> {
  try {
    const clean = word.toLowerCase().replace(/[^\p{L}'-]/gu, '');
    const resp = await fetch(`https://api.datamuse.com/words?${relation}=${encodeURIComponent(clean)}&max=5`);
    if (!resp.ok) return [];
    return ((await resp.json()) as any[]).map((d: any) => d.word).slice(0, 5);
  } catch (e) {
    // Same shape as above: an empty synonym list is a valid answer, so the failure
    // has to be recorded somewhere or it is invisible.
    console.warn('datamuse lookup failed for "' + word + '": ' + (e as Error).message);
    return [];
  }
}

// ── Non-English: LLM word lookup ──
async function lookupWithLLM(word: string, contentLang: string, explanationLang: string): Promise<{
  definition: string | null; pos: string | null; synonyms: string[];
}> {
  const LANG_NAMES: Record<string,string> = { en:'English',it:'Italian',fr:'French',de:'German',es:'Spanish',nl:'Dutch',pl:'Polish' };
  const contentName = LANG_NAMES[contentLang] || contentLang;
  const explName = LANG_NAMES[explanationLang] || explanationLang;

  const prompt = `For the ${contentName} word "${word}", provide:
1) Definition in ${explName} (one short sentence)
2) Part of speech (e.g. verb, noun, adjective)
3) Up to 5 synonyms in ${contentName}
Return JSON: {"definition":"...","pos":"...","synonyms":["..."]}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    // gpt-6-luna rejects max_tokens and any non-default temperature.
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_completion_tokens: 150, response_format: { type: 'json_object' } }),
  });
  if (!resp.ok) throw new Error(`llm_error_${resp.status}`);

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    return { definition: parsed.definition || null, pos: parsed.pos || null, synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [] };
  } catch (e) {
    // The model returned something that is not JSON. An empty entry is a valid
    // answer, so without this line the only trace is a poorer result.
    console.warn('LLM returned non-JSON for "' + word + '": ' + (e as Error).message +
      ' — body starts: ' + content.slice(0, 120));
    return { definition: null, pos: null, synonyms: [] };
  }
}

// ── Main ──
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { language: contentLang, explanation_language: explLang, text, context } = await req.json();
    if (!contentLang || !text) throw new Error('language and text required');
    const word = text.trim();

    // ── English: existing fast path ──
    if (contentLang === 'en') {
      const [dictResult, synonyms, antonyms] = await Promise.all([
        lookupFreeDictionary(word), lookupDatamuse(word, 'rel_syn'), lookupDatamuse(word, 'rel_ant'),
      ]);
      return json({ entry: { language: 'en', surface: word, lemma: word.toLowerCase().replace(/[^\p{L}'-]/gu, ''), pos: dictResult?.pos ?? null, definition: dictResult?.definition ?? null, phonetic: dictResult?.phonetic ?? null, synonyms: synonyms.length ? synonyms : null, antonyms: antonyms.length ? antonyms : null, example: context || null } });
    }

    // ── Non-English: LLM ──
    const result = await lookupWithLLM(word, contentLang, explLang || 'en');
    return json({ entry: { language: contentLang, surface: word, lemma: word, pos: result.pos, definition: result.definition, phonetic: null, synonyms: result.synonyms.length ? result.synonyms : null, antonyms: null, example: context || null } });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
