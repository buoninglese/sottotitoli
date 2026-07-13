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
  'Access-Control-Allow-Origin': '*',
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

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('room_invites')
      .select('id, room_id, role, max_uses, uses, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single();

    if (inviteError || !invite) throw new Error('Invalid or expired invite link');

    // Validate invite
    if (invite.revoked_at) throw new Error('This invite has been revoked');
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invite has expired');
    if (invite.uses >= invite.max_uses) throw new Error('This invite has reached its maximum uses');

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('room_members')
      .select('id, left_at')
      .eq('room_id', invite.room_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && !existing.left_at) {
      // Already a member — return full membership
      const { data: room } = await supabase
        .from('rooms')
        .select('id, name, status')
        .eq('id', invite.room_id)
        .single();

      const { data: membership } = await supabase
        .from('room_members')
        .select('id, room_id, user_id, display_name, source_language, color, role, left_at')
        .eq('id', existing.id)
        .single();

      const { data: members } = await supabase
        .from('room_members')
        .select('id, room_id, user_id, display_name, source_language, color, role, left_at')
        .eq('room_id', invite.room_id)
        .is('left_at', null);

      const { data: segments } = await supabase
        .from('room_segment_feed')
        .select('*')
        .eq('room_id', invite.room_id)
        .order('sequence', { ascending: true });

      return new Response(
        JSON.stringify({
          room: room,
          membership: membership,
          members: members || [],
          segments: segments || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If they left before, re-activate membership
    if (existing && existing.left_at) {
      await supabase
        .from('room_members')
        .update({ left_at: null, role: invite.role, joined_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Add new member
      const memberColor = ['#3b82f6','#22c55e','#ec4899','#f59e0b','#8b5cf6'][Math.floor(Math.random() * 5)];
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: invite.room_id,
          user_id: user.id,
          role: invite.role,
          display_name: displayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest',
          source_language: sourceLanguage || 'en',
          color: memberColor,
        });

      if (memberError) throw new Error(memberError.message);
    }

    // Increment invite uses
    await supabase
      .from('room_invites')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id);

    // Get room info
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name, status')
      .eq('id', invite.room_id)
      .single();

    // Get the membership row
    const { data: membership } = await supabase
      .from('room_members')
      .select('id, room_id, user_id, display_name, source_language, color, role, left_at')
      .eq('room_id', invite.room_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    // Get all active members
    const { data: members } = await supabase
      .from('room_members')
      .select('id, room_id, user_id, display_name, source_language, color, role, left_at')
      .eq('room_id', invite.room_id)
      .is('left_at', null);

    // Get existing segments
    const { data: segments } = await supabase
      .from('room_segment_feed')
      .select('*')
      .eq('room_id', invite.room_id)
      .order('sequence', { ascending: true });

    return new Response(
      JSON.stringify({
        room: room,
        membership: membership,
        members: members || [],
        segments: segments || [],
      }),
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
