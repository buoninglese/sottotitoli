/**
 * translate-segment — Server-side translation for a transcript segment.
 * POST /translate-segment
 * Body: { segmentId: uuid, targetLanguage: string }
 *
 * Verifies the caller belongs to the segment's room, calls Google Translate,
 * upserts segment_translations, and returns the updated feed projection.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function translateWithGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${
    encodeURIComponent(sourceLang)
  }&tl=${
    encodeURIComponent(targetLang)
  }&dt=t&q=${encodeURIComponent(text)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Google Translate HTTP ${resp.status}`);

  const data = await resp.json();
  // Format: [[["translated text","original",...]],...]
  if (!data || !data[0] || !data[0][0] || !data[0][0][0]) {
    throw new Error('Could not parse Google Translate response');
  }

  // Concatenate all sentence translations
  let result = '';
  for (const sentence of data[0]) {
    if (sentence && sentence[0]) result += sentence[0];
  }
  return result;
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
        translatedText = await translateWithGoogle(
          segment.source_text,
          segment.source_language || 'en',
          targetLanguage
        );
      } catch (e) {
        status = 'failed';
        errorCode = 'translation_api_error';
        translatedText = '';
      }
    }

    // Upsert translation
    const { data: translation, error: upsertError } = await supabase
      .from('segment_translations')
      .upsert({
        segment_id: segmentId,
        target_language: targetLanguage,
        translated_text: translatedText || null,
        status: status,
        error_code: errorCode,
        provider: 'google',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'segment_id, target_language',
        ignoreDuplicates: false,
      })
      .select('*')
      .single();

    if (upsertError) throw new Error(upsertError.message);

    // Return the updated feed projection
    const { data: feedItem, error: feedError } = await supabase
      .from('room_segment_feed')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (feedError) throw new Error(feedError.message);

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
