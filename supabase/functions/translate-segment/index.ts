/**
 * translate-segment — Server-side translation via Google Cloud Translation API.
 * Requires a Cloud Translation API key.
 * Secret: GOOGLE_TRANSLATE_API_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_KEY = Deno.env.get('GOOGLE_TRANSLATE_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buoninglese.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function withTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('translation_timeout')), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}

async function translateWithGoogleCloud(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!API_KEY) throw new Error('translation_provider_not_configured');

  const resp = await fetch(
    `https://translation.googleapis.com/language/translate/v2`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
        key: API_KEY,
      }),
    }
  );

  if (!resp.ok) {
    const status = resp.status;
    if (status === 403 || status === 429) throw new Error('translation_rate_limited');
    throw new Error('translation_provider_unavailable');
  }

  const body = await resp.json();
  const translated = body?.data?.translations?.[0]?.translatedText;
  if (!translated) throw new Error('translation_provider_invalid_response');
  return translated;
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

    const { segmentId, targetLanguage } = await req.json();
    if (!segmentId || !targetLanguage) throw new Error('segmentId and targetLanguage required');

    // Fetch the segment with room info
    const { data: segment, error: segError } = await supabase
      .from('transcript_segments')
      .select('id, room_id, source_text, source_language')
      .eq('id', segmentId)
      .single();

    if (segError || !segment) throw new Error('Segment not found');

    // Verify caller is a room member
    const { data: membership, error: membError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', segment.room_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .maybeSingle();

    if (membError || !membership) throw new Error('You are not a member of this room');

    // If source and target are the same, store as-is
    let translatedText: string;
    let status = 'complete';
    let errorCode: string | null = null;

    if (segment.source_language === targetLanguage) {
      translatedText = segment.source_text;
    } else {
      try {
        translatedText = await withTimeout(
          translateWithGoogleCloud(
            segment.source_text,
            segment.source_language || 'en',
            targetLanguage
          )
        );
      } catch (e) {
        status = 'failed';
        const msg = (e as Error).message || '';
        if (msg.includes('not_configured')) errorCode = 'translation_provider_not_configured';
        else if (msg.includes('timeout')) errorCode = 'translation_timeout';
        else if (msg.includes('rate_limited')) errorCode = 'translation_rate_limited';
        else if (msg.includes('unavailable')) errorCode = 'translation_provider_unavailable';
        else if (msg.includes('invalid_response')) errorCode = 'translation_provider_invalid_response';
        else errorCode = 'translation_api_error';
        translatedText = '';
      }
    }

    // Upsert translation (keyed by segment_id + target_language)
    const { error: upsertError } = await supabase
      .from('segment_translations')
      .upsert({
        segment_id: segmentId,
        room_id: segment.room_id,
        target_language: targetLanguage,
        translated_text: translatedText || null,
        status: status,
        error_code: errorCode,
        provider: 'google_cloud',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'segment_id, target_language',
        ignoreDuplicates: false,
      });

    if (upsertError) throw new Error(upsertError.message);

    // Return the updated feed projection using target-language-aware RPC
    const { data: feedData, error: feedError } = await supabase.rpc(
      'get_room_segment_feed',
      {
        p_room_id: segment.room_id,
        p_target_language: targetLanguage,
      }
    );

    if (feedError) throw new Error(feedError.message);

    const feedItem = (feedData || []).find((row: any) => row.id === segmentId);
    if (!feedItem) throw new Error('segment_not_found');

    return new Response(
      JSON.stringify({ segment: feedItem }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: err.message === 'Unauthorized' ? 401 : 400,
      }
    );
  }
});
