/**
 * S8T Vocabulary — Server-authoritative vocabulary with localStorage fallback.
 * Syncs saved words to Supabase vocabulary_entries table.
 * Falls back to localStorage when not authenticated.
 */
(function(w){
  'use strict';

  var localCache = {};  // mirror of what's in Supabase + localStorage
  var supabaseReady = false;
  var syncPending = [];

  // Load from localStorage on init (instant, works offline)
  function loadLocal(){
    try {
      var raw = localStorage.getItem('sottotitoli-saved-words');
      if (raw) localCache = JSON.parse(raw);
    } catch(e) {
      localCache = {};
    }
    return localCache;
  }

  // Load from Supabase and merge with local
  async function loadRemote(){
    var sb = w.sottotitoliSupabase;
    if (!sb) return localCache;

    try {
      var { data: { session } } = await sb.auth.getSession();
      if (!session) return localCache;

      var { data, error } = await sb
        .from('vocabulary_entries')
        .select('lemma, language, status, definition, cefr, saved_at')
        .eq('status', 'new')
        .order('saved_at', { ascending: false });

      if (error || !data) return localCache;

      // Merge server data into local cache (server wins for conflicts)
      data.forEach(function(row){
        var key = row.lemma;
        if (!localCache[key] || new Date(row.saved_at) > new Date(localCache[key].savedAt || 0)) {
          localCache[key] = {
            lang: row.language,
            level: row.cefr || '',
            status: row.status,
            definition: row.definition || '',
            savedAt: row.saved_at
          };
        }
      });

      // Persist merged cache to localStorage
      localStorage.setItem('sottotitoli-saved-words', JSON.stringify(localCache));
      supabaseReady = true;
      return localCache;
    } catch(e) {
      console.warn('Vocabulary remote load failed, using local cache:', e.message);
      return localCache;
    }
  }

  // Save a word — upsert to Supabase, update local cache
  async function saveWord(word, lang, level){
    lang = lang || 'en';
    level = level || '';

    // Update local cache immediately (optimistic)
    localCache[word] = {
      lang: lang,
      level: level,
      status: 'new',
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('sottotitoli-saved-words', JSON.stringify(localCache));

    // Sync to Supabase
    var sb = w.sottotitoliSupabase;
    if (!sb) return true; // local-only success

    try {
      var { data: { session } } = await sb.auth.getSession();
      if (!session) return true;

      var { error } = await sb
        .from('vocabulary_entries')
        .upsert({
          user_id: session.user.id,
          lemma: word,
          language: lang,
          status: 'new',
          cefr: level || null,
          saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, lemma, language' });

      if (error) console.warn('Vocabulary save remote failed:', error.message);
      return !error;
    } catch(e) {
      console.warn('Vocabulary save failed, queued for retry:', e.message);
      syncPending.push({ action: 'save', word: word, lang: lang, level: level });
      return false;
    }
  }

  // Unsave a word
  async function unsaveWord(word){
    delete localCache[word];
    localStorage.setItem('sottotitoli-saved-words', JSON.stringify(localCache));

    var sb = w.sottotitoliSupabase;
    if (!sb) return true;

    try {
      var { data: { session } } = await sb.auth.getSession();
      if (!session) return true;

      // Soft-delete: mark as 'ignored' rather than actually deleting
      var { error } = await sb
        .from('vocabulary_entries')
        .update({ status: 'ignored', updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('lemma', word);

      if (error) console.warn('Vocabulary unsave remote failed:', error.message);
      return !error;
    } catch(e) {
      return false;
    }
  }

  // Check if a word is saved
  function isSaved(word){
    var lower = (word || '').toLowerCase();
    return !!localCache[lower];
  }

  // Get all saved words
  function getAll(){
    return localCache;
  }

  // Get count
  function count(){
    return Object.keys(localCache).length;
  }

  // Initialize: load local, then merge remote
  async function init(){
    loadLocal();
    await loadRemote();
    // Notify UI that vocabulary is ready
    w.dispatchEvent(new CustomEvent('s8t-vocabulary-ready', { detail: localCache }));
    return localCache;
  }

  // Export
  w.S8T_VOCAB = {
    init: init,
    saveWord: saveWord,
    unsaveWord: unsaveWord,
    isSaved: isSaved,
    getAll: getAll,
    count: count,
    get cache() { return localCache; }
  };

})(window);
