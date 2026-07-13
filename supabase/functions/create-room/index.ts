/**
 * create-room — Creates a new Traduzione room.
 * POST /create-room
 * Body: { name?: string }
 * Returns: { room: { id, name, status, created_at }, inviteToken: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) throw new Error('Unauthorized');

    const { name } = await req.json().catch(() => ({}));

    // Insert room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        owner_id: user.id,
        name: name || null,
        status: 'draft',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, name, status, created_at')
      .single();

    if (roomError || !room) throw new Error(roomError?.message || 'Failed to create room');

    // Add owner as member
    const memberColor = ['#3b82f6','#22c55e','#ec4899','#f59e0b','#8b5cf6'][Math.floor(Math.random() * 5)];
    const { data: member, error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'owner',
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Host',
        source_language: 'en',
        color: memberColor,
      })
      .select('id, room_id, user_id, display_name, source_language, color, role, left_at')
      .single();

    if (memberError || !member) throw new Error(memberError?.message || 'Failed to add member');

    // Generate invite token (cryptographically secure)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const inviteToken = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash it for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(inviteToken));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store the hash
    const { error: inviteError } = await supabase
      .from('room_invites')
      .insert({
        room_id: room.id,
        token_hash: tokenHash,
        role: 'speaker',
        created_by: user.id,
        max_uses: 10,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteError) throw new Error(inviteError.message);

    return new Response(
      JSON.stringify({
        room: room,
        inviteToken: inviteToken,
        inviteUrl: `${req.headers.get('origin') || ''}/traduzione-s8t.html?invite=${inviteToken}`,
        membership: member,
        members: [member],
        segments: [],
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
