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
     PROFILE — always fresh, no cache
     ═══════════════════════════════════════════ */
  async function getProfile() {
    var userId = await getUserId();
    if (!userId) return null;
    var r = await sb().from('profiles').select('*').eq('id', userId).maybeSingle();
    if (r.error) { console.warn('getProfile:', r.error.message); return null; }
    var d = r.data || {};
    // Normalize: display_name comes from display_name or full_name column
    if (!d.display_name) d.display_name = d.full_name || '';
    return d;
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

    var totalHours = Math.round(totalSeconds / 3600);
    var totalMinutes = Math.round(totalSeconds / 60);

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
     LOAD ALL SETTINGS — single unified call
     Returns { display_name, native_lang, ui_language, save_sessions, anonymous_sharing }
     Always fresh from Supabase, falls back to localStorage.
     ═══════════════════════════════════════════ */
  async function loadSettings() {
    var userId = await getUserId();
    if (!userId) { console.warn('loadSettings: no user id'); return loadLocalSettings(); }

    var _a = await Promise.all([
      sb().from('profiles').select('full_name,display_name,native_lang').eq('id', userId).maybeSingle(),
      sb().from('user_preferences').select('ui_language,save_sessions,anonymous_sharing').eq('user_id', userId).maybeSingle()
    ]);

    var profileR = _a[0], prefsR = _a[1];
    var profile = profileR.data || {};
    var prefs = prefsR.data || {};

    if (profileR.error) console.warn('loadSettings profiles:', profileR.error.message);
    if (prefsR.error) console.warn('loadSettings prefs:', prefsR.error.message);

    var result = {
      display_name: profile.display_name || profile.full_name || '',
      native_lang: profile.native_lang || '',
      ui_language: prefs.ui_language || 'it',
      save_sessions: prefs.save_sessions !== undefined ? prefs.save_sessions : true,
      anonymous_sharing: prefs.anonymous_sharing !== undefined ? prefs.anonymous_sharing : false
    };

    // Fallback: merge with localStorage for any missing fields
    var local = loadLocalSettings();
    if (local) {
      if (!result.display_name && local.display_name) result.display_name = local.display_name;
      if (!result.native_lang && local.native_lang) result.native_lang = local.native_lang;
    }

    console.log('loadSettings:', JSON.stringify(result));
    return result;
  }

  /* ── Load settings from localStorage (offline fallback) ── */
  function loadLocalSettings() {
    try {
      var raw = localStorage.getItem('sottotitoli-settings');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  /* ═══════════════════════════════════════════
     SAVE SETTINGS — unified, per-field error reporting
     Returns { ok: bool, errors: [...] }
     ═══════════════════════════════════════════ */
  async function saveSettings(settings) {
    var userId = await getUserId();
    if (!userId) {
      console.warn('saveSettings: no user id — saving to localStorage only');
      saveLocalSettings(settings);
      return { ok: false, errors: ['Not authenticated — saved locally'] };
    }

    var now = new Date().toISOString();
    var errors = [];

    // ── Save to profiles (display_name → full_name column) ──
    var profileUpdate = { id: userId, updated_at: now };
    if (settings.display_name !== undefined) {
      profileUpdate.full_name = settings.display_name;
      profileUpdate.display_name = settings.display_name;
    }
    if (settings.native_lang !== undefined) {
      profileUpdate.native_lang = settings.native_lang;
    }
    if (settings.display_name !== undefined || settings.native_lang !== undefined) {
      var r1 = await sb().from('profiles').upsert(profileUpdate, { onConflict: 'id' });
      if (r1.error) {
        if (r1.error.message && r1.error.message.indexOf('display_name') !== -1) {
          delete profileUpdate.display_name;
          r1 = await sb().from('profiles').upsert(profileUpdate, { onConflict: 'id' });
        }
        if (r1.error) {
          errors.push('profiles: ' + r1.error.message);
          console.warn('saveSettings profiles:', r1.error.message);
        }
      }
    }

    // ── Save to user_preferences ──
    var prefUpdate = { user_id: userId, updated_at: now };
    if (settings.ui_language !== undefined) prefUpdate.ui_language = settings.ui_language;
    if (settings.save_sessions !== undefined) prefUpdate.save_sessions = settings.save_sessions;
    if (settings.anonymous_sharing !== undefined) prefUpdate.anonymous_sharing = settings.anonymous_sharing;
    if (settings.ui_language !== undefined || settings.save_sessions !== undefined || settings.anonymous_sharing !== undefined) {
      var r2 = await sb().from('user_preferences').upsert(prefUpdate, { onConflict: 'user_id' });
      if (r2.error) {
        errors.push('preferences: ' + r2.error.message);
        console.warn('saveSettings preferences:', r2.error.message);
      }
    }

    // ── Always save to localStorage as backup ──
    saveLocalSettings(settings);

    var ok = errors.length === 0;
    console.log('saveSettings:', { ok: ok, errors: errors });
    return { ok: ok, errors: errors };
  }

  function saveLocalSettings(settings) {
    try {
      var existing = loadLocalSettings() || {};
      if (settings.display_name !== undefined) existing.display_name = settings.display_name;
      if (settings.native_lang !== undefined) existing.native_lang = settings.native_lang;
      if (settings.ui_language !== undefined) existing.ui_language = settings.ui_language;
      if (settings.save_sessions !== undefined) existing.save_sessions = settings.save_sessions;
      if (settings.anonymous_sharing !== undefined) existing.anonymous_sharing = settings.anonymous_sharing;
      localStorage.setItem('sottotitoli-settings', JSON.stringify(existing));
    } catch(e) {}
  }

  /* ── Single field save (backward compat) ── */
  async function saveProfileField(field, value) {
    var s = {}; s[field] = value;
    var r = await saveSettings(s);
    return r.ok;
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
      var r = await sb().from('user_analytics_snapshot').select('*').eq('user_id', userId).maybeSingle();
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
    loadSettings: loadSettings,
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
