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
      .select('id,duration_seconds,words_count,wpm_avg,lexical_diversity,quality_score,started_at,language_pair')
      .eq('user_id', userId)
      .like('language_pair', langFilter)
      .order('started_at', { ascending: false });

    if (r.error) { console.warn('session stats:', r.error.message); return null; }

    var sessions = r.data || [];
    var totalSessions = sessions.length;
    var totalSeconds = sessions.reduce(function(s, row) { return s + (row.duration_seconds || 0); }, 0);
    var totalWords = sessions.reduce(function(s, row) { return s + (row.words_count || 0); }, 0);
    var avgWpm = totalSessions > 0 ? sessions.reduce(function(s, row) { return s + (row.wpm_avg || 0); }, 0) / totalSessions : 0;
    var avgLexDiv = totalSessions > 0 ? sessions.reduce(function(s, row) { return s + (row.lexical_diversity || 0); }, 0) / totalSessions : 0;
    var avgQuality = totalSessions > 0 ? sessions.reduce(function(s, row) { return s + (row.quality_score || 0); }, 0) / totalSessions : 0;

    // This week's sessions
    var now = new Date();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var thisWeek = sessions.filter(function(s) { return new Date(s.started_at) >= weekAgo; });
    var lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    var lastWeek = sessions.filter(function(s) {
      var d = new Date(s.started_at);
      return d >= lastWeekStart && d < weekAgo;
    });

    var totalHours = (totalSeconds / 3600).toFixed(1);
    var totalMinutes = Math.round(totalSeconds / 60);

    var data = {
      totalSessions: totalSessions,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      totalWords: totalWords,
      avgWpm: avgWpm,
      avgLexDiv: avgLexDiv,
      avgQuality: avgQuality,
      thisWeekSessions: thisWeek.length,
      thisWeekMinutes: Math.round(thisWeek.reduce(function(s, r) { return s + (r.duration_seconds || 0); }, 0) / 60),
      lastWeekSessions: lastWeek.length,
      dailyAverageMinutes: thisWeek.length > 0 ? Math.round(thisWeek.reduce(function(s, r) { return s + (r.duration_seconds || 0); }, 0) / 60 / 7) : 0,
      // Trend indicators
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
    var cacheKey = 'sessions_' + lang;
    var cached = cacheGet(cacheKey);
    if (cached) return cached.slice(0, limit);

    var r = await sb().from('sessions')
      .select('id,name,started_at,duration_seconds,words_count,quality_score,favorite,language_pair,session_type')
      .eq('user_id', userId)
      .like('language_pair', lang + '%')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (r.error) { console.warn('sessions:', r.error.message); return []; }
    var data = r.data || [];
    cacheSet(cacheKey, data);
    return data;
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
    var earnedMinutes = refs.reduce(function(s, ref) { return s + (ref.earned_minutes || 0); }, 0);

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

  /* ── Listen for language changes ── */
  document.addEventListener('studylang-changed', function(e) {
    cacheClear();
    // Will be re-fetched on next panel load
  });

  /* ═══════════════════════════════════════════
     EXPORT
     ═══════════════════════════════════════════ */
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
    cacheClear: cacheClear
  };

})();
