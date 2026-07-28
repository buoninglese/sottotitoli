/**
 * grammar-segment — Server-side grammar correction.
 * Uses Llama via HF Inference Providers. Language-agnostic:
 * content_language = language of text to analyze
 * explanation_language = language to write explanations in
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HF_API_TOKEN = Deno.env.get('HF_API_TOKEN') || '';
const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.sottotitoli.pro',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ── Dynamic prompt builder — no hardcoded languages ──
function buildPrompt(text: string, contentLang: string, explanationLang: string): string {
  const LANG_NAMES: Record<string, string> = {
    en:'English',it:'Italian',fr:'French',de:'German',es:'Spanish',nl:'Dutch',pl:'Polish'
  };
  const contentName = LANG_NAMES[contentLang] || contentLang;
  const explName = LANG_NAMES[explanationLang] || explanationLang;

  return `You are a strict but fair ${contentName} grammar checker. Your ONLY job is to find REAL grammar errors — nothing else.

CRITICAL: Most sentences are already correct. If the sentence has no grammar errors, your corrected text MUST be identical to the original and explanations MUST be empty. This is the most common case.

EXAMPLES of CORRECT sentences (return empty explanations):
- "Let's start to see if this works." → corrected: "Let's start to see if this works." explanations: []
- "The company announced a major breakthrough." → corrected: "The company announced a major breakthrough." explanations: []
- "She went to the store yesterday." → corrected: "She went to the store yesterday." explanations: []

EXAMPLES of REAL errors:
- "He go to school." → corrected: "He goes to school." explanations: ["Subject-verb agreement: 'go' should be 'goes' for third-person singular."]
- "I have seen her yesterday." → corrected: "I saw her yesterday." explanations: ["Verb tense: use simple past 'saw' instead of present perfect with 'yesterday'."]

RULES:
- A gerund (-ing verb) as a sentence subject is CORRECT grammar. Do NOT flag it.
- Fix punctuation, capitalization, and apostrophes SILENTLY in corrected text — do NOT list these in explanations.
- Only list errors you are 100% CERTAIN about. If unsure, skip it.
- Do NOT flag: stylistic choices, word preferences, idiomatic expressions, "could be clearer" suggestions.
- Only flag: wrong verb tense/conjugation, subject-verb disagreement, wrong preposition, missing/wrong article, wrong word order, number/gender/case errors.
- Write ALL explanations in ${explName}. ONE short sentence per error.

Return ONLY a JSON object:
{"corrected": "the fixed sentence", "explanations": ["error 1", "error 2"]}

Sentence: ${text}`;
}

// ── LLM call ──
async function grammarWithLLM(text: string, contentLang: string, explanationLang: string, modelId?: string): Promise<{
  corrected: string; explanations: string[];
}> {
  const prompt = buildPrompt(text, contentLang, explanationLang);
  const model = modelId || DEFAULT_MODEL;

  const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0, response_format: { type: 'json_object' } }),
  });
  if (!resp.ok) throw new Error(`llm_error_${resp.status}`);

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(content);
    const corrected = parsed.corrected || text;
    const explanations = Array.isArray(parsed.explanations) ? parsed.explanations : (parsed.explanation ? [parsed.explanation] : []);
    // Post-processing: if corrected text is identical to original (ignoring case/punctuation),
    // the LLM hallucinated errors — clear them
    const normalized = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (normalized(corrected) === normalized(text) && explanations.length > 0) {
      console.log('Post-process: corrected text unchanged, clearing', explanations.length, 'hallucinated explanations');
      return { corrected: text, explanations: [] };
    }
    return { corrected, explanations };
  } catch { return { corrected: text, explanations: [] }; }
}

// ── LanguageTool fallback (English only) ──
interface LTMatch { message: string; replacements: { value: string }[]; offset: number; length: number; rule: { category: { name: string } }; }
async function grammarWithLanguageTool(text: string): Promise<{ corrected: string; explanation: string | null; }> {
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
  const explanation = matches.length > 0 ? matches.map(m => `• ${m.message}${m.replacements?.length ? ' → "' + m.replacements[0].value + '"' : ''} (${m.rule.category.name})`).join('\n') : null;
  return { corrected, explanation };
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

    const { segmentId, text: directText, content_language, explanation_language, mode = 'fix_grammar', provider: reqProvider, model: reqModel } = await req.json();
    if (!segmentId && !directText) throw new Error('segmentId or text required');

    const sourceText = segmentId
      ? (await supabase.from('transcript_segments').select('source_text,source_language').eq('id', segmentId).single()).data?.source_text || ''
      : directText;
    if (!sourceText) throw new Error('No text to check');

    // Resolve content language: segment's language → explicit param → default
    const contentLang = segmentId
      ? (await supabase.from('transcript_segments').select('source_language').eq('id', segmentId).single()).data?.source_language || content_language || 'en'
      : content_language || 'en';
    const explLang = explanation_language || 'en';
    const model = reqModel || DEFAULT_MODEL;
    const provider = reqProvider || 'llama31';

    let result: { corrected: string; explanations: string[] };
    let usedProvider: string;

    if (provider === 'languagetool' && contentLang === 'en') {
      const lt = await grammarWithLanguageTool(sourceText);
      result = { corrected: lt.corrected, explanations: lt.explanation ? [lt.explanation] : [] };
      usedProvider = 'languagetool';
    } else {
      try {
        const llm = await grammarWithLLM(sourceText, contentLang, explLang, model);
        result = llm;
        usedProvider = model.includes('3.3') ? 'llama33' : model.includes('4-') ? 'llama4' : 'llama31';
      } catch (llmErr) {
        console.warn('LLM failed, fallback:', llmErr);
        if (contentLang === 'en') {
          try {
            const lt = await grammarWithLanguageTool(sourceText);
            result = { corrected: lt.corrected, explanations: lt.explanation ? [lt.explanation] : [] };
            usedProvider = 'languagetool_fallback';
          } catch (ltErr) { throw new Error('All providers failed'); }
        } else { throw llmErr; }
      }
    }

    const explanationText = result.explanations.length > 0
      ? result.explanations.map((e, i) => `${i + 1}. ${e}`).join('\n')
      : null;

    return json({
      grammar: { original_text: sourceText, corrected_text: result.corrected, status: 'complete', provider: usedProvider, mode },
      explanation: explanationText, errorCategories: [], matchCount: result.corrected !== sourceText ? 1 : 0,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
