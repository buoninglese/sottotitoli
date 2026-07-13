/**
 * create-invite — Generates a new invite token for an existing room.
 * POST /create-invite
 * Body: { roomId: uuid, role?: string, maxUses?: number, expiryHours?: number }
 *
 * Only the room owner can create invites.
 * Returns the raw token ONCE — it is never stored in plaintext.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buoninglese.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const { roomId, role, maxUses, expiryHours } = await req.json();
    if (!roomId) throw new Error('roomId is required');

    // Verify caller is the room owner
    const { data: membership, error: membError } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (membError || !membership) throw new Error('You are not a member of this room');
    if (membership.role !== 'owner') throw new Error('Only the room owner can create invites');

    // Generate cryptographically secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(inviteToken));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(
      Date.now() + (expiryHours || 24) * 60 * 60 * 1000
    ).toISOString();

    // Store only the hash
    const { error: inviteError } = await supabase
      .from('room_invites')
      .insert({
        room_id: roomId,
        token_hash: tokenHash,
        role: role || 'speaker',
        created_by: user.id,
        max_uses: maxUses || 10,
        expires_at: expiresAt,
      });

    if (inviteError) throw new Error(inviteError.message);

    return new Response(
      JSON.stringify({
        inviteToken: inviteToken,
        inviteUrl: `${req.headers.get('origin') || ''}/traduzione-s8t.html?invite=${inviteToken}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
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
