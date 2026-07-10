/* ═══ Sottotitoli Data Service ═══ */
/* Supabase data layer for panoramica.html — all panels read from here */

(function(){
  'use strict';

  var CACHE_TTL = 30000; // 30 seconds before refetch
  var cache = {};

  function cacheGet(key) {
    var entry = cache[key];
    if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry.data;
    return null;
  }
  function cacheSet(key, data) {
    cache[key] = { data: data, ts: Date.now() };
  }
  function cacheClear() { cache = {}; }

  function getStudyLang() {
    return window.SOTTOTITOLI_STUDY_LANG || localStorage.getItem('sottotitoli-study-lang') || 'en';
  }

  /* ── Supabase client (wait for auth.js) ── */
  function sb() { return window.sottotitoliSupabase; }

  async function getUserId() {
    if (!sb()) return null;
    var r = await sb().auth.getSession();
    return r.data?.session?.user?.id || null;
  }

  async function getUserEmail() {
    if (!sb()) return null;
    var r = await sb().auth.getSession();
    return r.data?.session?.user?.email || null;
  }

  async function getUserMeta() {
    if (!sb()) return null;
    var r = await sb().auth.getSession();
    var u = r.data?.session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Utente',
      avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || ''
    };
  }

  /* ═══════════════════════════════════════════
     PROFILE
     ═══════════════════════════════════════════ */
  async function getProfile() {
    var userId = await getUserId();
    if (!userId) return null;
    var cached = cacheGet('profile');
    if (cached) return cached;
    var r = await sb().from('profiles').select('*').eq('id', userId).single();
    if (r.error) { console.warn('profile fetch:', r.error.message); return null; }
    cacheSet('profile', r.data);
    return r.data;
  }

  /* ═══════════════════════════════════════════
     SESSION STATS — aggregated for hero + metrics
     ═══════════════════════════════════════════ */
  async function getSessionStats(lang) {
    lang = lang || getStudyLang();
    var userId = await getUserId();
    if (!userId) return null;
    var cacheKey = 'sessionStats_' + lang;
    var cached = cacheGet(cacheKey);
    if (cached) return cached;

    // Build filter: sessions where language_pair starts with the study lang
    var langFilter = lang + '%';
    var r = await sb().from('sessions')
      .select('id,duration_seconds,words_count,started_at,language_pair,wpm,lexical_diversity,quality_score')
      .eq('user_id', userId)
      .like('language_pair', langFilter)
      .order('started_at', { ascending: false });

    if (r.error) { console.warn('session stats:', r.error.message); return null; }

    var sessions = r.data || [];
    var totalSessions = sessions.length;
    var totalSeconds = sessions.reduce(function(s, row) { return s + (row.duration_seconds || 0); }, 0);
    var totalWords = sessions.reduce(function(s, row) { return s + (row.words_count || 0); }, 0);

    // This week's sessions
    var now = new Date();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var thisWeek = sessions.filter(function(s) { return new Date(s.started_at) >= weekAgo; });
    var lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    var lastWeek = sessions.filter(function(s) {
      var d = new Date(s.started_at);
      return d >= lastWeekStart && d < weekAgo;
    });

    // Compute real WPM and lexical diversity from sessions that have them
    var sessionsWithWpm = sessions.filter(function(s) { return s.wpm > 0; });
    var avgWpm = sessionsWithWpm.length > 0
      ? Math.round(sessionsWithWpm.reduce(function(s, r) { return s + r.wpm; }, 0) / sessionsWithWpm.length)
      : 0;
    var sessionsWithLexDiv = sessions.filter(function(s) { return s.lexical_diversity > 0; });
    var avgLexDiv = sessionsWithLexDiv.length > 0
      ? Math.round(sessionsWithLexDiv.reduce(function(s, r) { return s + r.lexical_diversity; }, 0) / sessionsWithLexDiv.length * 100) / 100
      : 0;
    var sessionsWithQuality = sessions.filter(function(s) { return s.quality_score > 0; });
    var avgQuality = sessionsWithQuality.length > 0
      ? Math.round(sessionsWithQuality.reduce(function(s, r) { return s + r.quality_score; }, 0) / sessionsWithQuality.length * 10) / 10
      : 0;
    // This week minutes
    var thisWeekMinutes = Math.round(thisWeek.reduce(function(s, r) { return s + (r.duration_seconds || 0); }, 0) / 60);
    var thisWeekSessions = thisWeek.length;
    var dailyAverageMinutes = thisWeekSessions > 0 ? Math.round(thisWeekMinutes / Math.min(7, thisWeekSessions)) : 0;

    var data = {
      totalSessions: totalSessions,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      totalWords: totalWords,
      avgWpm: avgWpm,
      avgLexDiv: avgLexDiv,
      avgQuality: avgQuality,
      thisWeekSessions: thisWeekSessions,
      thisWeekMinutes: thisWeekMinutes,
      dailyAverageMinutes: dailyAverageMinutes,
      sessionsTrend: lastWeek.length > 0 ? Math.round((thisWeek.length - lastWeek.length) / lastWeek.length * 100) : 0,
      lang: lang
    };
    cacheSet(cacheKey, data);
    return data;
  }

  /* ═══════════════════════════════════════════
     SESSION LIST — for Trascrizioni panel
     ═══════════════════════════════════════════ */
  async function getSessions(lang, limit) {
    lang = lang || getStudyLang();
    limit = limit || 20;
    var userId = await getUserId();
    if (!userId) return [];

    var r = await sb().from('sessions')
      .select('id,name,started_at,duration_seconds,words_count,favorite,language_pair,session_type,quality_score')
      .eq('user_id', userId)
      .like('language_pair', lang + '%')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (r.error) { console.warn('sessions:', r.error.message); return []; }
    return r.data || [];
  }

  /* ═══════════════════════════════════════════
     REFERRAL STATS — for Invita panel
     ═══════════════════════════════════════════ */
  async function getReferralStats() {
    var userId = await getUserId();
    if (!userId) return null;
    var cached = cacheGet('referrals');
    if (cached) return cached;

    var r = await sb().from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    if (r.error) { console.warn('referrals:', r.error.message); return { total: 0, active: 0, earnedMinutes: 0 }; }

    var refs = r.data || [];
    var active = refs.filter(function(ref) { return ref.status === 'active'; }).length;
    // earned_minutes column not on referrals table — compute from active count
    var earnedMinutes = active * 15; // 15 min bonus per active referral

    var data = { total: refs.length, active: active, earnedMinutes: earnedMinutes };
    cacheSet('referrals', data);
    return data;
  }

  /* ═══════════════════════════════════════════
     AI REPORTS — for Report AI panel
     ═══════════════════════════════════════════ */
  async function getAIReports() {
    var userId = await getUserId();
    if (!userId) return [];
    var cached = cacheGet('aiReports');
    if (cached) return cached;

    var r = await sb().from('session_ai_reports')
      .select('id,summary,overall_score,confidence,module_id,created_at,status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (r.error) { console.warn('ai reports:', r.error.message); return []; }
    var data = r.data || [];
    cacheSet('aiReports', data);
    return data;
  }

  async function getAITokens() {
    var userId = await getUserId();
    if (!userId) return 0;
    var r = await sb().from('user_tokens').select('balance').eq('user_id', userId).single();
    if (r.error) return 0;
    return r.data?.balance || 0;
  }

  /* ═══════════════════════════════════════════
     CREDITS — minutes balance
     ═══════════════════════════════════════════ */
  async function getCredits() {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('user_credits').select('balance_minutes').eq('user_id', userId).single();
    if (r.error) return null;
    return { balanceMinutes: r.data?.balance_minutes || 0 };
  }

  /* ═══════════════════════════════════════════
     PREFERENCES
     ═══════════════════════════════════════════ */
  async function getPreferences() {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('user_preferences').select('*').eq('user_id', userId).single();
    if (r.error) return null;
    return r.data;
  }

  /* ═══════════════════════════════════════════
     SAVE — display name
     ═══════════════════════════════════════════ */
  async function saveProfileField(field, value) {
    var userId = await getUserId();
    if (!userId) return false;
    var update = {};
    update[field] = value;
    update.updated_at = new Date().toISOString();
    var r = await sb().from('profiles').upsert({ id: userId, updated_at: new Date().toISOString(), display_name: (field==='display_name'?value:undefined) }, { onConflict: 'id' });
    // For display_name specifically, use upsert
    if (field === 'display_name') {
      r = await sb().from('profiles').upsert({ id: userId, display_name: value, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    }
    if (r.error) { console.warn('save profile:', r.error.message); return false; }
    cacheClear(); // invalidate all cache on write
    return true;
  }

  /* ═══════════════════════════════════════════
     SETTINGS — Save all user settings at once
     ═══════════════════════════════════════════ */
  async function saveSettings(settings) {
    var userId = await getUserId();
    if (!userId) return false;
    var now = new Date().toISOString();

    // Save profile fields (display_name, native_lang)
    var profileUpdate = { id: userId, updated_at: now };
    if (settings.display_name !== undefined) profileUpdate.display_name = settings.display_name;
    if (settings.native_lang !== undefined) profileUpdate.native_lang = settings.native_lang;

    var r1 = await sb().from('profiles').upsert(profileUpdate, { onConflict: 'id' });
    if (r1.error) { console.warn('save profile:', r1.error.message); }

    // Save preferences (ui_language)
    if (settings.ui_language !== undefined) {
      var r2 = await sb().from('user_preferences').upsert({
        user_id: userId,
        ui_language: settings.ui_language,
        updated_at: now
      }, { onConflict: 'user_id' });
      if (r2.error) { console.warn('save prefs:', r2.error.message); }
    }

    cacheClear();
    return !r1.error;
  }

  /* ── Listen for language changes ── */
  document.addEventListener('studylang-changed', function(e) {
    cacheClear();
  });

  /* ═══════════════════════════════════════════
     WORD BANKS
     ═══════════════════════════════════════════ */
  async function getWordbanks(lang) {
    lang = lang || getStudyLang();
    var userId = await getUserId();
    if (!userId) return [];
    var cacheKey = 'wordbanks_' + lang;
    var cached = cacheGet(cacheKey);
    if (cached) return cached;
    var r = await sb().from('user_wordbanks').select('*').eq('user_id', userId).eq('lang', lang).order('created_at');
    if (r.error) { console.warn('wordbanks:', r.error.message); return []; }
    cacheSet(cacheKey, r.data);
    return r.data || [];
  }

  async function getWordbankWords(wordbankId) {
    var r = await sb().from('user_wordbank_words').select('*').eq('wordbank_id', wordbankId).order('usage_count', { ascending: false });
    if (r.error) return [];
    return r.data || [];
  }

  async function addWordbank(name, lang) {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('user_wordbanks').insert({ user_id: userId, name: name, lang: lang }).select().single();
    if (r.error) { console.warn('add wordbank:', r.error.message); return null; }
    cacheClear();
    return r.data;
  }

  async function addWordToBank(wordbankId, word, pos) {
    var r = await sb().from('user_wordbank_words').insert({ wordbank_id: wordbankId, word: word, pos: pos, usage_count: 0 }).select().single();
    if (r.error) { console.warn('add word:', r.error.message); return null; }
    return r.data;
  }

  /* ═══════════════════════════════════════════
     VOCABULARY
     ═══════════════════════════════════════════ */
  async function getVocabulary(lang, limit) {
    lang = lang || getStudyLang();
    limit = limit || 50;
    var userId = await getUserId();
    if (!userId) return [];
    var cacheKey = 'vocab_' + lang;
    var cached = cacheGet(cacheKey);
    if (cached) return cached.slice(0, limit);
    var r = await sb().from('user_vocabulary').select('*').eq('user_id', userId).eq('lang', lang).order('usage_count', { ascending: false }).limit(limit);
    if (r.error) { console.warn('vocab:', r.error.message); return []; }
    cacheSet(cacheKey, r.data);
    return r.data || [];
  }

  async function getVocabularyStats(lang) {
    lang = lang || getStudyLang();
    var userId = await getUserId();
    if (!userId) return null;
    var cacheKey = 'vocabStats_' + lang;
    var cached = cacheGet(cacheKey);
    if (cached) return cached;

    // POS breakdown from user_vocabulary
    var r = await sb().from('user_vocabulary').select('pos,cefr_level,usage_count').eq('user_id', userId).eq('lang', lang);
    if (r.error) {
      // Fallback: compute from sessions
      return await getVocabularyStatsFromSessions(lang);
    }
    var words = r.data || [];
    if (words.length === 0) return await getVocabularyStatsFromSessions(lang);

    var posCounts = {};
    var cefrCounts = {};
    var totalUsages = 0;
    words.forEach(function(w) {
      var pos = w.pos || 'OTHER';
      posCounts[pos] = (posCounts[pos] || 0) + (w.usage_count || 0);
      var cefr = w.cefr_level || '?';
      cefrCounts[cefr] = (cefrCounts[cefr] || 0) + (w.usage_count || 0);
      totalUsages += (w.usage_count || 0);
    });

    var posPcts = {};
    Object.keys(posCounts).forEach(function(k) { posPcts[k] = totalUsages > 0 ? Math.round(posCounts[k] / totalUsages * 100) : 0; });
    var cefrPcts = {};
    Object.keys(cefrCounts).forEach(function(k) { cefrPcts[k] = totalUsages > 0 ? Math.round(cefrCounts[k] / totalUsages * 100) : 0; });

    var data = { totalWords: words.length, totalUsages: totalUsages, posCounts: posCounts, posPcts: posPcts, cefrCounts: cefrCounts, cefrPcts: cefrPcts, words: words };
    cacheSet(cacheKey, data);
    return data;
  }

  async function getVocabularyStatsFromSessions(lang) {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('sessions')
      .select('words_count')
      .eq('user_id', userId).like('language_pair', lang + '%');
    if (r.error) return { totalWords: 0, totalUsages: 0, posCounts: {}, posPcts: {}, cefrCounts: {}, cefrPcts: {}, words: [] };
    // POS columns not yet in sessions table — return zeros
    var totalUsages = (r.data || []).reduce(function(s, row) { return s + (row.words_count || 0); }, 0);
    var posCounts = { NOUN: 0, VERB: 0, ADJ: 0, ADV: 0, PRON: 0, PREP: 0 };
    var cefrCounts = {};
    var posPcts = {};
    Object.keys(posCounts).forEach(function(k) { posPcts[k] = totalUsages > 0 ? Math.round(posCounts[k] / totalUsages * 100) : 0; });
    var cefrPcts = {};
    Object.keys(cefrCounts).forEach(function(k) { cefrPcts[k] = totalUsages > 0 ? Math.round(cefrCounts[k] / totalUsages * 100) : 0; });
    return { totalWords: 0, totalUsages: totalUsages, posCounts: posCounts, posPcts: posPcts, cefrCounts: cefrCounts, cefrPcts: cefrPcts, words: [] };
  }

  /* ═══════════════════════════════════════════
     TASKS — for Insights → Compiti
     ═══════════════════════════════════════════ */
  async function getTasks() {
    var userId = await getUserId();
    if (!userId) return [];
    var cached = cacheGet('tasks');
    if (cached) return cached;
    var r = await sb().from('user_tasks').select('*').eq('user_id', userId).order('created_at');
    if (r.error) { console.warn('tasks:', r.error.message); return []; }
    cacheSet('tasks', r.data);
    return r.data || [];
  }

  async function addTask(title) {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('user_tasks').insert({ user_id: userId, title: title, status: 'doing' }).select().single();
    if (r.error) { console.warn('add task:', r.error.message); return null; }
    cacheClear();
    return r.data;
  }

  async function updateTask(id, updates) {
    var r = await sb().from('user_tasks').update(updates).eq('id', id);
    if (r.error) { console.warn('update task:', r.error.message); return false; }
    cacheClear();
    return true;
  }

  async function deleteTask(id) {
    var r = await sb().from('user_tasks').delete().eq('id', id);
    if (r.error) { console.warn('delete task:', r.error.message); return false; }
    cacheClear();
    return true;
  }

  /* ═══════════════════════════════════════════
     CONTEXTUAL MESSAGES
     ═══════════════════════════════════════════ */
  async function getContextualMessages(stats) {
    var r = await sb().from('contextual_messages').select('*').eq('is_active', true).order('priority', { ascending: false });
    var allMessages = r.data || [];
    var shown = JSON.parse(localStorage.getItem('sottotitoli-dismissed-msgs') || '{}');
    var result = [];

    for (var i = 0; i < allMessages.length; i++) {
      var m = allMessages[i];
      if (shown[m.id]) continue; // user dismissed this one

      var match = false;
      var text = m.message_it;

      switch (m.trigger_key) {
        case 'onboarding':
          match = stats.totalSessions === 0;
          break;
        case 'no_sessions_7d':
          match = stats.daysSinceLastSession > 7;
          break;
        case 'streak_3':
          match = stats.streak >= 3 && stats.streak < 7;
          break;
        case 'streak_7':
          match = stats.streak >= 7 && stats.streak < 14;
          break;
        case 'streak_14':
          match = stats.streak >= 14;
          break;
        case 'first_report_ready':
          match = stats.totalSessions >= 3 && stats.reportCount === 0;
          break;
        case 'review_due':
          match = stats.reviewDue > 0;
          text = text.replace('{count}', stats.reviewDue);
          break;
        case 'cefr_milestone':
          match = stats.cefrMilestone !== null;
          if (match) text = text.replace('{level}', stats.cefrMilestone);
          break;
        case 'no_tasks':
          match = stats.taskCount === 0;
          break;
        case 'pro_trial_ending':
          match = stats.trialDaysLeft > 0 && stats.trialDaysLeft <= 7;
          if (match) text = text.replace('{days}', stats.trialDaysLeft);
          break;
        default:
          match = false;
      }

      if (match) {
        result.push({ id: m.id, message: text, actionLabel: m.action_label, actionPanel: m.action_panel });
        break; // show only the highest-priority match
      }
    }

    return result;
  }

  function dismissMessage(msgId) {
    var shown = JSON.parse(localStorage.getItem('sottotitoli-dismissed-msgs') || '{}');
    shown[msgId] = Date.now();
    localStorage.setItem('sottotitoli-dismissed-msgs', JSON.stringify(shown));
  }

  /* ═══════════════════════════════════════════
     STREAK computation
     ═══════════════════════════════════════════ */
  async function getStreak(lang) {
    lang = lang || getStudyLang();
    var userId = await getUserId();
    if (!userId) return 0;
    var r = await sb().from('sessions')
      .select('started_at').eq('user_id', userId)
      .like('language_pair', lang + '%').order('started_at', { ascending: false });
    if (r.error || !r.data) return 0;
    var dates = r.data.map(function(s) { return s.started_at ? s.started_at.substring(0, 10) : null; }).filter(Boolean);
    var unique = [];
    dates.forEach(function(d) { if (unique.indexOf(d) === -1) unique.push(d); });
    unique.sort().reverse();
    var streak = 0, prev = null, today = new Date().toISOString().substring(0, 10);
    for (var i = 0; i < unique.length; i++) {
      if (i === 0) {
        var diff = (new Date(today) - new Date(unique[0])) / 86400000;
        if (diff > 1) break; // streak broken if last session isn't today/yesterday
        streak = 1; prev = unique[0];
      } else {
        var diff2 = (new Date(prev) - new Date(unique[i])) / 86400000;
        if (diff2 === 1) { streak++; prev = unique[i]; }
        else break;
      }
    }
    return streak;
  }

  /* ═══════════════════════════════════════════
     EXPORT
     ═══════════════════════════════════════════ */
  /* ═══════════════════════════════════════════
     ANALYTICS SNAPSHOT — vocabulary + MATTR + CEFR
     ═══════════════════════════════════════════ */
  async function getAnalyticsSnapshot() {
    var userId = await getUserId();
    if (!userId) return null;
    var cached = cacheGet('analyticsSnapshot');
    if (cached) return cached;
    // user_analytics_snapshot table may not exist yet — return null gracefully
    try {
      var r = await sb().from('user_analytics_snapshot').select('*').eq('user_id', userId).single();
      if (r.error) { console.warn('analytics snapshot:', r.error.message); return null; }
      cacheSet('analyticsSnapshot', r.data);
      return r.data;
    } catch(e) {
      console.warn('analytics snapshot table not available:', e.message);
      return null;
    }
  }

  async function getCEFRBreakdown() {
    var snap = await getAnalyticsSnapshot();
    if (!snap) return null;
    return {
      A1: snap.cefr_a1 || 0,
      A2: snap.cefr_a2 || 0,
      B1: snap.cefr_b1 || 0,
      B2: snap.cefr_b2 || 0,
      C1: snap.cefr_c1 || 0,
      C2: snap.cefr_c2 || 0,
      total: (snap.cefr_a1||0)+(snap.cefr_a2||0)+(snap.cefr_b1||0)+(snap.cefr_b2||0)+(snap.cefr_c1||0)+(snap.cefr_c2||0),
      vocabSize: snap.vocab_size || 0,
      mattr: snap.mattr_avg || 0
    };
  }

  async function triggerSessionAnalytics(sessionId) {
    // Calls the Supabase edge function to process a session transcript
    try {
      var r = await sb().functions.invoke('process-session-analytics', {
        body: { session_id: sessionId }
      });
      if (r.error) { console.warn('trigger analytics:', r.error.message); return false; }
      cacheClear();
      return true;
    } catch(e) {
      console.warn('trigger analytics failed:', e.message);
      return false;
    }
  }

  window.SottotitoliData = {
    getUserId: getUserId,
    getUserMeta: getUserMeta,
    getProfile: getProfile,
    getSessionStats: getSessionStats,
    getSessions: getSessions,
    getReferralStats: getReferralStats,
    getAIReports: getAIReports,
    getAITokens: getAITokens,
    getCredits: getCredits,
    getPreferences: getPreferences,
    saveProfileField: saveProfileField,
    saveSettings: saveSettings,
    getWordbanks: getWordbanks,
    getWordbankWords: getWordbankWords,
    addWordbank: addWordbank,
    addWordToBank: addWordToBank,
    getVocabulary: getVocabulary,
    getVocabularyStats: getVocabularyStats,
    getAnalyticsSnapshot: getAnalyticsSnapshot,
    getCEFRBreakdown: getCEFRBreakdown,
    triggerSessionAnalytics: triggerSessionAnalytics,
    getTasks: getTasks,
    addTask: addTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    getContextualMessages: getContextualMessages,
    dismissMessage: dismissMessage,
    getStreak: getStreak,
    cacheClear: cacheClear
  };

})();
