/**
 * S8T Realtime — Supabase Realtime subscription with feed-item resolution.
 * Subscribes to transcript_segments INSERT + segment_translations UPDATE.
 * Fetches full room_segment_feed projection for every event,
 * so the client always receives speaker identity + translation state.
 */
(function(window){
  'use strict';

  var channel = null;
  var activeRoomId = null;

  function subscribe(roomId, targetLanguage, onUpsert) {
    var supabase = window.sottotitoliSupabase;
    if (!supabase || !roomId) {
      return false;
    }

    // Support both old (roomId, onUpsert) and new (roomId, targetLanguage, onUpsert) signatures
    if (typeof targetLanguage === 'function') {
      onUpsert = targetLanguage;
      targetLanguage = 'en';
    }

    unsubscribe();
    activeRoomId = roomId;
    var ttl = targetLanguage || 'en';

    channel = supabase
      .channel('room-segments:' + roomId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_segments',
          filter: 'room_id=eq.' + roomId
        },
        async function(payload) {
          if (!payload.new || !payload.new.id) return;
          try {
            var result = await window.S8T_API.getSegmentFeedItem(payload.new.id, ttl);
            if (result && result.segment && result.segment.roomId === activeRoomId) {
              onUpsert(result.segment);
            }
          } catch(error) {
            console.error('[S8T Realtime] Cannot fetch incoming segment', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'segment_translations'
        },
        async function(payload) {
          if (!payload.new || !payload.new.segment_id) return;
          try {
            var result = await window.S8T_API.getSegmentFeedItem(payload.new.segment_id, ttl);
            if (result && result.segment && result.segment.roomId === activeRoomId) {
              onUpsert(result.segment);
            }
          } catch(error) {
            console.error('[S8T Realtime] Cannot fetch translation update', error);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[S8T Realtime] Subscribed to room', roomId);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[S8T Realtime] Channel status:', status);
        }
      });

    return true;
  }

  function unsubscribe() {
    if (channel && window.sottotitoliSupabase) {
      try { window.sottotitoliSupabase.removeChannel(channel); } catch(e) {}
    }
    channel = null;
    activeRoomId = null;
  }

  function isActive() { return channel !== null; }

  window.S8T_REALTIME = {
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    isActive: isActive,
    activeRoomId: function(){ return activeRoomId; }
  };
})(window);
