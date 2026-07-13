/**
 * S8T State — Centralized application state with immutable member UUIDs.
 * Members indexed by server-issued id, not display name.
 * Renames never mutate historical segments; removals never delete them.
 */
(function(w){
  'use strict';

  var SPK_COLORS = ['#3b82f6','#22c55e','#ec4899','#f59e0b','#8b5cf6'];

  var LANGS = {
    en:{flag:'🇬🇧',name:'English'},
    it:{flag:'🇮🇹',name:'Italiano'},
    nl:{flag:'🇳🇱',name:'Nederlands'},
    fr:{flag:'🇫🇷',name:'Français'},
    de:{flag:'🇩🇪',name:'Deutsch'},
    es:{flag:'🇪🇸',name:'Español'}
  };

  var state = {
    style: 'd1',
    slide: 1,
    session: false,
    sessionState: null,
    mode: 'uninitialized',  // 'demo' | 'local' | 'collaborative'
    timer: 0,
    timerInt: null,
    roomId: '',
    inviteToken: '',
    isHost: true,
    translations: 0,
    myTTL: 'it',
    bridging: 'a1',

    // Member UUID model (new)
    membersById: {},
    memberIds: [],
    currentMemberId: null,

    // Legacy speaker model (bridged — DO NOT use for new code)
    speakers: {},
    speakerOrder: [],
    nextSpkId: 1,
    myName: 'Tu'
  };

  // ── Member mutations ──
  function upsertMember(member) {
    if (!member || !member.id) throw new Error('Member requires immutable id.');
    state.membersById[member.id] = Object.assign({}, state.membersById[member.id] || {}, member);
    if (state.memberIds.indexOf(member.id) === -1) state.memberIds.push(member.id);
    return state.membersById[member.id];
  }

  function getMember(memberId) { return state.membersById[memberId] || null; }

  function getCurrentMember() {
    return state.currentMemberId ? getMember(state.currentMemberId) : null;
  }

  function markMemberLeft(memberId) {
    var m = getMember(memberId); if (m) m.active = false;
  }

  function getActiveMembers() {
    return state.memberIds.map(function(id){ return state.membersById[id]; })
      .filter(function(m){ return m && m.active !== false; });
  }

  function getMemberCount() { return getActiveMembers().length; }

  function getColorForIndex(idx) { return SPK_COLORS[idx % SPK_COLORS.length]; }

  // Legacy compat
  function getSpeaker(name) {
    var members = getActiveMembers();
    for (var i=0; i<members.length; i++) { if (members[i].displayName === name) return members[i]; }
    return null;
  }
  function getSpeakerCount() { return getMemberCount(); }
  function getLang(code) { return LANGS[code] || null; }

  // Session
  function setSession(active) { state.session = !!active; }
  function updateBridging(mode) { state.bridging = mode; localStorage.setItem('duo-bridging', mode); }
  function updateTTL(ttl) {
    if (!LANGS[ttl]) return false;
    state.myTTL = ttl; localStorage.setItem('duo-my-ttl', ttl); return true;
  }

  // Style
  function setStyle(style) { state.style = style; }
  function getStyleForCount() {
    var n = getMemberCount();
    if (n >= 3) return 'd3'; if (n === 2) return 'd2'; return 'd1';
  }
  function getColorClassForCount() { return 's' + Math.min(getMemberCount(), 5); }

  // Room
  function initRoom() {
    var params = new URLSearchParams(window.location.search);
    var inviteToken = params.get('invite');
    if (inviteToken && inviteToken.length >= 16) {
      state.inviteToken = inviteToken; state.isHost = false; state.roomId = ''; return 'invite';
    }
    state.roomId = ''; state.isHost = true; return 'host';
  }

  w.S8T = {
    LANGS: LANGS, SPK_COLORS: SPK_COLORS, state: state,
    upsertMember: upsertMember, getMember: getMember, getCurrentMember: getCurrentMember,
    markMemberLeft: markMemberLeft, getActiveMembers: getActiveMembers, getMemberCount: getMemberCount,
    getSpeaker: getSpeaker, getSpeakerCount: getSpeakerCount, getColorForIndex: getColorForIndex, getLang: getLang,
    setSession: setSession, updateBridging: updateBridging, updateTTL: updateTTL,
    setStyle: setStyle, getStyleForCount: getStyleForCount, getColorClassForCount: getColorClassForCount,
    initRoom: initRoom
  };
})(window);
