/**
 * grammar-segment — Server-side grammar correction.
 * Primary: Llama 3.1 8B via HF Inference Providers (Groq) — $0.0000017/check
 * Fallback: LanguageTool — free, rule-based
 * English only for now.
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
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Primary: LLM grammar via Inference Providers ──
async function grammarWithLLM(text: string): Promise<{
  corrected: string; explanation: string | null;
}> {
  const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [{
        role: 'user',
        content: `Fix the grammar in this sentence. Return a JSON object with two fields: "corrected" (the fixed sentence) and "explanation" (what was wrong, in one short sentence).\n\nSentence: ${text}`,
      }],
      max_tokens: 120,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) throw new Error(`llm_error_${resp.status}`);

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  
  // Parse JSON response
  try {
    const parsed = JSON.parse(content);
    return {
      corrected: parsed.corrected || text,
      explanation: parsed.explanation || null,
    };
  } catch {
    // If JSON parse fails, try to extract from raw text
    const correctedMatch = content.match(/corrected[:\s]*"?([^"\n]+)"?/i);
    return {
      corrected: correctedMatch ? correctedMatch[1].trim() : text,
      explanation: content.substring(0, 200),
    };
  }
}

// ── Fallback: LanguageTool ──
interface LTMatch {
  message: string;
  replacements: { value: string }[];
  offset: number; length: number;
  rule: { category: { name: string } };
}

async function grammarWithLanguageTool(text: string): Promise<{
  corrected: string; explanation: string | null; categories: string[];
}> {
  const resp = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'en-US' }),
  });
  if (!resp.ok) throw new Error(`lt_error_${resp.status}`);

  const data = await resp.json();
  const matches: LTMatch[] = data.matches || [];

  let corrected = text;
  let explanation: string | null = null;
  const categories: string[] = [];

  if (matches.length > 0) {
    const sorted = [...matches]
      .filter(m => m.replacements?.length)
      .sort((a, b) => b.offset - a.offset);
    for (const m of sorted) {
      corrected = corrected.substring(0, m.offset) + m.replacements[0].value + corrected.substring(m.offset + m.length);
    }
    explanation = matches.map(m =>
      `• ${m.message}${m.replacements?.length ? ' → "' + m.replacements[0].value + '"' : ''} (${m.rule.category.name})`
    ).join('\n');
    categories.push(...new Set(matches.map(m => m.rule.category.name)));
  }

  return { corrected, explanation, categories };
}

// ── Main handler ──
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { segmentId, text: directText, mode = 'fix_grammar', provider: reqProvider } = await req.json();
    if (!segmentId && !directText) throw new Error('segmentId or text required');

    const sourceText: string = segmentId
      ? (await supabase.from('transcript_segments').select('source_text').eq('id', segmentId).single()).data?.source_text || ''
      : directText;

    if (!sourceText) throw new Error('No text to check');

    let result: { corrected: string; explanation: string | null; categories?: string[] };
    let usedProvider: string;

    // Try LLM first (PRO required), fall back to LanguageTool
    if (reqProvider === 'languagetool') {
      // Explicit fallback requested
      const lt = await grammarWithLanguageTool(sourceText);
      result = lt;
      usedProvider = 'languagetool';
    } else {
      try {
        const llm = await grammarWithLLM(sourceText);
        result = { corrected: llm.corrected, explanation: llm.explanation };
        usedProvider = 'llama31';
      } catch (llmErr) {
        console.warn('LLM grammar failed, falling back to LanguageTool:', llmErr);
        try {
          const lt = await grammarWithLanguageTool(sourceText);
          result = lt;
          usedProvider = 'languagetool_fallback';
        } catch (ltErr) {
          throw new Error(`All grammar providers failed: ${ltErr}`);
        }
      }
    }

    // Persist to DB if we have a real segment
    if (segmentId) {
      const { data: seg } = await supabase.from('transcript_segments').select('room_id,source_language').eq('id', segmentId).single();
      if (seg) {
        await supabase.from('segment_grammar').upsert({
          segment_id: segmentId, room_id: seg.room_id, language: seg.source_language,
          provider: usedProvider, mode, original_text: sourceText, status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'segment_id, language, provider, mode' });

        await supabase.from('segment_grammar').update({
          corrected_text: result.corrected, status: 'complete',
          updated_at: new Date().toISOString(),
        }).eq('segment_id', segmentId).eq('language', seg.source_language).eq('provider', usedProvider).eq('mode', mode);
      }
    }

    return json({
      grammar: {
        original_text: sourceText,
        corrected_text: result.corrected,
        status: 'complete',
        provider: usedProvider,
        mode,
      },
      explanation: result.explanation,
      errorCategories: result.categories || [],
      matchCount: result.corrected !== sourceText ? 1 : 0,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
