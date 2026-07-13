/**
 * join-room — Validates an invite token and adds the user to the room.
 * POST /join-room
 * Body: { inviteToken: string, displayName?: string, sourceLanguage?: string }
 * Returns: { room, membership, members, segments }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buoninglese.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const { inviteToken, displayName, sourceLanguage } = await req.json();

    if (!inviteToken || typeof inviteToken !== 'string' || inviteToken.length < 16) {
      throw new Error('Invalid invite token');
    }

    // Hash the provided token
    const tokenHash = await sha256(inviteToken);

    // Use the atomic RPC — eliminates race condition on invite uses
    const { data: result, error: rpcError } = await supabase.rpc(
      'join_room_with_invite',
      {
        p_token_hash: tokenHash,
        p_display_name: displayName || null,
        p_source_language: sourceLanguage || 'en',
      }
    );

    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('invalid_invite')) {
        throw new Error('Invalid or expired invite link');
      }
      if (msg.includes('unauthenticated')) {
        throw new Error('Unauthorized');
      }
      throw new Error(msg || 'Join failed');
    }

    return new Response(
      JSON.stringify(result),
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
