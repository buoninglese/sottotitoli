/**
 * S8T Realtime — Supabase Realtime subscription for transcript segments.
 * Enables true multi-user: when someone in the room sends a sentence,
 * all connected clients receive it instantly.
 */
(function(w){
  'use strict';

  var channel = null;
  var roomId = null;
  var onSegmentReceived = null;  // callback(segment) — called by host app

  /**
   * Subscribe to transcript_segments changes for a specific room.
   * Calls onSegment(segment) for every INSERT event from other users.
   */
  function subscribe(room, onSegment){
    var sb = w.sottotitoliSupabase;
    if (!sb || !room) return false;

    // Unsubscribe from previous channel
    unsubscribe();

    roomId = room;
    onSegmentReceived = onSegment;

    try {
      channel = sb
        .channel('room-' + room)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_segments',
          filter: 'room_id=eq.' + room
        }, function(payload){
          if (onSegmentReceived && payload.new) {
            onSegmentReceived({
              id: payload.new.id,
              sequence: payload.new.sequence,
              sourceText: payload.new.source_text,
              sourceLanguage: payload.new.source_language,
              speakerMemberId: payload.new.speaker_member_id,
              isFinal: payload.new.is_final,
              createdAt: payload.new.created_at
            });
          }
        })
        .subscribe(function(status){
          if (status === 'SUBSCRIBED') {
            console.log('[S8T Realtime] Subscribed to room ' + room);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('[S8T Realtime] Channel status:', status);
          }
        });

      return true;
    } catch(e) {
      console.warn('[S8T Realtime] Subscription failed:', e.message);
      return false;
    }
  }

  /**
   * Unsubscribe from the current room channel.
   */
  function unsubscribe(){
    if (channel) {
      try {
        channel.unsubscribe();
        w.sottotitoliSupabase.removeChannel(channel);
      } catch(e) {}
      channel = null;
    }
    roomId = null;
  }

  /**
   * Check if currently subscribed.
   */
  function isActive(){
    return !!channel && !!roomId;
  }

  // Export
  w.S8T_REALTIME = {
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    isActive: isActive
  };

})(window);
