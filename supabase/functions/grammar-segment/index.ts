/**
 * grammar-segment — Server-side grammar correction via Hugging Face CoEdIT / mEdIT.
 * English: grammarly/coedit-large (now)
 * Italian: grammarly/medit-xl (later)
 * Secret: HF_API_TOKEN
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

async function hfGenerate(model: string, prompt: string): Promise<string> {
  if (!HF_API_TOKEN) throw new Error('hf_token_missing');

  const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!resp.ok) throw new Error(`hf_error_${resp.status}`);

  const data = await resp.json();
  // HF returns array or single object
  if (Array.isArray(data)) {
    return data[0]?.generated_text ?? '';
  }
  return (data as any)?.generated_text ?? '';
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

    const { segmentId, mode = 'fix_grammar', provider } = await req.json();
    if (!segmentId) throw new Error('segmentId required');

    // Fetch segment
    const { data: seg, error: segError } = await supabase
      .from('transcript_segments')
      .select('id, room_id, source_text, source_language')
      .eq('id', segmentId)
      .single();

    if (segError || !seg) throw new Error('Segment not found');

    // Verify room membership
    const { data: membership } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', seg.room_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .maybeSingle();

    if (!membership) throw new Error('You are not a member of this room');

    // Determine provider and model
    const resolvedProvider = provider || (seg.source_language === 'it' ? 'medit' : 'coedit');
    const model =
      resolvedProvider === 'medit'
        ? (Deno.env.get('HF_MEDIT_MODEL') || 'grammarly/medit-xl')
        : (Deno.env.get('HF_COEDIT_MODEL') || 'grammarly/coedit-large');

    // Check cache: existing completed grammar entry
    const { data: existing } = await supabase
      .from('segment_grammar')
      .select('*')
      .eq('segment_id', seg.id)
      .eq('language', seg.source_language)
      .eq('provider', resolvedProvider)
      .eq('mode', mode)
      .maybeSingle();

    if (existing && existing.status === 'complete') {
      return json({ grammar: existing });
    }

    // Insert pending row
    await supabase.from('segment_grammar').upsert({
      segment_id: seg.id,
      room_id: seg.room_id,
      language: seg.source_language,
      provider: resolvedProvider,
      mode,
      original_text: seg.source_text,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'segment_id, language, provider, mode',
    });

    // Build prompt
    const prompt =
      mode === 'improve_clarity'
        ? `Improve clarity and fluency: ${seg.source_text}`
        : `Fix grammatical errors in this sentence: ${seg.source_text}`;

    try {
      const correctedText = await hfGenerate(model, prompt);

      const { data: updated } = await supabase
        .from('segment_grammar')
        .update({
          corrected_text: correctedText,
          status: 'complete',
          error_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('segment_id', seg.id)
        .eq('language', seg.source_language)
        .eq('provider', resolvedProvider)
        .eq('mode', mode)
        .select('*')
        .single();

      return json({ grammar: updated });
    } catch (error) {
      const msg = (error as Error).message || '';

      // Mark as failed
      const { data: failed } = await supabase
        .from('segment_grammar')
        .update({
          status: 'failed',
          error_code: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('segment_id', seg.id)
        .eq('language', seg.source_language)
        .eq('provider', resolvedProvider)
        .eq('mode', mode)
        .select('*')
        .single();

      return json({ grammar: failed }, 200);
    }
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
