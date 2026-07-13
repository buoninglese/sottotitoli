/**
 * S8T State — Centralized application state for Traduzione
 * All mutable session state lives here. UI reads from this, never writes directly.
 */
(function(w){
  'use strict';

  // ── Constants ──
  var SPK_COLORS = ['#3b82f6','#22c55e','#ec4899','#f59e0b','#8b5cf6'];

  var LANGS = {
    en:{flag:'🇬🇧',name:'English'},
    it:{flag:'🇮🇹',name:'Italiano'},
    nl:{flag:'🇳🇱',name:'Nederlands'},
    fr:{flag:'🇫🇷',name:'Français'},
    de:{flag:'🇩🇪',name:'Deutsch'},
    es:{flag:'🇪🇸',name:'Español'}
  };

  // ── Core state object ──
  var state = {
    style: 'd1',
    slide: 1,
    session: false,
    sessionState: null,   // null, 'requesting_microphone', 'live_speech', 'live_typed'
    timer: 0,
    timerInt: null,
    roomId: '',
    inviteToken: '',      // raw invite token (only stored on host side)
    isHost: true,         // true = created room, false = joined via invite
    translations: 0,
    myTTL: 'it',
    myName: 'Tu',
    bridging: 'a1',
    speakers: {},
    speakerOrder: [],
    sentences: [],
    nextSpkId: 1
  };

  // ── State query helpers ──
  function getSpeaker(name){ return state.speakers[name] || null; }
  function getSpeakerCount(){ return state.speakerOrder.length; }
  function getColorForIndex(idx){ return SPK_COLORS[idx % SPK_COLORS.length]; }
  function getLang(code){ return LANGS[code] || null; }

  // ── State mutation: speakers ──
  function addSpeaker(name, snl){
    if (state.speakerOrder.length >= 5) return null;
    name = name || ('Partecipante ' + (state.nextSpkId));
    snl = snl || 'en';
    if (state.speakers[name]) { name = name + ' ' + (state.nextSpkId); }
    var color = getColorForIndex(state.speakerOrder.length);
    state.speakers[name] = {snl: snl, color: color, words: 0, wpm: 0, joined: new Date()};
    state.speakerOrder.push(name);
    state.nextSpkId++;
    return name;
  }

  function removeSpeaker(name){
    if (!state.speakers[name]) return false;
    delete state.speakers[name];
    state.speakerOrder = state.speakerOrder.filter(function(n){ return n !== name; });
    state.sentences = state.sentences.filter(function(s){ return s.speaker !== name; });
    return true;
  }

  function renameSpeaker(oldName, newName){
    newName = (newName || '').trim();
    if (!newName || newName === oldName) return false;
    if (state.speakers[newName]) return false;
    state.speakers[newName] = state.speakers[oldName];
    delete state.speakers[oldName];
    state.speakerOrder = state.speakerOrder.map(function(n){ return n === oldName ? newName : n; });
    state.sentences.forEach(function(s){ if (s.speaker === oldName) s.speaker = newName; });
    return true;
  }

  function updateSpeakerSNL(name, snl){
    if (state.speakers[name]) { state.speakers[name].snl = snl; return true; }
    return false;
  }

  // ── State mutation: session ──
  function setSession(active){
    state.session = !!active;
  }

  function addSentenceToState(speaker, orig, tran){
    var sp = state.speakers[speaker];
    if (!sp) return null;
    sp.words += orig.split(/\s+/).length;
    var entry = {speaker: speaker, orig: orig, tran: tran, ts: new Date()};
    state.sentences.push(entry);
    state.translations = state.sentences.length;
    return entry;
  }

  function updateLastTranslation(speaker, newTran){
    var last = state.sentences[state.sentences.length - 1];
    if (!last || last.speaker !== speaker) return false;
    last.tran = newTran;
    return true;
  }

  function updateBridging(mode){
    state.bridging = mode;
    localStorage.setItem('duo-bridging', mode);
  }

  function updateTTL(ttl){
    if (!LANGS[ttl]) return false;
    state.myTTL = ttl;
    localStorage.setItem('duo-my-ttl', ttl);
    return true;
  }

  // ── State mutation: style ──
  function setStyle(style){
    state.style = style;
  }

  function getStyleForCount(){
    var n = state.speakerOrder.length;
    if (n >= 3) return 'd3';
    if (n === 2) return 'd2';
    return 'd1';
  }

  function getColorClassForCount(){
    return 's' + Math.min(state.speakerOrder.length, 5);
  }

  // ── Room ──
  // Room IDs are server-authoritative. No local generation.

  function initRoom(){
    var params = new URLSearchParams(window.location.search);

    // Invite-based join: ?invite=<TOKEN>
    var inviteToken = params.get('invite');
    if (inviteToken && inviteToken.length >= 16) {
      state.inviteToken = inviteToken;
      state.isHost = false;
      state.myName = 'Guest';
      state.roomId = ''; // Will be set after join-room API call
      return 'invite'; // Signal: needs to call join-room API
    }

    // Host mode: roomId set by server create-room API
    // No local generation — empty until server assigns one
    state.roomId = localStorage.getItem('duo-room-id') || '';
    state.isHost = true;
    return 'host';
  }

  // ── Export ──
  w.S8T = {
    // Constants (read-only)
    LANGS: LANGS,
    SPK_COLORS: SPK_COLORS,

    // State object (read/write via provided functions)
    state: state,

    // Query
    getSpeaker: getSpeaker,
    getSpeakerCount: getSpeakerCount,
    getColorForIndex: getColorForIndex,
    getLang: getLang,

    // Speaker mutations
    addSpeaker: addSpeaker,
    removeSpeaker: removeSpeaker,
    renameSpeaker: renameSpeaker,
    updateSpeakerSNL: updateSpeakerSNL,

    // Session mutations
    setSession: setSession,
    addSentenceToState: addSentenceToState,
    updateLastTranslation: updateLastTranslation,
    updateBridging: updateBridging,
    updateTTL: updateTTL,

    // Style
    setStyle: setStyle,
    getStyleForCount: getStyleForCount,
    getColorClassForCount: getColorClassForCount,

    // Room
    initRoom: initRoom
  };

})(window);
