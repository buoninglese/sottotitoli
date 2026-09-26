/* ═══════════════════════════════════════════════════════════════
   XP ENGINE — single source of truth for how many XP each action awards.
   - CONFIG  : per-action XP values, editable + copyable in dev/xp-config-mockup.html,
     persisted to localStorage "sottotitoli-xp-config". Exposed as window.XPCfg.
   - STORE   : delegated to js/learner.js via window.SottotitoliXPStore when that file is loaded,
     so there is ONE writer of "sottotitoli-learner" (xp / todayXp / streak) — the same store the
     trainer reads. Standalone pages stamp the write themselves. See bridge() below.
   - BACKUP  : the durable copy is learner_progress, written by js/learner.js with this same store.
     The old user_xp upsert here is retired (it would be a second, drifting backup); user_xp is
     still READ by restore() as a one-time legacy source for devices that predate it.
   The trainer XP is the "Allena" word-bank card-stack session
   (Learner.openBankTest → ics → gradeCard), NOT any legacy course copy.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  'use strict';

  var CONFIG_KEY = 'sottotitoli-xp-config';
  var LEARNER_KEY = 'sottotitoli-learner';

  /* ── Default XP values per action (edit via dev/xp-config-mockup.html) ── */
  var DEFAULT_CONFIG = {
    correct_answer: 1,     // per correct answer in the trainer (Allena card ≥Good, lesson, quiz, match, listen/speak)
    lesson_complete: 10,   // finishing a lesson
    test_passed: 20,       // passing a unit test (score ≥ 8/10)
    allena_complete: 5,    // finishing an Allena (word-bank / review) run
    mission_complete: 10,  // finishing a mission
    word_spoken: 1,        // per word spoken in a transcription session (caption-s8t)
    ai_report: 10          // per AI report generated
  };

  /* ── Actions list with bilingual labels (drives dev/xp-config-mockup.html) ── */
  var ACTIONS = [
    { key: 'correct_answer',  it: 'Risposta corretta (Allena · lezione · quiz · ascolto)', en: 'Correct answer (Allena · lesson · quiz · listen)' },
    { key: 'lesson_complete', it: 'Lezione completata', en: 'Lesson completed' },
    { key: 'test_passed',     it: 'Test superato (≥ 8/10)', en: 'Test passed (≥ 8/10)' },
    { key: 'allena_complete', it: 'Allena completato (banca parole / ripasso)', en: 'Allena completed (word bank / review)' },
    { key: 'mission_complete',it: 'Missione completata', en: 'Mission completed' },
    { key: 'word_spoken',     it: 'Parola pronunciata (sessione di trascrizione)', en: 'Word spoken (transcription session)' },
    { key: 'ai_report',       it: 'Report IA generato', en: 'AI report generated' }
  ];

  /* ── Config load/save/val ── */
  function cfgLoad() {
    try {
      var c = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
      if (c && typeof c === 'object') return Object.assign({}, DEFAULT_CONFIG, c);
    } catch (e) {}
    return Object.assign({}, DEFAULT_CONFIG);
  }
  function cfgSave(c) { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch (e) {} }
  function cfgReset() { try { localStorage.removeItem(CONFIG_KEY); } catch (e) {} return Object.assign({}, DEFAULT_CONFIG); }
  function cfgVal(k) {
    var c = cfgLoad();
    var v = c[k];
    return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : (DEFAULT_CONFIG[k] || 0);
  }

  /* ── Trainer store (mirrors js/learner.js load/save) ── */
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dateOffsetStr(offset) { var d = new Date(); d.setDate(d.getDate() + offset); return todayStrFrom(d); }
  function todayStrFrom(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function lDefaults() {
    return { xp: 0, streak: 0, lastDay: null, todayXp: 0, dailyGoal: 10, lessons: {}, tests: {}, mistakes: {}, practice: 0 };
  }
  /* The learner store has exactly ONE writer. js/learner.js publishes window.SottotitoliXPStore
   * when it is loaded (panoramica.html), and xp.js delegates to it so every write goes through its
   * `_updatedAt` stamp and its Supabase mirror. On pages that do NOT load learner.js
   * (caption-s8t.html) xp.js writes localStorage itself — but still stamps `_updatedAt`, so the
   * next page that does have learner.js sees a NEWER local copy and pushes it up instead of
   * overwriting it with the older server row. Without that stamp, XP earned on the transcript page
   * was silently lost the moment panoramica synced. */
  function bridge() {
    var b = w.SottotitoliXPStore;
    return (b && typeof b.load === 'function' && typeof b.save === 'function') ? b : null;
  }
  function lLoad() {
    var b = bridge();
    if (b) return b.load();
    var s;
    try { s = JSON.parse(localStorage.getItem(LEARNER_KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = lDefaults();
    s = Object.assign(lDefaults(), s);
    var today = todayStr();
    if (s.lastDay !== today) s.todayXp = 0;
    return s;
  }
  function lSave(s) {
    var b = bridge();
    if (b) { b.save(s); return; }
    s._updatedAt = Date.now();
    try { localStorage.setItem(LEARNER_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ── Award XP for an action (points = config value × count) ──
   * Returns the points awarded (0/null if the action is disabled). */
  function award(action, count) {
    var per = cfgVal(action);
    if (!per) return null;
    var n = Math.max(0, Math.round(count || 1)) * per;
    if (!n) return null;
    var s = lLoad();
    var today = todayStr();
    if (s.lastDay === today) { s.todayXp += n; }
    else if (s.lastDay === dateOffsetStr(-1)) { s.streak += 1; s.todayXp = n; }
    else { s.streak = 1; s.todayXp = n; }
    s.lastDay = today; s.xp += n;
    // Per-day totals, mirrored into the learner blob. learner.js reads these for the adaptive
    // daily goal (dailyGoalFor) — without them the goal can only ever be the flat default.
    s.xpDays = s.xpDays || {};
    s.xpDays[today] = (s.xpDays[today] || 0) + n;
    var dayKeys = Object.keys(s.xpDays).sort();
    while (dayKeys.length > 10) { delete s.xpDays[dayKeys.shift()]; }
    lSave(s);
    scheduleSync();
    if (w.dispatchEvent) { try { w.dispatchEvent(new CustomEvent('xp:changed', { detail: { action: action, n: n } })); } catch (e) {} }
    return n;
  }

  /* ── Supabase backup (debounced upsert) ── */
  var syncTimer = null;
  function scheduleSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 1500);
  }
  async function syncNow() {
    syncTimer = null;
    // With learner.js loaded, its store mirror already pushes these same fields to learner_progress —
    // writing user_xp as well would be a second backup that can drift. user_xp stays readable as the
    // legacy source restore() falls back to below; it is just no longer written from here.
    if (bridge()) return;
    var sb = w.sottotitoliSupabase;
    if (!sb) return;
    try {
      var r = await sb.auth.getSession();
      if (!r.data || !r.data.session) return;
      var uid = r.data.session.user.id;
      var s = lLoad();
      await sb.from('user_xp').upsert({
        user_id: uid, xp: s.xp, today_xp: s.todayXp, streak: s.streak, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) { /* offline / no table — local store still works */ }
  }

  /* ── Restore backup on a fresh device (local untouched + server has data) ── */
  async function restore() {
    var sb = w.sottotitoliSupabase;
    if (!sb) return;
    try {
      var r = await sb.auth.getSession();
      if (!r.data || !r.data.session) return;
      var uid = r.data.session.user.id;
      var res = await sb.from('user_xp').select('xp,today_xp,streak').eq('user_id', uid).maybeSingle();
      if (res.error || !res.data) return;
      var s = lLoad();
      if ((s.xp === 0 && !s.lastDay) && (res.data.xp > 0 || res.data.streak > 0)) {
        s.xp = res.data.xp; s.todayXp = res.data.today_xp; s.streak = res.data.streak;
        lSave(s);
      }
    } catch (e) {}
  }

  /* ── Current streak, in days ──
   * The streak is OWNED here: award() is the only thing that increments it, and it
   * lives in the learner store under LEARNER_KEY. Exposed so other panels read it
   * instead of guessing a storage key — the dashboard used to read
   * localStorage['s8t-streak'], which nothing has ever written, so the hero showed a
   * permanent 0. A streak only counts while the last activity is today or yesterday
   * (the same rollover award() applies), so an abandoned streak stops being shown. */
  function currentStreak() {
    var s = lLoad();
    if (!s.lastDay) return 0;
    if (s.lastDay !== todayStr() && s.lastDay !== dateOffsetStr(-1)) return 0;
    return Math.max(0, parseInt(s.streak, 10) || 0);
  }

  /* ── Public API ── */
  w.XPCfg = { load: cfgLoad, save: cfgSave, reset: cfgReset, val: cfgVal, defaults: DEFAULT_CONFIG, actions: ACTIONS };
  w.XP = { award: award, sync: syncNow, restore: restore, streak: currentStreak, cfg: w.XPCfg };
})(window);
