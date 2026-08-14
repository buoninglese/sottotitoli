/**
 * SMART Bank Suggestion Engine
 * Replaces hardcoded word lists with API-driven, user-adaptive recommendations.
 * 
 * Banks:
 *   1. Next Step For Your Goal       — Datamuse topics + profile
 *   2. Build From What You Know      — Datamuse ml= (higher-level only)
 *   3. Activate What You Recognize   — Supabase diff (passive vocab)
 *   4a. Goal-Based Upcoming Vocab    — Datamuse topics from short-term goals
 *   4b. Session-Detected Themes      — Pattern-matched from recent sessions
 *   4c. Your Learning Roadmap        — Staged vocabulary roadmap
 */

window.SMART_SUGGESTIONS = (function() {
  'use strict';

  var CACHE_KEY = 'sottotitoli_smart_cache_v2';
  var CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours — daily-ish refresh

  // ── Cache helpers ──
  function _getCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (c._ts && (Date.now() - c._ts) < CACHE_TTL) return c;
    } catch(e) { /* stale or corrupt */ }
    return null;
  }

  function _setCache(key, data) {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      c[key] = data;
      c._ts = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch(e) { /* quota exceeded — skip */ }
  }

  function _cached(key) {
    var c = _getCache();
    return c ? c[key] || null : null;
  }

  // ── Datamuse helper (reuses existing cache pattern from panoramica) ──
  var _dmCache = {};
  var _activeLang = 'en';   // set by refreshAll(lang) — drives v=it + Italian fallbacks
  async function _datamuse(params) {
    // Datamuse supports Italian via v=it (verified). Other langs use the default (en).
    var effective = params;
    if (_activeLang === 'it') {
      effective = Object.assign({}, params, { v: 'it' });
    }
    var ck = JSON.stringify(effective);
    if (_dmCache[ck]) return _dmCache[ck];
    var qs = Object.keys(effective).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(effective[k]);
    }).join('&');
    try {
      var resp = await fetch('https://api.datamuse.com/words?' + qs + '&max=25');
      if (!resp.ok) return [];
      var data = await resp.json();
      var result = data.map(function(d) {
        var tags = d.tags || [];
        var pos = '—';
        if (tags.indexOf('n') >= 0) pos = 'n';
        else if (tags.indexOf('v') >= 0) pos = 'v';
        else if (tags.indexOf('adj') >= 0) pos = 'adj';
        else if (tags.indexOf('adv') >= 0) pos = 'adv';
        if (pos === '—' && window.IT_KELLY && _activeLang === 'it' && window.IT_KELLY[d.word.toLowerCase()]) {
          pos = String(window.IT_KELLY[d.word.toLowerCase()]).split('|')[0] || '—';
        }
        if (pos === '—' && window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[d.word.toLowerCase()]) {
          pos = window.LEMMA_POS_MAP[d.word.toLowerCase()];
        }
        return { word: d.word, pos: pos, score: d.score || 0 };
      });
      _dmCache[ck] = result;
      return result;
    } catch(e) { return []; }
  }

  // ── CEFR helpers ──
  var CEFR_ORDER = { 'A1':1, 'A2':2, 'B1':3, 'B2':4, 'C1':5, 'C2':6 };
  function _getCefr(word) {
    var w = word.toLowerCase();
    if (window.CEFR_LEVELS && window.CEFR_LEVELS[w]) return window.CEFR_LEVELS[w];
    if (window.CEFR_GSE && window.CEFR_GSE[w]) return window.CEFR_GSE[w];
    if (window.IT_KELLY && window.IT_KELLY[w]) {
      var parts = String(window.IT_KELLY[w]).split('|');
      if (parts[1]) return parts[1];
    }
    return null;
  }
  function _cefrLevel(cefr) { return CEFR_ORDER[cefr] || 0; }
  function _isHigherLevel(wordCefr, userLevel) {
    if (!wordCefr || !userLevel) return false;
    return _cefrLevel(wordCefr) > _cefrLevel(userLevel);
  }

  // ── Italian fallback: seed from bundled KELLY list when Datamuse yields too few ──
  function _seedItalianFallback(allCandidates, seen, knownWords, userLevel, max) {
    if (_activeLang !== 'it' || !window.IT_KELLY) return;
    if (allCandidates.length >= 8) return;
    var knownSet = new Set((knownWords || []).map(function(k){ return k.word.toLowerCase(); }));
    var pool = Object.keys(window.IT_KELLY);
    var start = Math.floor(Math.random() * pool.length);
    for (var s = 0; s < pool.length && allCandidates.length < max; s++) {
      var idx = (start + s) % pool.length;
      var wIt = pool[idx];
      var lw = wIt.toLowerCase();
      if (seen.has(lw) || knownSet.has(lw)) continue;
      var cefrIt = _getCefr(wIt);
      if (cefrIt && !_isHigherLevel(cefrIt, userLevel)) continue;
      seen.add(lw);
      allCandidates.push({
        word: wIt,
        pos: String(window.IT_KELLY[wIt]).split('|')[0] || '—',
        cefr: cefrIt || '—',
        reason: 'Dal tuo livello — parola utile in italiano',
        score: 10 + (CEFR_ORDER[cefrIt] || 0) * 5
      });
    }
  }

  // ── Supabase helpers ──
  function _sb() { return window.sottotitoliSupabase; }
  async function _getUserId() {
    var sb = _sb(); if (!sb) return null;
    try {
      var r = await sb.auth.getSession();
      return r.data?.session ? r.data.session.user.id : null;
    } catch(e) { return null; }
  }

  // ── Profile helpers ──
  async function _getProfile() {
    var uid = await _getUserId();
    if (!uid) return null;
    var sb = _sb();
    if (!sb) return null;
    try {
      var { data } = await sb.from('review_user_learning_profile')
        .select('*').eq('user_id', uid).maybeSingle();
      return data || null;
    } catch(e) { return null; }
  }

  // ── Get user's top known words (high mastery, many reps) ──
  async function _getTopKnownWords(limit) {
    limit = limit || 20;
    var uid = await _getUserId();
    if (!uid) return [];
    var sb = _sb();
    if (!sb) return [];
    try {
      var { data } = await sb.from('review_words')
        .select('lemma,pos,cefr,mastery_score,personal_frequency')
        .eq('user_id', uid)
        .gte('mastery_score', 60)
        .order('mastery_score', { ascending: false })
        .limit(limit);
      return (data || []).map(function(r) {
        return { word: r.lemma, pos: r.pos, cefr: r.cefr || _getCefr(r.lemma), mastery: r.mastery_score, freq: r.personal_frequency };
      });
    } catch(e) { return []; }
  }

  // ── Get all words user has ever encountered ──
  async function _getAllEncountered() {
    var uid = await _getUserId();
    if (!uid) return [];
    var sb = _sb();
    if (!sb) return [];
    try {
      var { data } = await sb.from('review_words')
        .select('lemma,pos,cefr,personal_frequency')
        .eq('user_id', uid)
        .gt('personal_frequency', 0)
        .order('personal_frequency', { ascending: false })
        .limit(500);
      return (data || []).map(function(r) {
        return { word: r.lemma, pos: r.pos, cefr: r.cefr || _getCefr(r.lemma), freq: r.personal_frequency };
      });
    } catch(e) { return []; }
  }

  // ── Get all words user has explicitly saved to any bank ──
  async function _getAllSavedWords() {
    var uid = await _getUserId();
    if (!uid) return new Set();
    var sb = _sb();
    if (!sb) return new Set();
    try {
      // user_wordbank_words has no user_id column — join through user_wordbanks
      var { data: banks } = await sb.from('user_wordbanks')
        .select('id')
        .eq('user_id', uid);
      var bankIds = (banks || []).map(function(b) { return b.id; });
      if (!bankIds.length) return new Set();
      var { data } = await sb.from('user_wordbank_words')
        .select('word')
        .in('wordbank_id', bankIds)
        .limit(2000);
      var s = new Set();
      (data || []).forEach(function(r) { s.add((r.word || '').toLowerCase()); });
      return s;
    } catch(e) { return new Set(); }
  }

  // ── Estimate user's CEFR level from their word profile ──
  function _estimateUserLevel(knownWords) {
    if (!knownWords || !knownWords.length) return 'A2';
    var tally = { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 };
    knownWords.forEach(function(w) {
      var lvl = w.cefr || _getCefr(w.word);
      if (lvl && tally.hasOwnProperty(lvl)) tally[lvl] += w.mastery || w.freq || 1;
    });
    var best = 'A2', bestScore = 0;
    Object.keys(tally).forEach(function(k) {
      if (tally[k] > bestScore) { bestScore = tally[k]; best = k; }
    });
    return best;
  }

  // ── Sector → Datamuse topic mapping ──
  var SECTOR_TOPICS = {
    'technology':'technology+software+programming',
    'tech':'technology+software+programming',
    'it':'technology+software+programming',
    'software':'technology+software+programming',
    'business':'business+finance+management',
    'finance':'business+finance+management',
    'marketing':'business+marketing+advertising',
    'academic':'education+research+science',
    'education':'education+research+science',
    'research':'education+research+science',
    'medical':'medicine+health+hospital',
    'health':'medicine+health+hospital',
    'legal':'law+government+legal',
    'law':'law+government+legal',
    'tourism':'travel+tourism+hotel',
    'hospitality':'travel+tourism+hotel',
    'creative':'art+design+music',
    'design':'art+design+music',
    'engineering':'engineering+manufacturing+construction'
  };

  function _mapSector(sector) {
    if (!sector) return null;
    var s = sector.toLowerCase();
    for (var k in SECTOR_TOPICS) {
      if (s.indexOf(k) !== -1) return SECTOR_TOPICS[k];
    }
    return null;
  }

  // ═══════════════════════════════════════════════
  //  BANK 3: ACTIVATE WHAT YOU RECOGNIZE
  //  Passive vocab = all encountered − all saved
  // ═══════════════════════════════════════════════
  async function getPassiveVocab() {
    var cacheKey = 'activate_recognized';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var uid = await _getUserId();
    if (!uid) return [];

    var encountered = await _getAllEncountered();
    if (!encountered.length) return [];

    var savedSet = await _getAllSavedWords();

    var passive = encountered.filter(function(w) {
      return !savedSet.has(w.word.toLowerCase());
    }).slice(0, 15).map(function(w) {
      return {
        word: w.word,
        pos: w.pos || '—',
        cefr: w.cefr || _getCefr(w.word) || '—',
        reason: 'Seen ' + w.freq + '× — claim it to activate',
        score: w.freq
      };
    });

    _setCache(cacheKey, passive);
    return passive;
  }

  // ═══════════════════════════════════════════════
  //  BANK 2: BUILD FROM WHAT YOU KNOW
  //  Higher-level words from known vocabulary
  // ═══════════════════════════════════════════════
  async function getHigherLevelWords() {
    var cacheKey = 'build_from_known';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var uid = await _getUserId();
    if (!uid) return [];

    var knownWords = await _getTopKnownWords(12);
    if (!knownWords.length) return [];

    var userLevel = _estimateUserLevel(knownWords);
    var profile = await _getProfile();
    var sectorTopic = profile ? _mapSector(profile.target_domain) : null;

    var allCandidates = [];
    var seen = new Set();

    // For each known word, find related higher-level words
    for (var i = 0; i < knownWords.length; i++) {
      var kw = knownWords[i];
      try {
        var results = await _datamuse({ ml: kw.word });
        results.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (!_isHigherLevel(cefr, userLevel)) return; // only higher level
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'More advanced than \'' + kw.word + '\' → \'' + r.word + '\' (' + (cefr || '—') + ')',
            score: r.score
          });
        });
      } catch(e) { /* skip this word */ }
    }

    // Boost domain-relevant words
    if (sectorTopic) {
      try {
        var topicWords = await _datamuse({ topics: sectorTopic });
        var topicSet = new Set(topicWords.map(function(t) { return t.word.toLowerCase(); }));
        allCandidates.forEach(function(c) {
          if (topicSet.has(c.word.toLowerCase())) c.score += 200;
        });
      } catch(e) { /* skip */ }
    }

    // Italian: guarantee content from the bundled KELLY list if Datamuse came up short
    _seedItalianFallback(allCandidates, seen, knownWords, userLevel, 15);

    // Sort by score desc, take top 15
    allCandidates.sort(function(a, b) { return b.score - a.score; });
    var result = allCandidates.slice(0, 15);

    _setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  BANK 1: NEXT STEP FOR YOUR GOAL
  //  Goal-aligned vocab using Datamuse topics
  // ═══════════════════════════════════════════════
  async function getGoalVocabulary() {
    var cacheKey = 'goal_next_step';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var profile = await _getProfile();
    if (!profile) return [];

    var sectorTopic = _mapSector(profile.target_domain);
    var goalText = profile.long_term_goal || '';
    var knownWords = await _getTopKnownWords(15);
    var userLevel = _estimateUserLevel(knownWords);
    var allCandidates = [];
    var seen = new Set();

    if (sectorTopic) {
      try {
        var results = await _datamuse({ topics: sectorTopic });
        results.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (cefr && _cefrLevel(cefr) < _cefrLevel(userLevel)) return; // not below user level
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'Relevant to ' + (profile.target_domain || 'your goal'),
            score: r.score
          });
        });
      } catch(e) { /* skip */ }
    }

    // Also query based on known words to bridge to goal domain
    for (var i = 0; i < Math.min(5, knownWords.length); i++) {
      var kw = knownWords[i];
      try {
        var mlResults = await _datamuse({ ml: kw.word });
        mlResults.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (cefr && _cefrLevel(cefr) < _cefrLevel(userLevel)) return;
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'Related to known word \'' + kw.word + '\' in goal domain',
            score: r.score
          });
        });
      } catch(e) { /* skip this word */ }
    }

    allCandidates.sort(function(a, b) { return b.score - a.score; });
    var result = allCandidates.slice(0, 15);

    _setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  BANK 4a: GOAL-BASED UPCOMING VOCAB (Option A)
  //  User declares short-term goal → topic-based
  // ═══════════════════════════════════════════════
  async function getUpcomingGoalVocab() {
    var cacheKey = 'upcoming_goal';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var profile = await _getProfile();
    if (!profile) return [];

    // Use preferences.short_term_goal if available, else derive from profile
    var shortTermGoal = (profile.preferences && profile.preferences.short_term_goal) || profile.short_term_goal || '';
    var longTermGoal = profile.long_term_goal || '';
    var domain = profile.target_domain || '';

    if (!shortTermGoal && !longTermGoal) return [];

    var knownWords = await _getTopKnownWords(10);
    var userLevel = _estimateUserLevel(knownWords);
    var allCandidates = [];
    var seen = new Set();

    // Extract keywords from short-term goal
    var keywords = (shortTermGoal + ' ' + longTermGoal).toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(function(w) { return w.length > 3 && ['this','that','your','with','from','about','have','will','want','need','next','week','month'].indexOf(w) === -1; })
      .slice(0, 8);

    // Query Datamuse topics for each keyword
    for (var k = 0; k < keywords.length; k++) {
      try {
        var topic = keywords[k];
        var sectorAdd = domain ? '+' + domain.toLowerCase().replace(/\s+/g, '+') : '';
        var results = await _datamuse({ topics: topic + sectorAdd, md: 'f' }); // md=f for common words
        results.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (cefr && _cefrLevel(cefr) < _cefrLevel(userLevel)) return;
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'For your goal: \"' + shortTermGoal + '\"',
            score: r.score + 50 // boost for goal-relevance
          });
        });
      } catch(e) { /* skip */ }
    }

    allCandidates.sort(function(a, b) { return b.score - a.score; });
    var result = allCandidates.slice(0, 15);

    _setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  BANK 4b: SESSION-DETECTED THEMES (Option B)
  //  Analyze recent session topics → predict needs
  // ═══════════════════════════════════════════════
  async function getSessionDrivenVocab() {
    var cacheKey = 'upcoming_session';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var uid = await _getUserId();
    if (!uid) return [];

    var sb = _sb();
    if (!sb) return [];

    // Get recent session titles/topics
    var recentTopics = [];
    try {
      var { data: sessions } = await sb.from('sessions')
        .select('name')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);
      if (sessions && sessions.length) {
        var topicCounts = {};
        sessions.forEach(function(s) {
          var title = (s.name || '').toLowerCase();
          var words = title.replace(/[^a-z\s]/g, '').split(/\s+/).filter(function(w) { return w.length > 3 && ['this','that','your','with','from','just','have','will','want','need','session','captions','translate','test','practice'].indexOf(w) === -1; });
          words.forEach(function(w) {
            topicCounts[w] = (topicCounts[w] || 0) + 1;
          });
        });
        // Top 5 recurring themes
        recentTopics = Object.keys(topicCounts)
          .sort(function(a, b) { return topicCounts[b] - topicCounts[a]; })
          .slice(0, 5);
      }
    } catch(e) { /* skip */ }

    if (!recentTopics.length) return [];

    var knownWords = await _getTopKnownWords(10);
    var userLevel = _estimateUserLevel(knownWords);
    var allCandidates = [];
    var seen = new Set();

    for (var t = 0; t < recentTopics.length; t++) {
      try {
        var results = await _datamuse({ topics: recentTopics[t], md: 'f' });
        results.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (cefr && _cefrLevel(cefr) < _cefrLevel(userLevel)) return;
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'From your recent theme: \"' + recentTopics[t] + '\"',
            score: r.score
          });
        });
      } catch(e) { /* skip */ }
    }

    allCandidates.sort(function(a, b) { return b.score - a.score; });
    var result = allCandidates.slice(0, 15);

    _setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  BANK 4c: YOUR LEARNING ROADMAP (Option C)
  //  Staged vocab based on goal roadmap stages
  // ═══════════════════════════════════════════════
  async function getRoadmapVocab() {
    var cacheKey = 'upcoming_roadmap';
    var cached = _cached(cacheKey);
    if (cached) return cached;

    var profile = await _getProfile();
    if (!profile) return [];

    // Roadmap stages from profile preferences
    var stages = (profile.preferences && profile.preferences.goal_stages) || [];
    if (!stages.length) {
      // Try to derive from long_term_goal
      var goalText = (profile.long_term_goal || '').toLowerCase();
      if (!goalText) return [];
      // Simple stage detection from goal description
      if (goalText.indexOf('interview') !== -1 || goalText.indexOf('lavoro') !== -1) {
        stages = ['interview', 'onboarding', 'daily-work', 'meetings', 'advancement'];
      } else if (goalText.indexOf('travel') !== -1 || goalText.indexOf('viaggi') !== -1) {
        stages = ['planning', 'transport', 'accommodation', 'dining', 'exploring'];
      } else if (goalText.indexOf('study') !== -1 || goalText.indexOf('studio') !== -1) {
        stages = ['campus', 'lectures', 'assignments', 'exams', 'graduation'];
      } else {
        stages = ['getting-started', 'building-confidence', 'practicing', 'mastering'];
      }
    }

    var stageTopics = {
      'interview':'job+interview+employment',
      'onboarding':'workplace+orientation+training',
      'daily-work':'office+workplace+daily+routine',
      'meetings':'meetings+presentation+negotiation',
      'advancement':'leadership+management+promotion',
      'planning':'travel+planning+itinerary',
      'transport':'transportation+airport+transit',
      'accommodation':'hotel+accommodation+lodging',
      'dining':'restaurant+dining+food',
      'exploring':'tourism+sightseeing+culture',
      'campus':'university+campus+student',
      'lectures':'lectures+academic+presentation',
      'assignments':'homework+essays+research',
      'exams':'exams+tests+assessment',
      'graduation':'graduation+career+networking',
      'getting-started':'beginner+basics+fundamentals',
      'building-confidence':'intermediate+conversation+fluency',
      'practicing':'practice+drills+exercises',
      'mastering':'advanced+proficiency+expert'
    };

    var knownWords = await _getTopKnownWords(10);
    var userLevel = _estimateUserLevel(knownWords);
    var allCandidates = [];
    var seen = new Set();
    var currentStage = stages[0] || 'getting-started';

    for (var s = 0; s < Math.min(2, stages.length); s++) {
      var stage = stages[s];
      var topicStr = stageTopics[stage] || stage.replace(/-/g, '+');
      try {
        var results = await _datamuse({ topics: topicStr, md: 'f' });
        results.forEach(function(r) {
          var w = r.word.toLowerCase();
          if (seen.has(w)) return;
          var cefr = _getCefr(w);
          if (cefr && _cefrLevel(cefr) < _cefrLevel(userLevel)) return;
          seen.add(w);
          allCandidates.push({
            word: r.word,
            pos: r.pos,
            cefr: cefr || '—',
            reason: 'Stage: \"' + stage.replace(/-/g, ' ') + '\" → next up',
            score: r.score
          });
        });
      } catch(e) { /* skip */ }
    }

    allCandidates.sort(function(a, b) { return b.score - a.score; });
    var result = allCandidates.slice(0, 15);

    _setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  ORCHESTRATOR — refresh all SMART banks
  // ═══════════════════════════════════════════════
  async function refreshAll(lang) {
    lang = lang || 'en';
    _activeLang = lang;
    var results = {
      goal_next_step: [],
      build_from_known: [],
      activate_recognized: [],
      upcoming_useful_vocab: [],
      upcoming_session_driven: [],
      upcoming_roadmap: []
    };

    try {
      results.activate_recognized = await getPassiveVocab();
      results.build_from_known = await getHigherLevelWords();
      results.goal_next_step = await getGoalVocabulary();
      results.upcoming_useful_vocab = await getUpcomingGoalVocab();
      results.upcoming_session_driven = await getSessionDrivenVocab();
      results.upcoming_roadmap = await getRoadmapVocab();
    } catch(e) {
      console.warn('SMART refresh error:', e);
    }

    // ── Sync to Supabase so openWordbankView can read them ──
    syncToSupabase(results, lang);

    return results;
  }

  // ── Sync suggestions to review_bank_words (async fire-and-forget) ──
  async function syncToSupabase(results, lang) {
    var uid = await _getUserId();
    if (!uid) return;
    var sb = _sb();
    if (!sb) return;

    var banks = Object.keys(results);
    for (var b = 0; b < banks.length; b++) {
      var bankKey = banks[b];
      var words = results[bankKey];
      if (!words || !words.length) continue;

      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var clean = w.word.replace(/[^a-zA-Z0-9 '-]/g, '').trim();
        if (!clean || clean.length < 2) continue;
        var norm = clean.toLowerCase();
        try {
          // Upsert into review_words
          var rwRes = await sb.from('review_words')
            .select('id').eq('user_id', uid).eq('lemma', clean).maybeSingle();
          var wordId;
          if (rwRes.data) {
            wordId = rwRes.data.id;
            await sb.from('review_words').update({
              pos: w.pos || null,
              cefr: w.cefr || null
            }).eq('id', wordId);
          } else {
            var ins = await sb.from('review_words').insert({
              user_id: uid,
              lemma: clean,
              normalized: norm,
              lang: lang,
              pos: w.pos || null,
              cefr: w.cefr || null,
              is_new: true,
              first_seen_at: new Date().toISOString(),
              source_type: 'smart',
              review_state: 'new'
            }).select('id').single();
            if (ins.data) wordId = ins.data.id;
          }
          // Upsert into review_bank_words
          if (wordId) {
            try {
              await sb.from('review_bank_words').upsert({
                user_id: uid,
                bank_key: bankKey,
                word_id: wordId,
                source_type: 'smart',
                rank_score: (words.length - i),
                reason_code: 'api_generated',
                reason_text: w.reason || '',
                status: 'active'
              }, { onConflict: 'user_id,bank_key,word_id' });
            } catch(dupErr) { /* already exists — skip */ }
          }
        } catch(e) { /* skip this word */ }
      }
    }
  }

  // ── Get counts only (lightweight, for card badges) ──
  async function getCounts(lang) {
    var r = await refreshAll(lang);
    var counts = {};
    Object.keys(r).forEach(function(k) {
      counts[k] = (r[k] || []).length;
    });
    return counts;
  }

  // ── Force invalidate cache ──
  function invalidateCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch(e) {}
    _dmCache = {};
  }

  return {
    refreshAll: refreshAll,
    getCounts: getCounts,
    getPassiveVocab: getPassiveVocab,
    getHigherLevelWords: getHigherLevelWords,
    getGoalVocabulary: getGoalVocabulary,
    getUpcomingGoalVocab: getUpcomingGoalVocab,
    getSessionDrivenVocab: getSessionDrivenVocab,
    getRoadmapVocab: getRoadmapVocab,
    invalidateCache: invalidateCache
  };
})();
