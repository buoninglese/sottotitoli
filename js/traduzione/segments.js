/**
 * S8T Segments — Client-side segment lifecycle with crypto-random IDs.
 * Every segment has a stable clientSegmentId (crypto.randomUUID).
 * Incoming server segments are upserted by canonical ID — never duplicated.
 */
(function(window){
  'use strict';

  var byClientId = Object.create(null);
  var byServerId = Object.create(null);
  var orderedClientIds = [];

  function createClientId() {
    if (!window.crypto || !window.crypto.randomUUID) {
      throw new Error('Questo browser non supporta identificatori sicuri.');
    }
    return window.crypto.randomUUID();
  }

  function sortBySequence(leftId, rightId) {
    var left = byClientId[leftId];
    var right = byClientId[rightId];
    if (left.sequence == null && right.sequence == null) {
      return (left.createdAt || '').localeCompare(right.createdAt || '');
    }
    if (left.sequence == null) return 1;
    if (right.sequence == null) return -1;
    return Number(left.sequence) - Number(right.sequence);
  }

  function normalize(input) {
    if (!input || !input.clientSegmentId) {
      throw new Error('Segment requires clientSegmentId.');
    }
    return {
      id: input.id || input.serverSegmentId || null,
      clientSegmentId: input.clientSegmentId,
      roomId: input.roomId || null,
      sequence: input.sequence == null ? null : Number(input.sequence),

      speakerMemberId: input.speakerMemberId || null,
      speakerName: input.speakerName || 'Partecipante',
      speakerLanguage: input.speakerLanguage || input.sourceLanguage || 'en',
      speakerColor: input.speakerColor || '#7c3aed',

      orig: input.orig || input.sourceText || '',
      sourceLanguage: input.sourceLanguage || input.speakerLanguage || 'en',

      tran: input.tran || input.translationText || '…',
      translationLanguage: input.translationLanguage || null,
      translationStatus: input.translationStatus || 'pending',
      translationErrorCode: input.translationErrorCode || null,

      isFinal: input.isFinal !== false,
      createdAt: input.createdAt || new Date().toISOString(),
      optimistic: !!input.optimistic
    };
  }

  function upsert(input) {
    var incoming = normalize(input);
    var existing =
      byClientId[incoming.clientSegmentId] ||
      (incoming.id ? byServerId[incoming.id] : null);

    var merged = Object.assign({}, existing || {}, incoming);

    byClientId[merged.clientSegmentId] = merged;
    if (merged.id) { byServerId[merged.id] = merged; }

    if (orderedClientIds.indexOf(merged.clientSegmentId) === -1) {
      orderedClientIds.push(merged.clientSegmentId);
    }
    orderedClientIds.sort(sortBySequence);
    return merged;
  }

  function createOptimistic(input) {
    return upsert({
      clientSegmentId: createClientId(),
      roomId: input.roomId,
      speakerMemberId: input.speakerMemberId,
      speakerName: input.speakerName,
      speakerLanguage: input.speakerLanguage,
      speakerColor: input.speakerColor,
      sourceText: input.sourceText,
      sourceLanguage: input.sourceLanguage,
      tran: '…',
      translationStatus: 'pending',
      optimistic: true,
      isFinal: true
    });
  }

  function getByClientId(clientSegmentId) {
    return byClientId[clientSegmentId] || null;
  }

  function getByServerId(serverSegmentId) {
    return byServerId[serverSegmentId] || null;
  }

  function getAll() {
    return orderedClientIds.map(function(cid){ return byClientId[cid]; }).filter(Boolean);
  }

  function count() { return orderedClientIds.length; }

  function setTranslation(clientSegmentId, patch) {
    var existing = getByClientId(clientSegmentId);
    if (!existing) return null;
    return upsert(Object.assign({}, existing, {
      tran: patch.translationText || existing.tran,
      translationStatus: patch.translationStatus || existing.translationStatus,
      translationErrorCode: patch.translationErrorCode || null,
      optimistic: false
    }));
  }

  function clear() {
    byClientId = Object.create(null);
    byServerId = Object.create(null);
    orderedClientIds = [];
  }

  // Legacy aliases for gradual migration
  function create(speaker, orig, tran) {
    return createOptimistic({
      speakerName: speaker,
      sourceText: orig,
      sourceLanguage: 'en',
      tran: tran || '…'
    });
  }
  function updateTranslation(cid, newTran) {
    return setTranslation(cid, { translationText: newTran, translationStatus: 'translated' });
  }
  function getById(cid) { return getByClientId(cid); }

  window.S8T_SEGMENTS = {
    createClientId: createClientId,
    createOptimistic: createOptimistic,
    upsert: upsert,
    getByClientId: getByClientId,
    getByServerId: getByServerId,
    getAll: getAll,
    count: count,
    setTranslation: setTranslation,
    clear: clear,
    // Legacy aliases
    create: create,
    updateTranslation: updateTranslation,
    getById: getById
  };
})(window);
