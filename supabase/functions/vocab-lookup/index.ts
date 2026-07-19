/**
 * vocab-lookup — Server-side vocabulary enrichment.
 * English: delegates to existing client-side compromise.js + Datamuse / Free Dictionary API.
 *   This edge function acts as the canonical cache + save layer.
 * Italian: basic dictionary lookup (later).
 *
 * Secrets: none required (uses existing infrastructure)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buoninglese.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── English: Free Dictionary API ──
async function lookupFreeDictionary(word: string): Promise<{
  definition: string | null;
  pos: string | null;
  phonetic: string | null;
} | null> {
  try {
    const clean = word.toLowerCase().replace(/[^\p{L}'-]/gu, '');
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data) || !data.length) return null;

    const entry = data[0];
    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0];

    return {
      definition: def?.definition ?? null,
      pos: meaning?.partOfSpeech ?? null,
      phonetic: entry.phonetic ?? entry.phonetics?.[0]?.text ?? null,
    };
  } catch {
    return null;
  }
}

// ── English: Datamuse (related words, synonyms) ──
async function lookupDatamuse(word: string, relation: string): Promise<string[]> {
  try {
    const clean = word.toLowerCase().replace(/[^\p{L}'-]/gu, '');
    const resp = await fetch(
      `https://api.datamuse.com/words?${relation}=${encodeURIComponent(clean)}&max=5`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data as any[]).map((d: any) => d.word).slice(0, 5);
  } catch {
    return [];
  }
}

// ── CEFR level guess (simple heuristic based on word length + frequency lists) ──
const CEFR_A1_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say','her',
  'she','or','an','will','my','one','all','would','there','their','what','so','up',
  'out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','us','great','big','house',
  'water','food','mother','father','brother','sister','man','woman','child','school',
  'book','dog','cat','car','city','country','friend','family','love','hello','goodbye',
  'yes','no','please','thank','sorry','morning','night','today','tomorrow','yesterday',
]);

function guessCEFR(word: string): string | null {
  const clean = word.toLowerCase().trim();
  if (CEFR_A1_WORDS.has(clean)) return 'A1';
  if (clean.length <= 4) return 'A1';  // short words tend to be common
  if (clean.length <= 7) return 'A2';
  if (clean.length <= 10) return 'B1';
  return 'B2';  // longer words tend to be more advanced
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { language, text, context } = await req.json();
    if (!language || !text) throw new Error('language and text required');

    // ── English lookup ──
    if (language === 'en') {
      const word = text.trim();
      const [dictResult, synonyms, antonyms] = await Promise.all([
        lookupFreeDictionary(word),
        lookupDatamuse(word, 'rel_syn'),
        lookupDatamuse(word, 'rel_ant'),
      ]);

      return json({
        entry: {
          language: 'en',
          surface: word,
          lemma: word.toLowerCase().replace(/[^\p{L}'-]/gu, ''),
          pos: dictResult?.pos ?? null,
          definition: dictResult?.definition ?? null,
          phonetic: dictResult?.phonetic ?? null,
          cefr: guessCEFR(word),
          synonyms: synonyms.length ? synonyms : null,
          antonyms: antonyms.length ? antonyms : null,
          example: context || null,
        },
      });
    }

    // ── Italian lookup (basic for now) ──
    if (language === 'it') {
      return json({
        entry: {
          language: 'it',
          surface: text,
          lemma: text.toLowerCase().trim(),
          pos: null,
          definition: null,
          cefr: null,
          example: context || null,
        },
      });
    }

    throw new Error('unsupported_language');
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
