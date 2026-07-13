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

  // Export
  w.S8T_API = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    startRoom: startRoom,
    endRoom: endRoom,
  };

})(window);
