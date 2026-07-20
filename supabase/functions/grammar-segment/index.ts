/**
 * grammar-segment — Server-side grammar correction.
 * Uses Llama 3.1/3.3/4 via HF Inference Providers for 7 languages.
 * Fallback: LanguageTool for English only.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HF_API_TOKEN = Deno.env.get('HF_API_TOKEN') || '';
const DEFAULT_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

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

// ── LLM grammar — 7 languages ──
const PROMPTS: Record<string, string> = {
  en: 'Fix this English sentence. Rules:\n- Fix punctuation, capitalization, and missing apostrophes SILENTLY — do NOT list these as errors.\n- Only explain REAL grammar mistakes (verb tense, word order, prepositions, articles, subject-verb agreement, etc).\n- If there are multiple grammar errors, list ALL of them.\n- Return JSON: {"corrected":"...","explanations":["error 1","error 2"]}. If only silent fixes, return empty explanations array.\n\nSentence: ',
  it: 'Correggi questa frase italiana. Regole:\n- Correggi punteggiatura, maiuscole e apostrofi in SILENZIO — non elencarli.\n- Spiega solo VERI errori grammaticali (coniugazioni, preposizioni, articoli, concordanza, etc).\n- Più errori = elencali TUTTI.\n- Restituisci JSON: {"corrected":"...","explanations":["errore 1","errore 2"]}.\n\nFrase: ',
  fr: 'Corrige cette phrase française. Règles:\n- Corrige ponctuation, majuscules et apostrophes en SILENCE — ne les liste PAS.\n- Explique uniquement les VRAIES erreurs (conjugaison, accords, prépositions, articles).\n- Erreurs multiples = liste-les TOUTES.\n- Retourne JSON: {"corrected":"...","explanations":["erreur 1","erreur 2"]}.\n\nPhrase: ',
  de: 'Korrigiere diesen deutschen Satz. Regeln:\n- Korrigiere Zeichensetzung, Großschreibung und Apostrophe STILLSCHWEIGEND.\n- Erkläre nur ECHTE Grammatikfehler (Konjugation, Wortstellung, Präpositionen, Artikel, Kasus).\n- Mehrere Fehler = ALLE auflisten.\n- JSON: {"corrected":"...","explanations":["Fehler 1","Fehler 2"]}.\n\nSatz: ',
  es: 'Corrige esta frase en español. Reglas:\n- Corrige puntuación, mayúsculas y apóstrofes en SILENCIO.\n- Explica solo ERRORES reales (conjugación, concordancia, preposiciones, artículos).\n- Múltiples errores = enuméralos TODOS.\n- JSON: {"corrected":"...","explanations":["error 1","error 2"]}.\n\nFrase: ',
  nl: 'Corrigeer deze Nederlandse zin. Regels:\n- Corrigeer interpunctie, hoofdletters en apostrofs STILZWIJGEND.\n- Leg alleen ECHTE grammaticafouten uit (vervoeging, woordvolgorde, voorzetsels, lidwoorden).\n- Meerdere fouten = ALLEMAAL vermelden.\n- JSON: {"corrected":"...","explanations":["fout 1","fout 2"]}.\n\nZin: ',
  pl: 'Popraw tę polską frazę. Zasady:\n- Popraw interpunkcję, wielkie litery i apostrofy PO CICHU.\n- Wyjaśniaj tylko PRAWDZIWE błędy (koniugacja, przypadki, przyimki, rodzaj).\n- Wiele błędów = wymień WSZYSTKIE.\n- JSON: {"corrected":"...","explanations":["błąd 1","błąd 2"]}.\n\nFraza: ',
};

async function grammarWithLLM(text: string, language: string, modelId?: string): Promise<{
  corrected: string; explanations: string[];
}> {
  const prefix = PROMPTS[language] || PROMPTS['en'];
  const model = modelId || DEFAULT_MODEL;

  const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prefix + text }],
      max_tokens: 200, temperature: 0,
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
  } catch { return { corrected: text, explanations: [] }; }
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
  return { corrected, explanation, categories: [...new Set(matches.map(m => m.rule.category.name))] };
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

    const { segmentId, text: directText, language = 'en', mode = 'fix_grammar', provider: reqProvider, llama_model } = await req.json();
    if (!segmentId && !directText) throw new Error('segmentId or text required');

    const sourceText: string = segmentId
      ? (await supabase.from('transcript_segments').select('source_text,source_language').eq('id', segmentId).single()).data?.source_text || ''
      : directText;
    if (!sourceText) throw new Error('No text to check');

    const lang = segmentId
      ? (await supabase.from('transcript_segments').select('source_language').eq('id', segmentId).single()).data?.source_language || 'en'
      : language;

    const modelId = llama_model || DEFAULT_MODEL;
    let result: { corrected: string; explanations: string[] };
    let usedProvider: string;

    if (reqProvider === 'languagetool' && lang === 'en') {
      const lt = await grammarWithLanguageTool(sourceText);
      result = { corrected: lt.corrected, explanations: lt.explanation ? [lt.explanation] : [] };
      usedProvider = 'languagetool';
    } else {
      try {
        const llm = await grammarWithLLM(sourceText, lang, modelId);
        result = llm;
        usedProvider = modelId.includes('3.3') ? 'llama33' : modelId.includes('4-') ? 'llama4' : 'llama31';
      } catch (llmErr) {
        console.warn('LLM failed, fallback:', llmErr);
        if (lang === 'en') {
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
      explanation: explanationText,
      errorCategories: [],
      matchCount: result.corrected !== sourceText ? 1 : 0,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
