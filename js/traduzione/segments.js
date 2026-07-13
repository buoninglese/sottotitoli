/**
 * S8T Segments — Client-side segment lifecycle with ID-based tracking.
 * Replaces the fragile "last sentence" assumption with stable segment IDs.
 *
 * Every segment has:
 *   - clientSegmentId: locally generated, unique, stable (e.g. "c_a1b2c3")
 *   - serverSegmentId: assigned by Supabase on persistence (optional, for Phase C)
 *   - sequence: ordered position within the room
 */
(function(w){
  'use strict';

  var counter = 0;
  var segmentMap = {};    // clientSegmentId → segment object
  var orderedIds = [];    // insertion order

  /**
   * Generate a unique client-side segment ID.
   */
  function generateId(){
    counter++;
    return 'c_' + Math.random().toString(36).substring(2, 10) + '_' + counter;
  }

  /**
   * Create a new segment. Returns the segment object with a stable ID.
   */
  function create(speaker, orig, tran){
    var id = generateId();
    var segment = {
      clientSegmentId: id,
      serverSegmentId: null,
      sequence: orderedIds.length + 1,
      speaker: speaker,
      orig: orig,
      tran: tran || '…',
      status: tran ? 'translated' : 'pending',
      createdAt: new Date().toISOString()
    };
    segmentMap[id] = segment;
    orderedIds.push(id);
    return segment;
  }

  /**
   * Update a segment's translation by client ID.
   * Returns the segment or null if not found.
   */
  function updateTranslation(clientSegmentId, newTran){
    var seg = segmentMap[clientSegmentId];
    if (!seg) return null;
    seg.tran = newTran;
    seg.status = 'translated';
    return seg;
  }

  /**
   * Get a segment by client ID.
   */
  function getById(clientSegmentId){
    return segmentMap[clientSegmentId] || null;
  }

  /**
   * Get segment by position in the ordered list.
   */
  function getByIndex(idx){
    var id = orderedIds[idx];
    return id ? segmentMap[id] : null;
  }

  /**
   * Get the last segment in the ordered list.
   */
  function getLast(){
    return getByIndex(orderedIds.length - 1);
  }

  /**
   * Get all segments in insertion order.
   */
  function getAll(){
    return orderedIds.map(function(id){ return segmentMap[id]; }).filter(Boolean);
  }

  /**
   * Count all segments.
   */
  function count(){
    return orderedIds.length;
  }

  /**
   * Remove all segments (for re-render).
   */
  function clear(){
    segmentMap = {};
    orderedIds = [];
    counter = 0;
  }

  /**
   * Set server ID and sequence after persistence.
   */
  function setServerInfo(clientSegmentId, serverId, sequence){
    var seg = segmentMap[clientSegmentId];
    if (!seg) return false;
    seg.serverSegmentId = serverId;
    seg.sequence = sequence;
    return true;
  }

  // Export
  w.S8T_SEGMENTS = {
    generateId: generateId,
    create: create,
    updateTranslation: updateTranslation,
    getById: getById,
    getByIndex: getByIndex,
    getLast: getLast,
    getAll: getAll,
    count: count,
    clear: clear,
    setServerInfo: setServerInfo
  };

})(window);
