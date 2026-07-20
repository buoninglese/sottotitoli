/**
 * grammar-segment — Server-side grammar correction via LanguageTool.
 * Free tier: 500 req/day. No API key needed.
 * Returns: corrected text + error explanations + rule categories.
 * English only for now (Italian later via LanguageTool it-IT).
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

interface LTMatch {
  message: string; shortMessage: string;
  replacements: { value: string }[];
  offset: number; length: number;
  rule: { id: string; description: string; category: { id: string; name: string } };
}

function applyCorrections(text: string, matches: LTMatch[]): string {
  const sorted = [...matches]
    .filter(m => m.replacements && m.replacements.length > 0)
    .sort((a, b) => b.offset - a.offset);
  let result = text;
  for (const m of sorted) {
    result = result.substring(0, m.offset) + m.replacements[0].value + result.substring(m.offset + m.length);
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { segmentId, text: directText, mode = 'fix_grammar' } = await req.json();
    if (!segmentId && !directText) throw new Error('segmentId or text required');

    const provider = 'languagetool';
    let sourceText: string;
    let segId: string;
    let roomId: string;
    let sourceLanguage = 'en';

    if (segmentId) {
      // DB-backed mode: fetch segment, verify room membership
      const { data: seg, error: segError } = await supabase
        .from('transcript_segments')
        .select('id, room_id, source_text, source_language')
        .eq('id', segmentId).single();
      if (segError || !seg) throw new Error('Segment not found');

      const { data: membership } = await supabase
        .from('room_members').select('id')
        .eq('room_id', seg.room_id).eq('user_id', user.id).is('left_at', null).maybeSingle();
      if (!membership) throw new Error('You are not a member of this room');

      if (seg.source_language !== 'en') throw new Error('Grammar correction currently supports English only');
      sourceText = seg.source_text;
      segId = seg.id;
      roomId = seg.room_id;
      sourceLanguage = seg.source_language;
    } else {
      // Direct text mode: no DB segment needed — call LanguageTool directly, skip DB cache
      sourceText = directText;
      segId = ''; // signal: no DB persistence
      roomId = '';
      sourceLanguage = 'en';
    }

    // Only use DB cache for real segments (not direct text)
    if (segId && segId.length === 36) {
      // Check cache
      const { data: existing } = await supabase
        .from('segment_grammar').select('*')
        .eq('segment_id', segId).eq('language', sourceLanguage)
        .eq('provider', provider).eq('mode', mode).maybeSingle();
      if (existing && existing.status === 'complete') {
        return json({ grammar: existing });
      }

      // Insert pending
      await supabase.from('segment_grammar').upsert({
        segment_id: segId, room_id: roomId, language: sourceLanguage,
        provider, mode, original_text: sourceText, status: 'pending',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'segment_id, language, provider, mode' });
    }

    try {
      const ltResp = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: sourceText, language: 'en-US' }),
      });
      if (!ltResp.ok) throw new Error(`lt_error_${ltResp.status}`);

      const ltData = await ltResp.json();
      const matches: LTMatch[] = ltData.matches || [];

      let correctedText = sourceText;
      let explanation: string | null = null;
      let errorCategories: string[] = [];

      if (matches.length > 0) {
        correctedText = applyCorrections(sourceText, matches);
        explanation = matches.map(m => `• ${m.message}${m.replacements?.length ? ' → "' + m.replacements[0].value + '"' : ''} (${m.rule.category.name})`).join('\n');
        errorCategories = [...new Set(matches.map(m => m.rule.category.name))];
      }

      // Only persist to DB for real segments
      if (segId && segId.length === 36) {
        const { data: updated } = await supabase
          .from('segment_grammar')
          .update({ corrected_text: correctedText, status: 'complete', error_code: null, updated_at: new Date().toISOString() })
          .eq('segment_id', segId).eq('language', sourceLanguage).eq('provider', provider).eq('mode', mode)
          .select('*').single();
        return json({ grammar: updated, explanation, errorCategories, matchCount: matches.length });
      }

      // Direct text mode: return result without persisting
      return json({
        grammar: { original_text: sourceText, corrected_text: correctedText, status: 'complete', provider, mode },
        explanation, errorCategories, matchCount: matches.length
      });
    } catch (error) {
      const msg = (error as Error).message || '';
      if (segId && segId.length === 36) {
        await supabase.from('segment_grammar')
          .update({ status: 'failed', error_code: msg, updated_at: new Date().toISOString() })
          .eq('segment_id', segId).eq('language', sourceLanguage).eq('provider', provider).eq('mode', mode);
      }
      return json({ grammar: null, error: msg }, 200);
    }
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
