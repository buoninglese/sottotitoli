/**
 * grammar-segment — Server-side grammar correction.
 * Uses Llama 3.1 8B via HF Inference Providers for all languages.
 * Fallback: LanguageTool for English only.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HF_API_TOKEN = Deno.env.get('HF_API_TOKEN') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buoninglese.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── LLM grammar for any language ──
async function grammarWithLLM(text: string, language: string): Promise<{
  corrected: string; explanations: string[];
}> {
  const prompts: Record<string, string> = {
    en: `Fix this English sentence. Rules:
- Fix punctuation, capitalization, and missing apostrophes SILENTLY — do NOT list these as errors.
- Only explain REAL grammar mistakes (verb tense, word order, prepositions, articles, subject-verb agreement, etc).
- If there are multiple grammar errors, list ALL of them.
- Return a JSON object with:
  "corrected": the fully fixed sentence (including silent punctuation/capitalization fixes)
  "explanations": an array of strings, each describing one grammar error in one short sentence. If there are only silent fixes (punctuation etc), return an empty array.

Sentence: ${text}`,
    it: `Correggi questa frase italiana. Regole:
- Correggi punteggiatura, maiuscole e apostrofi in SILENZIO — non elencarli come errori.
- Spiega solo i VERI errori grammaticali (coniugazioni, preposizioni, articoli, concordanza, etc).
- Se ci sono più errori grammaticali, elencali TUTTI.
- Restituisci un JSON con:
  "corrected": la frase completamente corretta (inclusi i fix silenziosi)
  "explanations": array di stringhe, ognuna descrive un errore in una breve frase in inglese. Se ci sono solo fix silenziosi, array vuoto.

Frase: ${text}`,
  };
  const prompt = prompts[language] || prompts['en'];

  const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150, temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  if (!resp.ok) throw new Error(`llm_error_${resp.status}`);

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    return {
      corrected: parsed.corrected || text,
      explanations: Array.isArray(parsed.explanations) ? parsed.explanations : (parsed.explanation ? [parsed.explanation] : []),
    };
  } catch {
    return { corrected: text, explanations: [] };
  }
}

// ── LanguageTool fallback (English only) ──
interface LTMatch {
  message: string; replacements: { value: string }[];
  offset: number; length: number;
  rule: { category: { name: string } };
}

async function grammarWithLanguageTool(text: string): Promise<{
  corrected: string; explanation: string | null; categories: string[];
}> {
  const resp = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'en-US' }),
  });
  if (!resp.ok) throw new Error(`lt_error_${resp.status}`);
  const data = await resp.json();
  const matches: LTMatch[] = data.matches || [];
  let corrected = text;
  if (matches.length > 0) {
    const sorted = [...matches].filter(m => m.replacements?.length).sort((a, b) => b.offset - a.offset);
    for (const m of sorted) corrected = corrected.substring(0, m.offset) + m.replacements[0].value + corrected.substring(m.offset + m.length);
  }
  const explanation = matches.length > 0
    ? matches.map(m => `• ${m.message}${m.replacements?.length ? ' → "' + m.replacements[0].value + '"' : ''} (${m.rule.category.name})`).join('\n')
    : null;
  const categories = [...new Set(matches.map(m => m.rule.category.name))];
  return { corrected, explanation, categories };
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

    const { segmentId, text: directText, language = 'en', mode = 'fix_grammar', provider: reqProvider } = await req.json();
    if (!segmentId && !directText) throw new Error('segmentId or text required');

    const sourceText: string = segmentId
      ? (await supabase.from('transcript_segments').select('source_text,source_language').eq('id', segmentId).single()).data?.source_text || ''
      : directText;
    if (!sourceText) throw new Error('No text to check');

    const lang = segmentId
      ? (await supabase.from('transcript_segments').select('source_language').eq('id', segmentId).single()).data?.source_language || 'en'
      : language;

    let result: { corrected: string; explanations: string[] };
    let usedProvider: string;

    if (reqProvider === 'languagetool' && lang === 'en') {
      const lt = await grammarWithLanguageTool(sourceText);
      result = { corrected: lt.corrected, explanations: lt.explanation ? [lt.explanation] : [] };
      usedProvider = 'languagetool';
    } else if (reqProvider === 'languagetool' && lang !== 'en') {
      const llm = await grammarWithLLM(sourceText, lang);
      result = llm;
      usedProvider = 'llama31_fallback';
    } else {
      try {
        const llm = await grammarWithLLM(sourceText, lang);
        result = llm;
        usedProvider = 'llama31';
      } catch (llmErr) {
        console.warn('LLM failed, fallback:', llmErr);
        if (lang === 'en') {
          try {
            const lt = await grammarWithLanguageTool(sourceText);
            result = { corrected: lt.corrected, explanations: lt.explanation ? [lt.explanation] : [] };
            usedProvider = 'languagetool_fallback';
          } catch (ltErr) { throw new Error(`All providers failed`); }
        } else {
          throw llmErr;
        }
      }
    }

    // Format explanations as bullet points for the frontend
    const explanationText = result.explanations.length > 0
      ? result.explanations.map((e, i) => `${i + 1}. ${e}`).join('\n')
      : null;

    return json({
      grammar: { original_text: sourceText, corrected_text: result.corrected, status: 'complete', provider: usedProvider, mode },
      explanation: explanationText,
      errorCategories: result.categories || [],
      matchCount: result.corrected !== sourceText ? 1 : 0,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
