/**
 * S8T API Client — calls Supabase Edge Functions for room operations.
 * Requires window.sottotitoliSupabase to be initialized (from js/auth.js).
 */
(function(w){
  'use strict';

  var SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
  var FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';

  async function getSession() {
    var sb = w.sottotitoliSupabase;
    if (!sb) throw new Error('Supabase not initialized');
    var { data } = await sb.auth.getSession();
    if (!data?.session?.access_token) throw new Error('Not authenticated');
    return data.session.access_token;
  }

  async function callFunction(name, body) {
    var token = await getSession();
    var resp = await fetch(FUNCTIONS_BASE + '/' + name, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Function call failed: ' + resp.status);
    return data;
  }

  /**
   * Create a new room. Returns { room, inviteToken, inviteUrl }.
   */
  async function createRoom(name) {
    return callFunction('create-room', { name: name || null });
  }

  /**
   * Join a room via invite token. Returns { room, membership }.
   */
  async function joinRoom(inviteToken, displayName, sourceLanguage) {
    return callFunction('join-room', {
      inviteToken: inviteToken,
      displayName: displayName || null,
      sourceLanguage: sourceLanguage || 'en',
    });
  }

  /**
   * Start a room session (set status to 'live').
   */
  async function startRoom(roomId) {
    return callFunction('start-room', { roomId: roomId });
  }

  /**
   * End a room session (set status to 'ended').
   */
  async function endRoom(roomId) {
    return callFunction('end-room', { roomId: roomId });
  }

  /**
   * Create a final segment via server RPC (resolves speaker from auth.uid()).
   * Returns the full feed-item projection.
   */
  async function createFinalSegment(input) {
    var token = await getSession();
    var sb = w.sottotitoliSupabase;
    var { data, error } = await sb.rpc('create_final_segment', {
      p_room_id: input.roomId,
      p_client_id: input.clientSegmentId,
      p_source_text: input.sourceText,
      p_source_language: input.sourceLanguage
    });
    if (error) throw new Error(error.message || 'create_final_segment failed');
    return data;
  }

  /**
   * Normalize a room_segment_feed row (snake_case) to camelCase segment.
   */
  function mapFeedItem(data) {
    return {
      id: data.id,
      roomId: data.room_id,
      clientSegmentId: data.client_id,
      sequence: data.sequence,

      speakerMemberId: data.speaker_member_id,
      speakerName: data.speaker_name,
      speakerLanguage: data.speaker_language,
      speakerColor: data.speaker_color,

      sourceText: data.source_text,
      sourceLanguage: data.source_language,

      translationText: data.translation_text,
      translationLanguage: data.translation_language,
      translationStatus: data.translation_status,
      translationErrorCode: data.translation_error_code,

      isFinal: data.is_final,
      createdAt: data.created_at
    };
  }

  /**
   * Fetch a single segment with target-language-aware translation.
   * Uses get_room_segment_feed RPC to filter translations by language.
   */
  async function getSegmentFeedItem(segmentId, targetLanguage) {
    var sb = w.sottotitoliSupabase;
    if (!sb) throw new Error('Supabase not initialized');
    targetLanguage = targetLanguage || 'en';

    // Get the room_id for this segment
    var { data: segData, error: segError } = await sb
      .from('transcript_segments')
      .select('room_id')
      .eq('id', segmentId)
      .single();

    if (segError) throw segError;

    // Fetch all segments for the room with target-language translation
    var { data, error } = await sb.rpc('get_room_segment_feed', {
      p_room_id: segData.room_id,
      p_target_language: targetLanguage
    });

    if (error) throw error;

    var item = (data || []).find(function(row) { return row.id === segmentId; });
    if (!item) throw new Error('segment_not_found');

    return { segment: mapFeedItem(item) };
  }

  /**
   * Request server-side translation for a segment.
   * Returns { segment: feedItem } with camelCase fields.
   */
  async function translateSegment(segmentId, targetLanguage) {
    var token = await getSession();
    var resp = await fetch(FUNCTIONS_BASE + '/translate-segment', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segmentId: segmentId,
        targetLanguage: targetLanguage,
      }),
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'translate-segment failed: ' + resp.status);
    // Normalize the raw feed row to camelCase
    return { segment: mapFeedItem(data.segment) };
  }

  // Export
  w.S8T_API = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    startRoom: startRoom,
    endRoom: endRoom,
    createFinalSegment: createFinalSegment,
    getSegmentFeedItem: getSegmentFeedItem,
    translateSegment: translateSegment,
  };

})(window);
