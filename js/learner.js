/* ═══ Learner — guided Italian course (Duolingo-style) ═══
 * Powers the "Learner" tab in panoramica.html.
 *   - Path view: levels → units → lesson nodes + unit tests
 *   - Lesson player: listen (TTS it-IT) → speak (Web Speech it-IT) →
 *     matching → multiple choice → conversation
 *   - Practice: quick quiz / pronunciation / matching from learned words
 *   - Progress: XP, streak, daily goal, per-level completion, mistake review
 * Progress persists in localStorage ("sottotitoli-learner").
 */
(function (w) {
  'use strict';

  var COURSE = w.LEARNER_COURSE;
  if (!COURSE) { if (w.console) w.console.warn('Learner: js/learner-data.js not loaded'); return; }

  /* ── Tiny helpers ── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }
  // HTML-attribute-safe JS string literal for inline onclick args (handles apostrophes like l'ufficio)
  function jsArg(s) {
    return "'" + String(s == null ? '' : s)
      .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "'";
  }
  function t(key) { return (w.I18n && w.I18n.t) ? w.I18n.t(key) : key; }
  // Deterministic i18n for injected content: translate each [data-i18n] element.
  // (I18n.apply on a large scope can race with the app's own _isTranslating guard;
  //  per-element translateElement is stable and works regardless.)
  function i18nScope(scope) {
    if (!scope || !w.I18n || !w.I18n.translateElement) return;
    $all('[data-i18n]', scope).forEach(function (el) {
      try { w.I18n.translateElement(el); } catch (e) {}
    });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dateOffsetStr(offset) { var d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // Normalize for speech comparison (lowercase, strip accents/punct)
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ── Progress store (localStorage + daily rollover) ── */
  var KEY = 'sottotitoli-learner';
  function defaultState() {
    return { xp: 0, streak: 0, lastDay: null, todayXp: 0, dailyGoal: 10, lessons: {}, tests: {}, mistakes: {}, practice: 0 };
  }
  function load() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = defaultState();
    s = Object.assign(defaultState(), s);
    // Migrate legacy flat mistakes { word: n } → { 'en:word': n } so recent
    // mistakes can be shown per language (English/Italiano tabs).
    var mk = s.mistakes || {};
    var hasComposite = Object.keys(mk).some(function (k) { return k.indexOf('en:') === 0 || k.indexOf('it:') === 0; });
    if (!hasComposite && Object.keys(mk).length) {
      var migrated = {};
      Object.keys(mk).forEach(function (k) { migrated['en:' + k] = mk[k]; });
      s.mistakes = migrated;
    }
    // Daily rollover
    var today = todayStr();
    if (s.lastDay !== today) { s.todayXp = 0; }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function addXp(n) {
    var s = load();
    var today = todayStr();
    if (s.lastDay === today) { s.todayXp += n; }
    else if (s.lastDay === dateOffsetStr(-1)) { s.streak += 1; s.todayXp = n; }
    else { s.streak = 1; s.todayXp = n; }
    s.lastDay = today; s.xp += n;
    save(s); return s;
  }
  function markLessonDone(unitId, lessonId) {
    var s = load(); s.lessons[unitId + ':' + lessonId] = todayStr(); save(s); return s;
  }
  function markTestResult(unitId, passed, score) {
    var s = load();
    var cur = s.tests[unitId] || { passed: false, score: 0, best: 0 };
    if (passed) cur.passed = true;
    cur.score = score;
    cur.best = Math.max(cur.best || 0, score);
    cur.date = todayStr();
    s.tests[unitId] = cur; save(s); return s;
  }
  // Recent mistakes are keyed by language so English and Italiano each show
  // their own list (e.g. 'en:house', 'it:casa').
  function mistakeKey(lang, itWord) { return (lang || learnerLang()) + ':' + String(itWord); }
  function recordMistake(itWord, lang) { var s = load(); var k = mistakeKey(lang, itWord); s.mistakes[k] = (s.mistakes[k] || 0) + 1; save(s); return s; }
  function clearMistake(key) { var s = load(); delete s.mistakes[key]; save(s); return s; }

  /* ── Real data sources: user word banks + SRS review words (Phase 1) ──
   * The bundled course stays only as a not-logged-in fallback.
   * Words are enriched with the same APIs the word boxes use:
   *   MyMemory translation, dictionary-proxy definitions, local CEFR_LEVELS.
   * All lazy + cached. */
  var SRC = { banks: {}, bankWords: {}, review: {}, reviewAll: {}, pool: {} };
  var ENR = {}; // enrichment cache: 'lang:word' -> { translation, definition }

  // Drop cached source data so the next render re-queries fresh values.
  function srcReset() { SRC.banks = {}; SRC.bankWords = {}; SRC.review = {}; SRC.reviewAll = {}; SRC.pool = {}; }

  // ── Active learner language ──
  // This site is for Italians learning English: the English tab is primary,
  // the Italian tab trains the reverse direction. Persisted per-user.
  var LANG_KEY = 'sottotitoli-learner-lang';
  function learnerLang() {
    var l = null;
    try { l = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (l !== 'en' && l !== 'it') l = (w.SOTTOTITOLI_STUDY_LANG === 'it') ? 'it' : 'en';
    return l;
  }
  function learnerSetLang(l) {
    if (l !== 'en' && l !== 'it') l = 'en';
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    srcReset();
    return l;
  }
  // TTS / recognition voice for a learner language
  function voiceOf(lang) { return lang === 'it' ? 'it-IT' : 'en-US'; }
  // Explanation language for a target: EN tab explains in Italian, IT tab in English.
  function learnerExplainLang(target) { return target === 'it' ? 'en' : 'it'; }

  function srcSb() { return w.sottotitoliSupabase; }
  async function srcUid() {
    try { var sb = srcSb(); if (!sb) return null; var r = await sb.auth.getSession(); return (r.data && r.data.session) ? r.data.session.user.id : null; }
    catch (e) { return null; }
  }
  async function srcIsAuthed() { return !!(await srcUid()); }
  function learnerStudyLang() { return w.SOTTOTITOLI_STUDY_LANG || 'en'; }

  async function srcBanks(lang) {
    lang = lang || learnerLang();
    if (SRC.banks[lang]) return SRC.banks[lang];
    var sb = srcSb(); if (!sb) return (SRC.banks[lang] = []);
    var uid = await srcUid(); if (!uid) return (SRC.banks[lang] = []);
    try {
      var r = await sb.from('user_wordbanks').select('id,name,lang').eq('user_id', uid).eq('lang', lang).order('created_at', { ascending: true });
      SRC.banks[lang] = (r.data || []).map(function (b) { return { id: b.id, name: b.name, lang: (b.lang || lang), wordCount: 0 }; });
      SRC.banks[lang].forEach(function (b) {
        sb.from('user_wordbank_words').select('id', { count: 'exact', head: true }).eq('wordbank_id', b.id).then(function (r2) { if (r2 && r2.count != null) b.wordCount = r2.count; });
      });
    } catch (e) { SRC.banks[lang] = []; }
    return SRC.banks[lang];
  }

  async function srcBankWords(bankId, lang) {
    if (SRC.bankWords[bankId]) return SRC.bankWords[bankId];
    var words = [];
    try { if (w.SottotitoliData && w.SottotitoliData.getWordbankWords) words = (await w.SottotitoliData.getWordbankWords(bankId)) || []; } catch (e) { words = []; }
    SRC.bankWords[bankId] = words.map(function (ww) {
      var cefr = ww.cefr || ww.cefr_level || '';
      if (!cefr && w.CEFR_LEVELS) cefr = w.CEFR_LEVELS[String(ww.word || '').toLowerCase()] || '';
      return { word: ww.word, lang: lang || 'en', pos: ww.pos || '', cefr: cefr, usage: ww.usage_count || 0, translation: '', definition: '' };
    });
    return SRC.bankWords[bankId];
  }

  async function srcReview(kind, lang) {
    lang = lang || learnerLang();
    var key = lang + ':' + kind;
    if (SRC.review[key]) return SRC.review[key];
    var out = [];
    var sb = srcSb();
    if (sb) {
      var uid = await srcUid();
      if (uid) {
        try {
          var q = sb.from('review_words').select('*').eq('user_id', uid).eq('lang', lang).limit(200);
          var nowISO = new Date().toISOString();
          if (kind === 'due') q = q.or('next_review_at.lte.' + nowISO + ',is_new.eq.true');
          else if (kind === 'fragile') q = q.or('mastery_score.lt.40,lapses.gte.2');
          else if (kind === 'new') q = q.eq('is_new', true);
          else if (kind === 'mastered') q = q.eq('review_state', 'mastered');
          var r = await q;
          out = (r.data || []).map(function (rw) {
            var cefr = rw.cefr || '';
            return { word: rw.lemma || rw.word, lang: lang, pos: rw.pos || '', cefr: cefr, definition: rw.translation_primary || '', translation: rw.translation_primary || '', usage: rw.personal_frequency || 0, reps: rw.reps || 0 };
          });
        } catch (e) { out = []; }
      }
    }
    SRC.review[key] = out;
    return out;
  }

  // Full review set for the Progress dashboard: derive due/fragile/mastered + CEFR client-side.
  async function srcReviewAll(lang) {
    lang = lang || learnerLang();
    if (SRC.reviewAll[lang]) return SRC.reviewAll[lang];
    var out = [];
    var sb = srcSb();
    if (sb) {
      var uid = await srcUid();
      if (uid) {
        try {
          var r = await sb.from('review_words')
            .select('id,lemma,pos,cefr,translation_primary,next_review_at,is_new,lapses,mastery_score,review_state,personal_frequency,reps,created_at')
            .eq('user_id', uid).eq('lang', lang).limit(500);
          out = (r.data || []).map(function (rw) {
            return { word: rw.lemma || rw.word, lang: lang, pos: rw.pos || '', cefr: rw.cefr || '', translation: rw.translation_primary || '', nextReviewAt: rw.next_review_at, isNew: !!rw.is_new, lapses: rw.lapses || 0, mastery: rw.mastery_score || 0, state: rw.review_state || 'new', usage: rw.personal_frequency || 0, reps: rw.reps || 0 };
          });
        } catch (e) { out = []; }
      }
    }
    SRC.reviewAll[lang] = out;
    return out;
  }

  // Lazy enrichment: translation (MyMemory) + definition (dictionary-proxy). Cached in-memory.
  async function enrichWord(word, lang) {
    lang = lang || learnerLang();
    var key = lang + ':' + String(word || '').toLowerCase();
    if (ENR[key]) return ENR[key];
    var out = { translation: '', definition: '' };
    ENR[key] = out;
    var pair = (lang === 'en') ? ('en|it') : ('it|' + learnerExplainLang(lang));
    try {
      var tr = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=' + pair);
      var tj = await tr.json();
      if (tj && tj.responseData && tj.responseData.translatedText) out.translation = tj.responseData.translatedText;
    } catch (e) {}
    if (lang === 'en') {
      try {
        var d = await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/dictionary-proxy?word=' + encodeURIComponent(String(word).toLowerCase()));
        var dj = await d.json();
        if (dj && !dj.notFound && dj.definition) out.definition = dj.definition;
      } catch (e) {}
    }
    return out;
  }

  // Real distractor pool: every word the user actually has in the target language.
  async function realPool(lang) {
    lang = lang || learnerLang();
    if (SRC.pool[lang]) return SRC.pool[lang];
    var words = [];
    var banks = await srcBanks(lang);
    for (var i = 0; i < banks.length; i++) {
      var ws = await srcBankWords(banks[i].id, lang);
      words = words.concat(ws.map(function (x) { return x.word; }));
    }
    words = words.concat((await srcReview('due', lang)).map(function (x) { return x.word; }));
    words = words.concat((await srcReview('fragile', lang)).map(function (x) { return x.word; }));
    words = words.concat((await srcReview('new', lang)).map(function (x) { return x.word; }));
    SRC.pool[lang] = words.filter(Boolean);
    return SRC.pool[lang];
  }

  /* ── Mission (Phase 2): objectives-driven AI lesson ── */
  function learnerMissionUrl() {
    return (w.SOTTOTITOLI_CONFIG && w.SOTTOTITOLI_CONFIG.generateLearnerContentUrl) ||
      'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-learner-content';
  }
  function missionCacheKey() { return 'sottotitoli-learner-mission-' + learnerLang(); }
  function missionCached() {
    try { return JSON.parse(localStorage.getItem(missionCacheKey()) || 'null'); } catch (e) { return null; }
  }
  function missionSave(lesson) {
    try { localStorage.setItem(missionCacheKey(), JSON.stringify(lesson)); } catch (e) {}
  }
  function missionClear() {
    try { localStorage.removeItem(missionCacheKey()); } catch (e) {}
  }
  async function generateMission(focus, target) {
    var sb = srcSb();
    if (!sb) return null;
    try {
      var sess = await sb.auth.getSession();
      var token = (sess && sess.data && sess.data.session) ? sess.data.session.access_token : null;
      if (!token) return null;
      var resp = await fetch(learnerMissionUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ focus: focus || null, target: target || learnerLang() })
      });
      if (!resp.ok) return null;
      var j = await resp.json();
      if (!j || j.error || !j.lesson) return null;
      missionSave(j.lesson);
      return j.lesson;
    } catch (e) { return null; }
  }

  /* ── Course helpers ── */
  function unitsFlat() {
    var out = [];
    COURSE.levels.forEach(function (lv) { lv.units.forEach(function (u) { out.push(u); }); });
    return out;
  }
  // Global lesson order: [ { unit, lesson, ui, li } ... ]
  function globalLessons() {
    var out = [];
    COURSE.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        u.lessons.forEach(function (l) { out.push({ unit: u, lesson: l }); });
      });
    });
    return out;
  }
  function lessonDone(uId, lId) { return !!load().lessons[uId + ':' + lId]; }
  function unitLessonsDone(u) {
    var s = load();
    return u.lessons.filter(function (l) { return !!s.lessons[u.id + ':' + l.id]; }).length;
  }
  function isLessonAvailable(u, l) {
    var gl = globalLessons();
    for (var i = 0; i < gl.length; i++) {
      if (gl[i].unit.id === u.id && gl[i].lesson.id === l.id) {
        if (i === 0) return true;
        var prev = gl[i - 1];
        return !!load().lessons[prev.unit.id + ':' + prev.lesson.id];
      }
    }
    return false;
  }
  function isTestAvailable(u) { return u.lessons.length > 0 && unitLessonsDone(u) === u.lessons.length; }

  /* ── Audio (TTS it-IT) ── */
  var itVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in w)) return;
    var vs = w.speechSynthesis.getVoices();
    if (!vs.length) return;
    itVoice = vs.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf('it') === 0; }) || null;
  }
  if ('speechSynthesis' in w) {
    pickVoice();
    w.speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text, rate) {
    if (!('speechSynthesis' in w)) return false;
    try {
      w.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = voiceOf(session ? session.lang : learnerLang());
      u.rate = rate || 0.92;
      if (itVoice && voiceOf(session ? session.lang : learnerLang()) === 'it-IT') u.voice = itVoice;
      w.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* ── Speech recognition (session language) ── */
  var recog = null;
  function hasRecognition() {
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }
  function makeRecognition(onResult, onEnd, onError) {
    var SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return null;
    var r = new SR();
    r.lang = voiceOf(session ? session.lang : learnerLang());
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onresult = function (ev) {
      var best = '';
      for (var i = 0; i < ev.results.length; i++) {
        if (ev.results[i][0]) best = ev.results[i][0].transcript;
      }
      if (best) onResult(best);
    };
    r.onend = function () { if (onEnd) onEnd(); };
    r.onerror = function (e) { if (onError) onError(e && e.error); };
    return r;
  }

  /* ── Confetti (tiny canvas) ── */
  function confetti() {
    var c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    c.width = w.innerWidth; c.height = w.innerHeight;
    var colors = ['#22c55e', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#f472b6', '#14b8a6'];
    var parts = [], N = 150;
    for (var i = 0; i < N; i++) {
      parts.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.3, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3, rot: Math.random() * Math.PI, vr: -0.12 + Math.random() * 0.24, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    var frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        if (p.y > c.height + 20) { p.y = -20; p.x = Math.random() * c.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (++frames < 230) requestAnimationFrame(tick); else c.remove();
    })();
  }

  /* ── Toast ── */
  var toastTimer = null;
  function toast(msg) {
    var el = $('#learnerToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ── Session engine (lesson / test / practice) ── */
  var session = null; // { mode, unit?, lesson?, steps, idx, earned, matchState?, mcIndex?, convoPhase? }
  var rootEl = null;  var lastPane = 'learner-en';
  function buildStepsForLesson(lesson) {
    var steps = [];
    (lesson.vocabulary || []).forEach(function (v) { steps.push({ type: 'listen', item: v }); });
    (lesson.phrases || []).forEach(function (p) { steps.push({ type: 'speak', item: p }); });
    var mpool = sample(lesson.vocabulary || [], Math.min(5, (lesson.vocabulary || []).length));
    if (mpool.length >= 3) steps.push({ type: 'match', pairs: shuffle(mpool.map(function (v) { return { it: v.it, en: v.en }; })) });
    var qpool = sample((lesson.vocabulary || []).concat(lesson.phrases || []), 5);
    if (qpool.length) steps.push({ type: 'mc', questions: qpool.map(function (item) { return { prompt: item.en, answer: item.it, options: optionsFor(item.it) }; }) });
    if (lesson.conversations && lesson.conversations.length) steps.push({ type: 'convo', convo: lesson.conversations[0] });
    return steps;
  }

  function buildStepsForTest(unit) {
    var pool = [];
    unit.lessons.forEach(function (l) { pool = pool.concat(l.vocabulary || []).concat(l.phrases || []); });
    var qpool = sample(pool, 6);
    var mpairs = sample(pool, 4);
    var steps = [];
    if (qpool.length) steps.push({ type: 'mc', questions: qpool.map(function (item) { return { prompt: item.en, answer: item.it, options: optionsFor(item.it) }; }) });
    if (mpairs.length >= 3) steps.push({ type: 'match', pairs: shuffle(mpairs.map(function (v) { return { it: v.it, en: v.en }; })) });
    return steps;
  }

  function buildStepsForPractice(mode, learnedWords) {
    if (mode === 'speak') {
      var phrases = learnedWords.filter(function (p) { return p.en.split(' ').length >= 2; });
      var sp = sample(phrases.length ? phrases : learnedWords, 5);
      return sp.map(function (p) { return { type: 'speak', item: p }; });
    }
    if (mode === 'match') {
      var mp = sample(learnedWords, 4);
      return mp.length >= 3 ? [{ type: 'match', pairs: shuffle(mp.map(function (v) { return { it: v.it, en: v.en }; })) }] : [];
    }
    // mixed quiz
    var qp = sample(learnedWords, 6);
    var mp2 = sample(learnedWords, 4);
    var steps = [];
    if (qp.length) steps.push({ type: 'mc', questions: qp.map(function (item) { return { prompt: item.en, answer: item.it, options: optionsFor(item.it) }; }) });
    if (mp2.length >= 3) steps.push({ type: 'match', pairs: shuffle(mp2.map(function (v) { return { it: v.it, en: v.en }; })) });
    return steps;
  }

  function optionsFor(answerIt, pool) {
    var opts = [answerIt];
    var all = pool || (w.LEARNER_ALL_WORDS ? w.LEARNER_ALL_WORDS() : []);
    var tries = 0;
    while (opts.length < 4 && tries < 300) {
      tries++;
      var c = all[Math.floor(Math.random() * all.length)];
      var cand = (typeof c === 'string') ? c : (c && c.it);
      if (cand && opts.indexOf(cand) === -1) opts.push(cand);
    }
    return shuffle(opts);
  }

  function learnedWords() {
    var s = load();
    var words = [];
    COURSE.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        u.lessons.forEach(function (l) {
          if (s.lessons[u.id + ':' + l.id]) {
            (l.vocabulary || []).forEach(function (v) { words.push(v); });
            (l.phrases || []).forEach(function (p) { words.push(p); });
          }
        });
      });
    });
    return words;
  }

  /* ═══════════════════ RENDER: shell + tabs ═══════════════════ */
  function renderShell() {
    if (!rootEl) return;
    var s = load();
    var goalPct = Math.min(100, Math.round((s.todayXp / (s.dailyGoal || 1)) * 100));
    rootEl.innerHTML =
      '<div class="learner-wrap">' +
        '<div class="learner-hero">' +
          '<span class="lh-lang"><span class="lh-lang-flag">' + (learnerLang() === 'it' ? '🇮🇹' : '🇬🇧') + '</span><span>' + (learnerLang() === 'it' ? t('learner_lang_it') : t('learner_lang_en')) + '</span></span>' +
          '<div><div class="lh-xp">' + s.xp + '<small data-i18n="learner_xp">XP</small></div></div>' +
          '<div class="lh-goal">' +
            '<div class="goal-top"><span data-i18n="learner_daily_goal">Obiettivo giornaliero</span><span>' + s.todayXp + ' / ' + s.dailyGoal + '</span></div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + goalPct + '%"></div></div>' +
          '</div>' +
          '<div class="lh-streak"><span class="flame">🔥</span><span>' + s.streak + ' <span data-i18n="learner_streak">Serie</span></span></div>' +
        '</div>' +
        '<div role="tabpanel" class="subtab-pane active" id="sub-learner-overview"></div>' +
        '<div role="tabpanel" class="subtab-pane" id="sub-learner-path"></div>' +
      '</div>';
    // i18n for injected chrome
    i18nScope(rootEl);
  }

  function showPane(name) {
    if (!rootEl) return;
    lastPane = name;
    // Sync the segmented tabs in the static panel-head (Overview / English / Italiano)
    $all('#pnl-learner .tab-link[data-subtab]').forEach(function (b) {
      var on = b.getAttribute('data-subtab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var paneId = paneIdFor(name);
    $all('.subtab-pane', rootEl).forEach(function (p) {
      p.classList.toggle('active', p.id === paneId);
    });
    // The fixed tracking bar (XP / goal / streak) belongs to the language tabs,
    // not to the Overview dashboard (which has its own stats).
    var hero = $('.learner-hero', rootEl);
    if (hero) hero.style.display = (name === 'learner-overview') ? 'none' : '';
    renderPane(name);
  }

  // English/Italiano are the language switch for the shared path pane;
  // Overview hosts the progress dashboard.
  function paneIdFor(name) {
    if (name === 'learner-overview') return 'sub-learner-overview';
    return 'sub-learner-path'; // learner-en / learner-it / learner-path (legacy)
  }

  // Keep the hero's language chip in sync when English/Italiano is selected.
  function updateHeroLang() {
    if (!rootEl) return;
    var chip = $('.lh-lang', rootEl);
    if (!chip) return;
    var l = learnerLang();
    chip.innerHTML = '<span class="lh-lang-flag">' + (l === 'it' ? '🇮🇹' : '🇬🇧') + '</span><span>' + (l === 'it' ? t('learner_lang_it') : t('learner_lang_en')) + '</span>';
  }

  function renderPane(name) {
    if (name === 'learner-overview') renderProgress();
    else if (name === 'learner-en') { learnerSetLang('en'); updateHeroLang(); renderPath(); }
    else if (name === 'learner-it') { learnerSetLang('it'); updateHeroLang(); renderPath(); }
    else if (name === 'learner-path') renderPath();
    else if (name === 'learner-practice') renderPractice();
    else if (name === 'learner-progress') renderProgress();
  }

  /* ── PATH (real data: word banks + spaced review) ── */
  function renderPath() {
    var pane = $('#sub-learner-path', rootEl);
    if (!pane) return;
    pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">⏳</div><div class="le-title">' + t('learner_loading') + '</div></div>';
    loadPath(pane);
  }

  async function loadPath(pane) {
    var authed = await srcIsAuthed();
    if (!authed) { renderBundledPath(pane); return; }
    var lang = learnerLang();
    var due = await srcReview('due', lang);
    var fragile = await srcReview('fragile', lang);
    var fresh = await srcReview('new', lang);
    // Word banks live on the Word-banks tab; the path always shows the two
    // missions + spaced review (per language) + recent mistakes.
    renderRealPath(pane, due, fragile, fresh, lang);
  }

  function renderEmptyPath(pane) {
    pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">🗂️</div><div class="le-title">' + t('learner_empty_path') + '</div>' +
      '<div class="le-sub">' + t('learner_empty_path_sub') + '</div></div>';
    i18nScope(pane);
  }

  function renderRealPath(pane, due, fragile, fresh, lang) {
    var s = load();
    var html = '';
    // ── Spaced review (always visible on both English & Italiano) ──
    html += '<div class="lr-section-head"><span class="lr-section-title">' + t('learner_review') + '</span>' +
      '<span class="lr-section-sub">' + t('learner_review_sub') + '</span></div>';
    var reviewCards = [
      { kind: 'due', icon: '⏰', title: t('learner_review_due'), sub: t('learner_review_due_sub'), count: due.length },
      { kind: 'fragile', icon: '🧩', title: t('learner_review_fragile'), sub: t('learner_review_fragile_sub'), count: fragile.length },
      { kind: 'new', icon: '✨', title: t('learner_review_new'), sub: t('learner_review_new_sub'), count: fresh.length }
    ];
    // Always render the three cards with their counts (0 included) so both
    // English and Italiano show the review section, hooked to their language.
    html += '<div class="lr-review-grid">';
    reviewCards.forEach(function (c) {
      html += '<div class="lr-review-card' + (c.count > 0 ? '' : ' empty') + '" tabindex="0" onclick="Learner.confirmReview(\'' + c.kind + '\',' + c.count + ')">' +
        '<span class="lr-review-icon">' + c.icon + '</span>' +
        '<div class="lr-review-body"><div class="lr-review-title">' + c.title + '</div><div class="lr-review-sub">' + c.sub + '</div></div>' +
        '<span class="lr-review-count">' + c.count + '</span>' +
      '</div>';
    });
    html += '</div>';
    // ── Missions: one around the user's goals, one on essential thematic vocab ──
    var mission = missionCached();
    html += '<div class="lr-section-head lr-sec-mt"><span class="lr-section-title">' + t('learner_missions') + '</span>' +
      '<span class="lr-section-sub">' + t('learner_missions_sub') + '</span></div>';
    html += '<div class="lr-missions-grid">';
    // Card 1 — objectives-driven AI mission (from the user's goals)
    html += '<div class="lr-mission-card' + (mission ? ' ready' : '') + '">' +
      '<div class="lr-mission-glow">🎯</div>' +
      '<div class="lr-mission-body">' +
        (mission
          ? '<div class="lr-mission-title">' + esc(mission.title || '') + '</div>' +
            (mission.objective ? '<div class="lr-mission-obj">' + esc(mission.objective) + '</div>' : '') +
            '<div class="lr-mission-sub">' + esc(mission.subtitle || '') + '</div>'
          : '<div class="lr-mission-title">' + t('learner_mission_cta') + '</div>' +
            '<div class="lr-mission-obj">' + t('learner_mission_cta_sub') + '</div>') +
      '</div>' +
      '<div class="lr-mission-actions">' +
        '<button type="button" class="primary-btn lr-mission-go" onclick="Learner.confirmMission()">' + (mission ? t('learner_mission_start') : t('learner_mission_generate')) + '</button>' +
        (mission ? '<button type="button" class="lesson-link lr-mission-new" onclick="Learner.confirmNewMission()" title="' + t('learner_mission_new') + (regenRemaining() > 0 ? ' · ' + regenRemaining() + ' ' + t('learner_regen_left') : '') + '">↻</button>' : '') +
      '</div>' +
    '</div>';
    // Card 2 — always-available thematic mission (essential, thematic vocab)
    html += '<div class="lr-mission-card theme">' +
      '<div class="lr-mission-glow">📚</div>' +
      '<div class="lr-mission-body">' +
        '<div class="lr-mission-title">' + t('learner_theme_mission') + '</div>' +
        '<div class="lr-mission-obj">' + t('learner_theme_mission_sub') + '</div>' +
        '<select class="lr-theme-select" data-theme="linking" onchange="this.setAttribute(\'data-theme\',this.value)" aria-label="' + t('learner_theme_choose') + '">' + themeOptions() + '</select>' +
        '<div class="lr-mission-len" role="group" aria-label="' + t('learner_len') + '">' +
          '<button type="button" class="len-btn active" data-len="short" onclick="Learner.setThemeLen(this)">' + t('learner_len_short') + '</button>' +
          '<button type="button" class="len-btn" data-len="medium" onclick="Learner.setThemeLen(this)">' + t('learner_len_medium') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="lr-mission-actions">' +
        '<button type="button" class="primary-btn" onclick="Learner.confirmThemeMission(this)">' + t('learner_mission_start') + '</button>' +
      '</div>' +
    '</div>';
    html += '</div>';
    // ── Recent mistakes (per language) ──
    var prefix = lang + ':';
    var mistakes = Object.keys(s.mistakes || {}).filter(function (k) { return k.indexOf(prefix) === 0; });
    if (mistakes.length) {
      html += '<div class="lr-section-head lr-sec-mt"><span class="lr-section-title">' + t('learner_mistakes') + '</span></div>' +
        '<div class="lr-mistakes"><div style="display:flex;flex-wrap:wrap;gap:8px">' +
        mistakes.map(function (key) {
          var wrd = key.slice(prefix.length);
          return '<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--panel-2);font-size:12.5px;font-weight:600;color:var(--text)">' + esc(wrd) +
            '<button type="button" onclick="Learner.clearMistake(' + jsArg(key) + ')" style="border:none;background:rgba(239,68,68,.1);color:#ef4444;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer">✕</button></span>';
        }).join('') + '</div></div>';
    }
    pane.innerHTML = html;
    i18nScope(pane);
  }

  /* ── Bundled course — not-logged-in preview only ── */
  function renderBundledPath(pane) {
    var html = '<div class="lr-preview-note">' + t('learner_login_hint') + '</div>';
    var s = load();
    COURSE.levels.forEach(function (lv) {
      html += '<div style="margin:22px 0 12px"><span style="font-size:13px;font-weight:800;color:' + lv.color + ';text-transform:uppercase;letter-spacing:.1em">' + esc(lv.icon + ' ' + lv.label) + '</span></div>';
      lv.units.forEach(function (u) {
        var done = unitLessonsDone(u);
        var total = u.lessons.length;
        var testOk = s.tests[u.id] && s.tests[u.id].passed;
        var badge = testOk ? '<span class="unit-badge done">✓ ' + t('learner_unit_passed') + '</span>'
          : (done === total ? '<span class="unit-badge">' + t('learner_unit_test') + '</span>'
            : '<span class="unit-badge">' + done + '/' + total + ' ' + t('learner_lessons_completed') + '</span>');
        html += '<div class="unit-card">' +
          '<div class="unit-head"><div class="unit-emoji" style="color:' + u.color + '">' + esc(u.icon) + '</div>' +
            '<div><h3 class="unit-title">' + esc(u.title) + '</h3><p class="unit-sub">' + esc(u.subtitle) + '</p></div>' + badge +
          '</div>' +
          '<div class="lesson-path">';
        u.lessons.forEach(function (l) {
          var isDone = !!s.lessons[u.id + ':' + l.id];
          var avail = isDone || isLessonAvailable(u, l);
          var nodeIcon = isDone ? '✓' : esc(l.icon || '●');
          html += '<div class="lesson-node-row">' +
            '<button type="button" class="lesson-node ' + (isDone ? 'done' : (avail ? 'available' : '')) + '" ' +
              (avail ? 'onclick="Learner.openLesson(\'' + u.id + '\',\'' + l.id + '\')"' : 'disabled') + '>' + nodeIcon + '</button>' +
            '<div class="lesson-label"><div class="ll-title">' + esc(l.title) + '</div><div class="ll-sub">' + esc(l.description) + '</div></div>' +
            (isDone ? '<span style="color:var(--green);font-size:12px;font-weight:800">✓</span>'
              : (avail ? '<button class="lesson-link" onclick="Learner.openLesson(\'' + u.id + '\',\'' + l.id + '\')">' + t('learner_continue') + '</button>' : '')) +
          '</div>' +
          '<div class="connector ' + (isDone ? 'done' : '') + '"></div>';
        });
        var testAvail = isTestAvailable(u);
        var testState = s.tests[u.id] && s.tests[u.id].passed ? 'done' : (testAvail ? 'available' : '');
        html += '<div class="lesson-node-row">' +
          '<button type="button" class="lesson-node test ' + testState + '" ' +
            (testAvail ? 'onclick="Learner.openTest(\'' + u.id + '\')"' : 'disabled') + '>🏆</button>' +
          '<div class="lesson-label"><div class="ll-title">' + t('learner_unit_test') + '</div>' +
            '<div class="ll-sub">' + (s.tests[u.id] && s.tests[u.id].passed
              ? ('Record: ' + s.tests[u.id].best + '/10')
              : (testAvail ? t('learner_tap_mic') : (unitLessonsDone(u) + '/' + u.lessons.length + ' ' + t('learner_lessons_completed')))) + '</div></div>' +
          (testAvail ? '<button class="lesson-link" onclick="Learner.openTest(\'' + u.id + '\')">' + (s.tests[u.id] ? t('learner_try_again') : t('learner_continue')) + '</button>' : '') +
        '</div>';
        html += '</div></div>';
      });
    });
    pane.innerHTML = html;
    i18nScope(pane);
  }

  /* ── PRACTICE ── */
  // Practice items come from the real sources of the active language when
  // logged in; falls back to bundled-course words for the logged-out preview.
  var practiceItems = null;

  function renderPractice() {
    var pane = $('#sub-learner-practice', rootEl);
    if (!pane) return;
    pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">⏳</div><div class="le-title">' + t('learner_loading') + '</div></div>';
    loadPractice(pane);
  }

  async function loadPractice(pane) {
    var authed = await srcIsAuthed();
    var raw = [];
    if (authed) {
      var lang = learnerLang();
      var banks = await srcBanks(lang);
      for (var i = 0; i < banks.length; i++) {
        var ws = await srcBankWords(banks[i].id, lang);
        raw = raw.concat(ws);
      }
      raw = raw.concat(await srcReview('due', lang));
      raw = raw.concat(await srcReview('fragile', lang));
      raw = raw.concat(await srcReview('new', lang));
      practiceItems = await toItems(raw, lang);
    } else {
      practiceItems = null;
    }
    var words = practiceItems || learnedWords();
    if (!words.length) {
      pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">📚</div><div class="le-title">' + t('learner_no_words_yet') + '</div></div>';
      return;
    }
    var langName = learnerLang() === 'it' ? t('learner_lang_it') : t('learner_lang_en');
    var speakCount = practiceItems ? Math.min(5, words.length) : Math.min(5, words.filter(function (p) { return p.en.split(' ').length >= 2; }).length);
    pane.innerHTML =
      '<div class="lr-section-head"><span class="lr-section-title">' + t('learner_practice') + ' · ' + langName + '</span>' +
        '<span class="lr-section-sub">' + words.length + ' ' + t('learner_word_count') + '</span></div>' +
      '<div class="practice-grid">' +
        '<div class="practice-card" onclick="Learner.openPractice(\'quiz\')">' +
          '<div class="pc-icon">⚡</div><div class="pc-title" data-i18n="learner_quiz">Quiz rapido</div>' +
          '<div class="pc-desc">' + t('learner_practice_quiz_desc') + '</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
        '<div class="practice-card" onclick="Learner.openPractice(\'speak\')">' +
          '<div class="pc-icon">🎙️</div><div class="pc-title" data-i18n="learner_speak_title">Pronuncia</div>' +
          '<div class="pc-desc">' + t('learner_practice_speak_desc') + ' (' + speakCount + ')</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
        '<div class="practice-card" onclick="Learner.openPractice(\'match\')">' +
          '<div class="pc-icon">🧩</div><div class="pc-title" data-i18n="learner_match_title">Abbina parole</div>' +
          '<div class="pc-desc">' + t('learner_practice_match_desc') + '</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
      '</div>';
    i18nScope(pane);
  }

  /* ── PROGRESS (fleshed-out dashboard from real data) ── */
  function renderProgress() {
    var pane = $('#sub-learner-overview', rootEl);
    if (!pane) return;
    pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">⏳</div><div class="le-title">' + t('learner_loading') + '</div></div>';
    loadProgress(pane);
  }

  // Derive review-health buckets from a full review set (client-side).
  function reviewHealth(words) {
    var now = Date.now();
    var h = { total: words.length, due: 0, fragile: 0, fresh: 0, mastered: 0, masterySum: 0, cefr: {} };
    words.forEach(function (w) {
      h.masterySum += w.mastery || 0;
      var c = String(w.cefr || '').toUpperCase();
      if (c) h.cefr[c] = (h.cefr[c] || 0) + 1;
      if (w.state === 'mastered' || (w.mastery || 0) >= 90) h.mastered++;
      else if (w.isNew) h.fresh++;
      else if ((w.lapses || 0) >= 2 || (w.mastery || 0) < 40) h.fragile++;
      else if (!w.nextReviewAt || new Date(w.nextReviewAt).getTime() <= now) h.due++;
    });
    h.avgMastery = words.length ? Math.round(h.masterySum / words.length) : 0;
    return h;
  }

  function cefrBars(h) {
    var levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    var max = 1;
    levels.forEach(function (l) { if ((h.cefr[l] || 0) > max) max = h.cefr[l] || 0; });
    return levels.map(function (l) {
      var n = h.cefr[l] || 0;
      var w = Math.round((n / max) * 100);
      return '<div class="pr-cefr-row"><span class="pr-cefr-label">' + l + '</span>' +
        '<div class="progress-track pr-cefr-track"><div class="progress-fill" style="width:' + w + '%"></div></div>' +
        '<span class="pr-cefr-num">' + n + '</span></div>';
    }).join('');
  }

  function langCard(lang, banks, h, active) {
    var flag = lang === 'en' ? '🇬🇧' : '🇮🇹';
    var name = lang === 'en' ? t('learner_lang_en') : t('learner_lang_it');
    var bankWords = banks.reduce(function (s, b) { return s + (b.wordCount || 0); }, 0);
    return '<div class="pr-lang-card' + (active ? ' active' : '') + '">' +
      '<div class="pr-lang-head"><span class="pr-lang-flag">' + flag + '</span><span class="pr-lang-name">' + name + '</span>' +
        (active ? '<span class="pr-lang-active">' + t('learner_pr_active') + '</span>' : '') + '</div>' +
      '<div class="pr-lang-stats">' +
        '<div class="pr-ls"><span class="pr-ls-v">' + banks.length + '</span><span class="pr-ls-l">' + t('learner_wordbanks') + '</span></div>' +
        '<div class="pr-ls"><span class="pr-ls-v">' + bankWords + '</span><span class="pr-ls-l">' + t('learner_word_count') + '</span></div>' +
        '<div class="pr-ls"><span class="pr-ls-v">' + h.total + '</span><span class="pr-ls-l">' + t('learner_pr_review') + '</span></div>' +
        '<div class="pr-ls"><span class="pr-ls-v">' + h.avgMastery + '%</span><span class="pr-ls-l">' + t('learner_pr_mastery') + '</span></div>' +
      '</div>' +
      // CEFR distribution for BOTH languages (English and Italiano alike)
      '<div class="pr-cefr-block"><div class="pr-cefr-title">CEFR · ' + name + '</div>' + cefrBars(h) + '</div>' +
    '</div>';
  }

  async function loadProgress(pane) {
    var s = load();
    var authed = await srcIsAuthed();
    var lang = learnerLang();
    var other = lang === 'it' ? 'en' : 'it';
    var banks = authed ? await srcBanks(lang) : [];
    var banksOther = authed ? await srcBanks(other) : [];
    var all = authed ? await srcReviewAll(lang) : [];
    var allOther = authed ? await srcReviewAll(other) : [];
    var h = reviewHealth(all), hOther = reviewHealth(allOther);

    var keys = Object.keys(s.lessons || {});
    var banksDone = keys.filter(function (k) { return k.indexOf('bank:') === 0; }).length;
    var reviewsDone = keys.filter(function (k) { return k.indexOf('review:') === 0; }).length;
    var missionsDone = keys.filter(function (k) { return k.indexOf('mission:') === 0; }).length;
    var sessionsDone = banksDone + reviewsDone + missionsDone;

    var html =
      '<div class="stats-grid">' +
        '<div class="stat-tile"><div class="st-value">' + s.xp + '</div><div class="st-label" data-i18n="learner_xp">XP</div></div>' +
        '<div class="stat-tile"><div class="st-value">🔥 ' + s.streak + '</div><div class="st-label" data-i18n="learner_streak">Serie</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + s.todayXp + ' / ' + s.dailyGoal + '</div><div class="st-label" data-i18n="learner_daily_goal">Oggi</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + sessionsDone + '</div><div class="st-label" data-i18n="learner_pr_sessions">Sessioni</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + missionsDone + '</div><div class="st-label" data-i18n="learner_pr_missions">Missioni</div></div>' +
      '</div>' +
      '<div class="lr-section-head lr-sec-mt"><span class="lr-section-title">' + t('learner_pr_languages') + '</span>' +
        '<span class="lr-section-sub">' + t('learner_pr_languages_sub') + '</span></div>' +
      '<div class="pr-lang-grid">' + langCard(lang, banks, h, true) + langCard(other, banksOther, hOther, false) + '</div>' +
      // ── Missions + Peak productivity (moved from the dashboard) ──
      '<div style="display:flex;flex-direction:column;gap:22px;margin-top:26px">' +
        '<div class="wsc-box wsc-glass wsc-wide">' +
          '<div class="wsc-box-head"><h3 class="wsc-box-title">' + t('wsc_missions_title') + '</h3><span class="wsc-box-hint">' + t('wsc_missions_hint') + '</span></div>' +
          '<div class="wsc-missions" id="wscMissions"></div>' +
        '</div>' +
        '<div class="wsc-box wsc-glass wsc-peak">' +
          '<div class="wsc-label">' + t('wsc_peak') + '</div>' +
          '<div class="wsc-peak" id="wscPeak">—</div>' +
          '<div class="wsc-peak-sub" id="wscPeakSub"></div>' +
          '<div class="wsc-heat" id="wscHeat"></div>' +
          '<div class="wsc-extra" id="wscExtra"></div>' +
        '</div>' +
      '</div>';
    pane.innerHTML = html;
    i18nScope(pane);
    // Populate the moved boxes (shared renderers live in panoramica.html)
    if (w.renderLearnerMissions) w.renderLearnerMissions();
    if (w.renderLearnerPeak) w.renderLearnerPeak();
  }

  /* ═══════════════════ LESSON / TEST / PRACTICE sessions ═══════════════════ */
  function openSession(mode, unit, lesson, steps) {
    session = { mode: mode, unit: unit || null, lesson: lesson || null, steps: steps, idx: 0, earned: 0, lang: learnerLang() };
    if (mode === 'mission' && session.unit) trackMissionForSession(0, false);
    renderOverlay();
  }

  function openLesson(unitId, lessonId) {
    var u = w.LEARNER_UNIT_BY_ID(unitId);
    var l = w.LEARNER_LESSON_BY_ID(unitId, lessonId);
    if (!u || !l) return;
    openSession('lesson', u, l, buildStepsForLesson(l));
  }

  function openTest(unitId) {
    var u = w.LEARNER_UNIT_BY_ID(unitId);
    if (!u) return;
    openSession('test', u, null, buildStepsForTest(u));
  }

  function openPractice(mode) {
    var words = practiceItems || learnedWords();
    if (!words.length) { toast(t('learner_no_words_yet')); return; }
    var steps = buildStepsForPractice(mode, words);
    if (!steps.length) { toast(t('learner_no_words_yet')); return; }
    openSession('practice' + (mode === 'speak' ? '-speak' : ''), null, null, steps);
  }

  /* ── Real-data sessions: word banks + spaced review ── */
  // Normalize raw bank/review words into lesson items {it,en,pos,cefr,lang}.
  // "it" holds the word in the target language, "en" its translation; the
  // engine + TTS/recognition follow item.lang. For the English tab the "it"
  // slot carries the English word (target) and "en" the Italian translation.
  async function toItems(rawWords, lang) {
    lang = lang || learnerLang();
    var items = [];
    for (var i = 0; i < rawWords.length; i++) {
      var rw = rawWords[i];
      var e = rw.translation ? { translation: rw.translation, definition: rw.definition } : await enrichWord(rw.word, lang);
      items.push({ it: rw.word, en: e.translation || rw.word, word: rw.word, lang: lang, pos: rw.pos || '', cefr: rw.cefr || '', definition: e.definition || rw.definition || '' });
    }
    return items;
  }

  function buildWordSteps(items, lang, pool) {
    var steps = [];
    sample(items, Math.min(6, items.length)).forEach(function (v) { steps.push({ type: 'listen', item: v }); });
    sample(items, Math.min(4, items.length)).forEach(function (v) { steps.push({ type: 'speak', item: v }); });
    var mp = sample(items, Math.min(5, items.length));
    if (mp.length >= 3) steps.push({ type: 'match', pairs: shuffle(mp.map(function (v) { return { it: v.it, en: v.en }; })) });
    var qp = sample(items, Math.min(6, items.length));
    if (qp.length) steps.push({ type: 'mc', questions: qp.map(function (v) { return { prompt: v.en, answer: v.it, options: optionsFor(v.it, pool) }; }) });
    return steps;
  }

  // Pinned/system bank display names (Allena launched from the Word-banks tab).
  var BANK_NAMES = {
    review_due_now: 'Ripasso immediato', saved_from_sessions: 'Saved From Sessions',
    fragile_words: 'Fragile Words', vocab_builder_en: 'English Vocabulary Builder',
    it_review_due: 'Ripasso immediato', it_saved_sessions: 'Salvate da sessioni',
    it_vocab_builder: 'Italian Vocabulary Builder', it_fragile: 'Parole Fragili',
    it_new_weekly: 'Nuove questa settimana'
  };
  function bankNameFor(id) { return BANK_NAMES[id] || id; }

  // Words for pinned/system banks when Allena is launched on a bank that isn't in
  // user_wordbanks. Mirrors the openWordbankView fetch logic (review-based + mapped
  // real banks). Smart/AI banks have no persistent word set → empty (toast).
  async function srcBankFallbackWords(bankId, lang) {
    var sb = srcSb(); if (!sb) return [];
    var uid = await srcUid(); if (!uid) return [];
    var out = [];
    try {
      if (bankId === 'review_due_now' || bankId === 'it_review_due' || bankId === 'fragile_words' || bankId === 'it_fragile') {
        var nowISO = new Date().toISOString();
        var q = sb.from('review_words')
          .select('lemma,pos,cefr,translation_primary,next_review_at,is_new,lapses,mastery_score,personal_frequency')
          .eq('user_id', uid).eq('lang', lang).limit(200);
        if (bankId === 'review_due_now' || bankId === 'it_review_due') q = q.or('next_review_at.lte.' + nowISO + ',is_new.eq.true');
        else q = q.or('mastery_score.lt.40,lapses.gte.2');
        var r = await q;
        out = (r.data || []).map(function (rw) {
          return { word: rw.lemma || rw.word, lang: lang, pos: rw.pos || '', cefr: rw.cefr || '', translation: rw.translation_primary || '', definition: rw.translation_primary || '', usage: rw.personal_frequency || 0 };
        });
      } else if (bankId === 'it_new_weekly') {
        var q2 = sb.from('review_words').select('lemma,pos,cefr,translation_primary').eq('user_id', uid).eq('lang', 'it').eq('is_new', true).limit(200);
        var r2 = await q2;
        out = (r2.data || []).map(function (rw) {
          return { word: rw.lemma || rw.word, lang: 'it', pos: rw.pos || '', cefr: rw.cefr || '', translation: rw.translation_primary || '', definition: rw.translation_primary || '', usage: 0 };
        });
      } else if (bankId === 'saved_from_sessions' || bankId === 'it_saved_sessions') {
        var banks = await srcBanks(lang);
        var sf = null;
        banks.forEach(function (b) { if (b.name === 'Saved from sessions') sf = b; });
        if (sf) out = await srcBankWords(sf.id, lang);
      } else if (bankId === 'vocab_builder_en') {
        var banks2 = await srcBanks('en');
        var vb = null;
        banks2.forEach(function (b) { if (b.name === 'English Vocabulary Builder') vb = b; });
        if (vb) out = await srcBankWords(vb.id, 'en');
      } else if (bankId === 'it_vocab_builder') {
        try {
          var stored = JSON.parse(localStorage.getItem('sottotitoli_wb_it_pinned') || '{"words":[]}');
          out = (stored.words || []).map(function (wd) { return { word: wd, lang: 'it', pos: '', cefr: '', usage: 1 }; });
        } catch (e) {}
      } else {
        // Smart/AI suggestion banks — words are synced to review_bank_words
        var bwRes = await sb.from('review_bank_words')
          .select('word_id, review_words(*)')
          .eq('user_id', uid).eq('bank_key', bankId).eq('status', 'active').limit(20);
        out = (bwRes.data || []).map(function (r) {
          var rw = r.review_words;
          return rw ? { word: rw.lemma || rw.word, lang: lang, pos: rw.pos || '', cefr: rw.cefr || '', translation: rw.translation_primary || '', definition: rw.translation_primary || '', usage: rw.personal_frequency || 0 } : null;
        }).filter(Boolean);
      }
    } catch (e) {}
    return out;
  }

  async function openBankTest(bankId) {
    // Allena can be launched from the Word-banks tab, so resolve the bank in either
    // learner language (the bank's lang may differ from the learner's active lang).
    var banksEn = await srcBanks('en');
    var banksIt = await srcBanks('it');
    var bank = null;
    banksEn.concat(banksIt).forEach(function (b) { if (!bank && b.id === bankId) bank = b; });
    var raw;
    if (bank) {
      raw = await srcBankWords(bankId, bank.lang);
    } else {
      var fbLang = bankId.indexOf('it_') === 0 ? 'it' : 'en';
      raw = await srcBankFallbackWords(bankId, fbLang);
      if (raw.length) bank = { id: bankId, name: bankNameFor(bankId) || bankId, lang: fbLang };
    }
    if (!bank || !raw.length) { toast(t('learner_no_words_yet')); return; }
    // Skip words already done in earlier (possibly interrupted) Allena runs.
    var bp = bankProgress();
    var entry = bp[bankId] || { total: 0, done: [] };
    var doneSet = {};
    (entry.done || []).forEach(function (w) { doneSet[w] = true; });
    var avail = raw.filter(function (rw) { return !doneSet[norm(rw.word)]; });
    var items = await toItems(sample(avail, Math.min(20, avail.length)), bank.lang);
    openSession('bank', { id: bankId, name: bank.name, lang: bank.lang }, null, []);
    session.cards = items;
    session.cardIdx = 0;
    session.graded = {}; // item.word -> SM-2 quality (1/3/4/5) for write-back
    session.bankId = bankId;
    session.lang = bank.lang; // session TTS/recognition must follow the bank's language
    session.bankTotal = raw.length;              // full bank size (progress denominator)
    session.bankPrevDone = (entry.done || []).length; // already done before this run
    if (!items.length) {
      // Every word already done → treat the bank as complete; next Allena = fresh pass.
      var bp2 = bankProgress();
      if (bp2[bankId]) { delete bp2[bankId]; saveBankProgress(bp2); }
    }
    renderOverlay(); // re-render with the card queue populated
    if (!session.cards.length) endSession();     // all-done case → completion card
  }

  /* ── Infinite card stack (bank-test "Allena" session) ──
   * Three stacked cards, front one flips (rotateY) to reveal the translation,
   * then is graded with SM-2. The stack recycles its 3 DOM cards so the
   * spring-like cascade (mid → front, back → mid, new → back) animates. */
  function cardFaceHtml(item, ci, level) {
    if (!item) {
      return '<div class="ics-face ics-front"><span class="ics-ghost-dot">·</span></div><div class="ics-face ics-back"><span class="ics-ghost-dot">·</span></div>';
    }
    var badges = '';
    if (item.pos) badges += '<span class="ics-badge">' + esc(item.pos) + '</span>';
    if (item.cefr) badges += '<span class="ics-badge ics-cefr">' + esc(item.cefr) + '</span>';
    var hint = level === 0 ? '<div class="ics-hint"><span class="flip-icon">🔄</span><span data-i18n="learner_ics_flip">Tocca per girare</span></div>' : '';
    return '<div class="ics-face ics-front">' +
        '<div class="ics-word">' + esc(item.it) + '</div>' +
        '<div class="ics-badges">' + badges + '</div>' +
        hint +
      '</div>' +
      '<div class="ics-face ics-back">' +
        '<div class="ics-back-label" data-i18n="learner_ics_answer">Traduzione</div>' +
        '<div class="ics-trans">' + esc(item.en || '') + '</div>' +
        (item.definition ? '<div class="ics-def">' + esc(item.definition) + '</div>' : '') +
        '<button type="button" class="ics-replay" data-ci="' + ci + '" onclick="event.stopPropagation();Learner.replayCard(this)">🔊 <span data-i18n="learner_ics_replay">Riascolta</span></button>' +
      '</div>';
  }

  function gradeBtnHtml(cls, q, i18nKey, label, emoji) {
    return '<button type="button" class="ics-grade ' + cls + '" data-q="' + q + '" disabled onclick="Learner.gradeCard(this)">' +
      '<span data-i18n="' + i18nKey + '">' + label + '</span><span class="gq">' + emoji + '</span></button>';
  }

  function renderCardStack() {
    if (!session) return;
    var stage = $('#learnerStage');
    if (!stage) return;
    var cards = session.cards || [];
    var idx = session.cardIdx || 0;
    var total = cards.length;
    var bankName = session.unit ? session.unit.name : (session.bankId || t('learner_wordbanks'));
    var html = '<div class="ics-wrap">' +
      '<div class="ics-meta">' +
        '<div class="ics-meta-left">' +
          '<span class="ics-kicker">' + t('learner_ics_session') + '</span>' +
          '<span class="ics-bankname">' + esc(bankName) + '</span>' +
        '</div>' +
        '<div class="ics-meta-right">' +
          '<span class="ics-chip ics-pos" id="icsPos">' + (idx + 1) + ' / ' + total + '</span>' +
          '<span class="ics-chip ics-xp" id="icsXp">⭐ 0</span>' +
        '</div>' +
      '</div>' +
      '<div class="ics-stage" id="icsStage">';
    for (var i = 0; i < 3; i++) {
      var ci = idx + i;
      var item = cards[ci];
      var cls = 'ics-card' + (item ? '' : ' ghost');
      html += '<div class="' + cls + '" data-level="' + i + '" data-ci="' + ci + '" onclick="Learner.flipCard(this)">' +
        '<div class="ics-inner">' + cardFaceHtml(item, ci, i) + '</div></div>';
    }
    html += '</div>' +
      '<div class="ics-foot">' +
        '<span class="ics-remaining" id="icsRemaining"></span>' +
      '</div>' +
      '<div class="ics-grade-label">' + t('learner_ics_grade_label') + '</div>' +
      '<div class="ics-grades" id="icsGrades">' +
        gradeBtnHtml('again', 1, 'learner_grade_again', 'Ancora', '😵') +
        gradeBtnHtml('hard', 3, 'learner_grade_hard', 'Difficile', '😬') +
        gradeBtnHtml('good', 4, 'learner_grade_good', 'Buono', '🙂') +
        gradeBtnHtml('easy', 5, 'learner_grade_easy', 'Facile', '😎') +
      '</div></div>';
    stage.innerHTML = html;
    i18nScope(stage);
    updateIcsRemaining();
    var front = cards[idx];
    if (front) setTimeout(function () { speak(front.it); }, 350);
  }

  function updateIcsRemaining() {
    if (!session || !session.cards) return;
    var el = $('#icsRemaining');
    if (!el) return;
    var left = Math.max(0, (session.cards.length - session.cardIdx));
    el.textContent = left + ' ' + t('learner_ics_remaining');
    var posEl = $('#icsPos');
    if (posEl) posEl.textContent = Math.min(session.cardIdx + 1, session.cards.length) + ' / ' + session.cards.length;
    var xpEl = $('#icsXp');
    if (xpEl) xpEl.textContent = '⭐ ' + (session.earned || 0);
  }

  /* ── Per-bank Allena session progress (persisted) ──
   * Each word graded in a bank's "Allena" run is recorded under the bank id,
   * so if the user leaves mid-run (back button or tab switch) the bank card
   * can show "done / total" and a resume re-opens only the not-yet-done words.
   * A fully completed run clears the entry so the next Allena is a fresh pass. */
  var BANKPROG_KEY = 'sottotitoli-learner-bank-progress';
  function bankProgress() {
    try { return JSON.parse(localStorage.getItem(BANKPROG_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveBankProgress(bp) { try { localStorage.setItem(BANKPROG_KEY, JSON.stringify(bp)); } catch (e) {} }
  // Record one word as "done" for the active bank run.
  function markBankWordDone(word) {
    if (!session || !session.bankId) return;
    var bp = bankProgress();
    var entry = bp[session.bankId] || { total: session.bankTotal || 0, done: [], updatedAt: null };
    var n = norm(word);
    if (entry.done.indexOf(n) === -1) entry.done.push(n);
    entry.updatedAt = new Date().toISOString();
    bp[session.bankId] = entry;
    saveBankProgress(bp);
    updateIcsSessionProgress();
  }
  // Update the in-panel session top bar: (prev done + this run) / bank total.
  function updateIcsSessionProgress() {
    if (!session) return;
    var el = $('#icsSessionProgress');
    if (!el) return;
    var done = (session.bankPrevDone || 0) + (session.cardIdx || 0);
    var total = session.bankTotal || (session.cards ? session.cards.length : 0);
    el.textContent = done + ' / ' + total;
  }

  function flipCard(el) {
    if (!session || !el) return;
    if (el.getAttribute('data-level') !== '0') return;
    if (el.classList.contains('exiting')) return;
    // Toggle so a second tap flips the card back to the word.
    el.classList.toggle('flip');
    var stage = $('#learnerStage');
    if (stage) $all('.ics-grade', stage).forEach(function (b) { b.disabled = false; });
  }

  function replayCard(btn) {
    if (!session || !btn) return;
    var card = btn.closest ? btn.closest('.ics-card') : null;
    var ci = card ? parseInt(card.getAttribute('data-ci'), 10) : session.cardIdx;
    var item = session.cards[ci];
    if (item) speak(item.it);
  }

  function icsCard(stage, level) {
    var el = null;
    $all('.ics-card', stage).forEach(function (c) { if (c.getAttribute('data-level') === String(level)) el = c; });
    return el;
  }

  function gradeCard(btn) {
    if (!session || !btn || btn.disabled) return;
    var q = parseInt(btn.getAttribute('data-q'), 10) || 4;
    var stage = $('#learnerStage');
    var frontEl = stage ? icsCard(stage, 0) : null;
    if (!frontEl) return;
    var ci = parseInt(frontEl.getAttribute('data-ci'), 10);
    var item = session.cards[ci];
    if (!item) return;
    if (!frontEl.classList.contains('flip')) frontEl.classList.add('flip');
    // Record grade + XP / mistake
    session.graded[item.word] = q;
    if (q >= 3) { session.earned += 1; addXp(1); } else { recordMistake(item.word, session.lang); }
    writeGrade(item, q); // fire-and-forget SM-2 write-back to review_words
    $all('.ics-grade', stage).forEach(function (b) { b.disabled = true; });
    // Fly the front card off, then cascade the stack
    frontEl.classList.add('exiting');
    setTimeout(advanceStack, 600);
  }

  function advanceStack() {
    if (!session) return;
    var stage = $('#learnerStage');
    if (!stage) return;
    var frontEl = icsCard(stage, 0), midEl = icsCard(stage, 1), backEl = icsCard(stage, 2);
    if (!frontEl || !midEl || !backEl) { // safety fallback: full re-render
      session.cardIdx += 1;
      if (session.cardIdx >= session.cards.length) { endSession(); return; }
      renderCardStack();
      return;
    }
    var ci = session.cardIdx;
    var nextBackIdx = ci + 3;
    var nextItem = session.cards[nextBackIdx];
    // A: old front → recycled as the new back card (new content, snaps in)
    frontEl.classList.add('no-anim');
    frontEl.classList.remove('exiting', 'flip');
    frontEl.setAttribute('data-level', '2');
    frontEl.setAttribute('data-ci', String(nextBackIdx));
    frontEl.querySelector('.ics-inner').innerHTML = cardFaceHtml(nextItem, nextBackIdx, 2);
    frontEl.classList.add('entering');
    void frontEl.offsetWidth; // reflow → settle transition
    frontEl.classList.remove('no-anim', 'entering');
    // B: old mid → new front, C: old back → new mid (cascade via data-level)
    midEl.setAttribute('data-level', '0');
    midEl.classList.remove('flip');
    backEl.setAttribute('data-level', '1');
    session.cardIdx = ci + 1;
    if (session.cardIdx >= session.cards.length) { endSession(); return; }
    updateIcsRemaining();
    var newFront = session.cards[session.cardIdx];
    if (newFront) setTimeout(function () { speak(newFront.it); }, 320);
  }

  /* ── SM-2 (Anki-style) scheduling ──
   * quality: 1=Again 3=Hard 4=Good 5=Easy. Returns the next SRS state. */
  function sm2(q, prev) {
    prev = prev || {};
    var ease = (typeof prev.ease === 'number' && prev.ease) ? prev.ease : 2.5;
    var interval = prev.interval || 0;
    var reps = prev.reps || 0;
    var lapses = prev.lapses || 0;
    var mastery = (typeof prev.mastery === 'number') ? prev.mastery : 0;
    var newReps, newInterval, newEase, newLapses, newMastery, state;
    if (q <= 1) {
      newReps = 0; newInterval = 0; newLapses = lapses + 1;
      newEase = Math.max(1.3, +(ease - 0.2).toFixed(2));
      newMastery = Math.max(0, mastery - 20);
      state = 'relearning';
    } else if (q === 3) {
      newReps = reps + 1; newInterval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      newEase = Math.max(1.3, +(ease - 0.15).toFixed(2));
      newMastery = Math.min(100, mastery + 8);
      state = 'learning';
    } else if (q === 4) {
      newReps = reps + 1; newInterval = reps === 0 ? 1 : (reps === 1 ? 6 : Math.round(interval * ease));
      newEase = ease;
      newMastery = Math.min(100, mastery + 12);
      state = 'review';
    } else {
      newReps = reps + 1; newInterval = reps === 0 ? 4 : (reps === 1 ? 10 : Math.round(interval * ease * 1.3));
      newEase = +(ease + 0.15).toFixed(2);
      newMastery = Math.min(100, mastery + 16);
      state = 'review';
    }
    newLapses = lapses;
    if (newReps >= 5 && q >= 4) state = 'mastered';
    return {
      interval: newInterval, ease: newEase, reps: newReps, lapses: newLapses,
      mastery: newMastery, reviewState: state,
      nextAt: new Date(Date.now() + newInterval * 86400000).toISOString()
    };
  }

  // SM-2 write-back to review_words (direct update/insert, mirrors vtMarkFatto).
  async function writeGrade(item, q) {
    var sb = srcSb(); if (!sb) return;
    var uid = await srcUid(); if (!uid) return;
    var lang = session ? session.lang : learnerLang();
    var lemma = item.word;
    var normalized = norm(lemma);
    try {
      var r = await sb.from('review_words')
        .select('id,interval_days,ease_factor,reps,lapses,mastery_score')
        .eq('user_id', uid).eq('lang', lang).eq('normalized', normalized).limit(1);
      var row = (r.data && r.data[0]) ? r.data[0] : null;
      var prev = row ? {
        interval: row.interval_days || 0, ease: row.ease_factor || 2.5,
        reps: row.reps || 0, lapses: row.lapses || 0, mastery: row.mastery_score || 0
      } : {};
      var s = sm2(q, prev);
      var nowISO = new Date().toISOString();
      var result = q <= 1 ? 'again' : (q === 3 ? 'hard' : (q === 4 ? 'good' : 'easy'));
      if (row) {
        await sb.from('review_words').update({
          review_state: s.reviewState, interval_days: s.interval, ease_factor: s.ease,
          reps: s.reps, lapses: s.lapses, mastery_score: s.mastery,
          last_result: result, last_reviewed_at: nowISO, next_review_at: s.nextAt, is_new: false
        }).eq('id', row.id);
      } else {
        await sb.from('review_words').insert({
          user_id: uid, lemma: lemma, normalized: normalized,
          translation_primary: item.en || '', translation_variants: item.en ? [item.en] : [],
          accepted_answers: [], pos: item.pos || null, cefr: item.cefr || null, lang: lang,
          is_new: false, review_state: s.reviewState, interval_days: s.interval, ease_factor: s.ease,
          reps: s.reps, lapses: s.lapses, mastery_score: s.mastery, last_result: result,
          last_reviewed_at: nowISO, next_review_at: s.nextAt, personal_frequency: 1
        });
      }
    } catch (e) { if (w.console) w.console.warn('writeGrade:', e); }
  }

  async function openReview(kind, lang) {
    lang = lang || learnerLang();
    var raw = await srcReview(kind, lang);
    if (!raw.length) { toast(t('learner_no_words_yet')); return; }
    var pool = await realPool(lang);
    var items = await toItems(sample(raw, Math.min(12, raw.length)), lang);
    var steps = buildWordSteps(items, lang, pool);
    if (!steps.length) { toast(t('learner_no_words_yet')); return; }
    var name = kind === 'due' ? t('learner_review_due') : (kind === 'fragile' ? t('learner_review_fragile') : t('learner_review_new'));
    openSession('review', { id: kind, name: name, lang: lang }, null, steps);
  }

  /* ── Mission sessions (objectives-driven AI lesson) ── */
  function missionItems(lesson, lang) {
    lang = lang || learnerLang();
    var c = (lesson && lesson.content) || lesson || {};
    var words = Array.isArray(c.words) ? c.words : [];
    return words.map(function (wd) {
      return { it: wd.word || wd.it, en: wd.translation || wd.en || '', word: wd.word || wd.it, lang: lang, pos: wd.pos || '', cefr: wd.cefr || '', definition: wd.example_word || wd.example_it || wd.example_translation || wd.example_en || '' };
    });
  }

  function missionSteps(lesson, pool, lang) {
    lang = lang || learnerLang();
    var c = (lesson && lesson.content) || lesson || {};
    var words = missionItems(lesson, lang);
    var convo = Array.isArray(c.convo) ? c.convo : [];
    var steps = [];
    sample(words, Math.min(5, words.length)).forEach(function (v) { steps.push({ type: 'listen', item: v }); });
    sample(words, Math.min(3, words.length)).forEach(function (v) { steps.push({ type: 'speak', item: v }); });
    var mp = sample(words, Math.min(5, words.length));
    if (mp.length >= 3) steps.push({ type: 'match', pairs: shuffle(mp.map(function (v) { return { it: v.it, en: v.en }; })) });
    var qp = sample(words, Math.min(5, words.length));
    if (qp.length) steps.push({ type: 'mc', questions: qp.map(function (v) { return { prompt: v.en, answer: v.it, options: optionsFor(v.it, pool) }; }) });
    if (convo.length >= 2) {
      steps.push({ type: 'convo', convo: { title: c.subtitle || c.title || 'Conversazione', speakers: convo.map(function (ln) {
        var role = ln.role === 'learner' ? 'Tu' : (ln.role === 'native' ? 'A' : (ln.role || 'A'));
        return { role: role, text: ln.text, translation: ln.translation || '' };
      }) } });
    }
    return steps;
  }

  /* ── Mission session persistence (save on exit → resume on return) ── */
  var MISSION_PROG_KEY = 'sottotitoli-learner-mission-progress';
  function missionProg() { try { return JSON.parse(localStorage.getItem(MISSION_PROG_KEY) || 'null'); } catch (e) { return null; } }
  function saveMissionProg(p) { try { localStorage.setItem(MISSION_PROG_KEY, JSON.stringify(p)); } catch (e) {} }
  function clearMissionProg() { try { localStorage.removeItem(MISSION_PROG_KEY); } catch (e) {} }

  /* ── Mission progress per (language, type) — feeds the dashboard CEFR/mission box ──
   * Keys are '<lang>:ai' (mission 1, goals-driven AI lesson) and '<lang>:theme'
   * (mission 2, essential thematic vocab). Persisted so the dashboard can show
   * started / in-progress % / completed for each mission in each language. */
  var LEARNER_MISSIONS_KEY = 'sottotitoli-learner-missions';
  function learnerMissionsState() { try { return JSON.parse(localStorage.getItem(LEARNER_MISSIONS_KEY) || '{}'); } catch (e) { return {}; } }
  function saveLearnerMissionsState(s) { try { localStorage.setItem(LEARNER_MISSIONS_KEY, JSON.stringify(s)); } catch (e) {} }
  function missionTypeOf(id) { return String(id || '').indexOf('theme:') === 0 ? 'theme' : 'ai'; }
  function trackMission(lang, type, pct, done, title, desc) {
    if (!lang || !type) return;
    var s = learnerMissionsState();
    var prev = s[lang + ':' + type] || {};
    s[lang + ':' + type] = { pct: Math.max(0, Math.min(100, Math.round(pct))), done: !!done, started: true, title: title || prev.title || '', desc: desc || prev.desc || '', updatedAt: new Date().toISOString() };
    saveLearnerMissionsState(s);
  }
  function trackMissionForSession(pct, done) {
    if (!session || session.mode !== 'mission') return;
    var unit = session.unit || {};
    var title = unit.name || '';
    var desc = '';
    if (missionTypeOf(unit.id) === 'theme') {
      var tk = String(unit.id).replace('theme:', '');
      if (THEME_LESSONS[tk]) desc = THEME_LESSONS[tk].desc;
    } else {
      var lesson = missionCached();
      if (lesson) desc = lesson.subtitle || lesson.objective || '';
    }
    trackMission(session.lang, missionTypeOf(unit.id), pct, done, title, desc);
  }
  function resumeMissionSession(saved) {
    if (!saved || saved.mode !== 'mission' || !saved.steps || !saved.steps.length) return false;
    if (saved.idx >= saved.steps.length) { clearMissionProg(); return false; }
    openSession('mission', saved.unit, null, saved.steps);
    session.idx = saved.idx || 0;
    session.earned = saved.earned || 0;
    trackMissionForSession((session.idx / session.steps.length) * 100, false);
    renderOverlay();
    return true;
  }
  async function openMission(focus) {
    var lang = learnerLang();
    var saved = missionProg();
    if (saved && resumeMissionSession(saved)) return;
    var lesson = missionCached();
    if (!lesson) lesson = await generateMission(focus, lang);
    if (!lesson) { toast(t('learner_mission_error')); return; }
    var pool = await realPool(lang);
    var steps = missionSteps(lesson, pool, lang);
    if (!steps.length) { toast(t('learner_mission_error')); return; }
    openSession('mission', { id: lesson.id || 'mission', name: lesson.title || 'Missione', lang: lang }, null, steps);
  }

  async function newMission(focus) {
    if (regenRemaining() <= 0) { toast(t('learner_regen_limit')); return; }
    regenIncrement();
    var lang = learnerLang();
    missionClear();
    var lesson = await generateMission(focus, lang);
    if (!lesson) { toast(t('learner_mission_error')); return; }
    var pool = await realPool(lang);
    var steps = missionSteps(lesson, pool, lang);
    if (!steps.length) { toast(t('learner_mission_error')); return; }
    openSession('mission', { id: lesson.id || 'mission', name: lesson.title || 'Missione', lang: lang }, null, steps);
  }

  /* ── Thematic mission (always available, essential vocabulary) ──
   * Complements the goals-driven AI mission with fixed themes every learner
   * needs: linking words, essential verbs, modals, time, prepositions. The
   * pairs are stored EN↔IT and oriented by the active learner language. */
  var THEME_LESSONS = {
    linking: { icon: '🔗', title: 'Connettivi', desc: 'Parole per collegare le idee', pairs: [
      { en: 'however', it: 'tuttavia' }, { en: 'therefore', it: 'perciò' }, { en: 'moreover', it: 'inoltre' },
      { en: 'because', it: 'perché' }, { en: 'although', it: 'sebbene' }, { en: 'instead', it: 'invece' },
      { en: 'finally', it: 'infine' }, { en: 'meanwhile', it: 'nel frattempo' }, { en: 'otherwise', it: 'altrimenti' }, { en: 'besides', it: 'oltre a ciò' }
    ] },
    verbs: { icon: '⚡', title: 'Verbi essenziali', desc: 'I verbi più usati nella vita quotidiana', pairs: [
      { en: 'to be', it: 'essere' }, { en: 'to have', it: 'avere' }, { en: 'to do', it: 'fare' },
      { en: 'to go', it: 'andare' }, { en: 'to come', it: 'venire' }, { en: 'to see', it: 'vedere' },
      { en: 'to know', it: 'sapere' }, { en: 'to think', it: 'pensare' }, { en: 'to say', it: 'dire' }, { en: 'to want', it: 'volere' }
    ] },
    modals: { icon: '🎯', title: 'Verbi modali', desc: 'Possibilità, obblighi e permessi', pairs: [
      { en: 'can', it: 'posso' }, { en: 'must', it: 'devo' }, { en: 'should', it: 'dovrei' },
      { en: 'may', it: 'posso (permesso)' }, { en: 'might', it: 'potrei' }, { en: 'could', it: 'potrei (cond.)' },
      { en: 'would', it: 'vorrei' }, { en: 'need to', it: 'devo (bisogno di)' }, { en: 'have to', it: 'sono costretto a' }, { en: 'be able to', it: 'riesco a' }
    ] },
    time: { icon: '🕐', title: 'Parole di tempo', desc: 'Quando succede qualcosa', pairs: [
      { en: 'today', it: 'oggi' }, { en: 'tomorrow', it: 'domani' }, { en: 'yesterday', it: 'ieri' },
      { en: 'now', it: 'adesso' }, { en: 'later', it: 'più tardi' }, { en: 'early', it: 'presto' },
      { en: 'late', it: 'tardi' }, { en: 'always', it: 'sempre' }, { en: 'never', it: 'mai' }, { en: 'sometimes', it: 'a volte' }
    ] },
    prepositions: { icon: '📍', title: 'Preposizioni', desc: 'Dove e a chi', pairs: [
      { en: 'in', it: 'in' }, { en: 'on', it: 'su' }, { en: 'at', it: 'a' },
      { en: 'with', it: 'con' }, { en: 'without', it: 'senza' }, { en: 'from', it: 'da' },
      { en: 'for', it: 'per' }, { en: 'under', it: 'sotto' }, { en: 'over', it: 'sopra' }, { en: 'between', it: 'tra' }
    ] }
  };
  function themeOptions() {
    return Object.keys(THEME_LESSONS).map(function (k) {
      return '<option value="' + k + '">' + esc(THEME_LESSONS[k].title) + '</option>';
    }).join('');
  }
  function themeItems(theme, lang) {
    return theme.pairs.map(function (p) {
      var t = lang === 'it' ? p.it : p.en;
      var x = lang === 'it' ? p.en : p.it;
      return { it: t, en: x, word: t, lang: lang, pos: '', cefr: '', definition: '' };
    });
  }
  function buildThemeSteps(items, lang, len) {
    var steps = [];
    var medium = len === 'medium';
    sample(items, Math.min(medium ? 5 : 3, items.length)).forEach(function (v) { steps.push({ type: 'listen', item: v }); });
    sample(items, Math.min(medium ? 3 : 2, items.length)).forEach(function (v) { steps.push({ type: 'speak', item: v }); });
    var mp = sample(items, Math.min(medium ? 5 : 3, items.length));
    if (mp.length >= 3) steps.push({ type: 'match', pairs: shuffle(mp.map(function (v) { return { it: v.it, en: v.en }; })) });
    var qp = sample(items, Math.min(medium ? 5 : 3, items.length));
    if (qp.length) steps.push({ type: 'mc', questions: qp.map(function (v) { return { prompt: v.en, answer: v.it, options: optionsFor(v.it) }; }) });
    return steps;
  }
  function openThemeMission(themeKey, len) {
    var lang = learnerLang();
    var theme = THEME_LESSONS[themeKey];
    if (!theme) return;
    var sessionId = 'theme:' + themeKey;
    var saved = missionProg();
    if (saved && saved.unit && saved.unit.id === sessionId && resumeMissionSession(saved)) return;
    var items = themeItems(theme, lang);
    if (!items.length) { toast(t('learner_no_words_yet')); return; }
    var steps = buildThemeSteps(items, lang, len);
    if (!steps.length) { toast(t('learner_no_words_yet')); return; }
    openSession('mission', { id: sessionId, name: theme.title, lang: lang }, null, steps);
  }
  function setThemeLen(btn) {
    var wrap = btn.parentElement;
    if (!wrap) return;
    Array.prototype.forEach.call(wrap.children, function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  /* ── Start confirmations: every Allena/mission launch asks first, and a busy
     guard prevents double-starts while the session is still loading. ── */
  var _learnerStartBusy = false;
  function runGuarded(fn, loadingMsg) {
    if (_learnerStartBusy) return;
    _learnerStartBusy = true;
    if (loadingMsg) toast(loadingMsg);
    var done = function () { _learnerStartBusy = false; };
    try {
      var r = fn();
      if (r && typeof r.then === 'function') r.then(done, done);
      else done();
    } catch (e) { done(); }
  }
  function confirmReview(kind, count) {
    var lang = learnerLang();
    var title = kind === 'due' ? t('learner_review_due') : (kind === 'fragile' ? t('learner_review_fragile') : t('learner_review_new'));
    var icon = kind === 'due' ? '⏰' : (kind === 'fragile' ? '🧩' : '✨');
    var msg = t('learner_confirm_review').replace('{name}', title) + (count != null ? ' (' + count + ')' : '');
    appConfirm(msg, function () { runGuarded(function () { return openReview(kind, lang); }, t('learner_loading')); }, t('learner_confirm_title'), icon);
  }
  function confirmMission() {
    var mission = missionCached();
    var msg = mission
      ? t('learner_confirm_mission_start').replace('{name}', mission.title || '')
      : t('learner_confirm_mission_generate');
    appConfirm(msg, function () { runGuarded(function () { return openMission(); }, t('learner_loading')); }, t('learner_confirm_title'), '🎯');
  }
  function confirmNewMission() {
    if (regenRemaining() <= 0) { appAlert(t('learner_regen_limit'), t('learner_confirm_title'), '↻'); return; }
    appConfirm(t('learner_confirm_mission_new'), function () { runGuarded(function () { return newMission(); }, t('learner_loading')); }, t('learner_confirm_title'), '↻');
  }
  function confirmThemeMission(btn) {
    var card = btn && btn.closest ? btn.closest('.lr-mission-card') : null;
    var s = card ? card.querySelector('.lr-theme-select') : null;
    var l = card ? card.querySelector('.len-btn.active') : null;
    var theme = s ? (s.getAttribute('data-theme') || s.value || 'linking') : 'linking';
    var len = l ? l.getAttribute('data-len') : 'short';
    var themeTitle = (THEME_LESSONS[theme] && THEME_LESSONS[theme].title) || theme;
    var msg = t('learner_confirm_theme').replace('{name}', themeTitle) + (len === 'medium' ? ' · ' + t('learner_len_medium') : '');
    appConfirm(msg, function () { runGuarded(function () { return openThemeMission(theme, len); }, t('learner_loading')); }, t('learner_confirm_title'), '📚');
  }

  /* ── Daily regenerate quota (↻ button): max 3 AI mission regenerations/day ── */
  var REGEN_KEY = 'sottotitoli-learner-regens';
  var REGEN_DAILY_MAX = 3;
  function regenState() {
    var today = new Date().toDateString();
    var s = {}; try { s = JSON.parse(localStorage.getItem(REGEN_KEY) || '{}'); } catch (e) {}
    if (!s || s.day !== today) s = { day: today, n: 0 };
    return s;
  }
  function regenRemaining() { return Math.max(0, REGEN_DAILY_MAX - regenState().n); }
  function regenUsed() { return regenState().n; }
  function regenIncrement() { var s = regenState(); s.n += 1; try { localStorage.setItem(REGEN_KEY, JSON.stringify(s)); } catch (e) {} }

  function renderOverlay() {
    if (!session) return;
    var isBank = session.mode === 'bank';
    var step = session.steps[session.idx];
    var total = isBank ? (session.cards ? session.cards.length : 0) : (session.steps ? session.steps.length : 0);
    var cur = isBank ? (session.cardIdx || 0) : session.idx;
    var pct = total ? Math.round((cur / total) * 100) : 0;
    var title = session.mode === 'lesson' ? (session.lesson ? session.lesson.title : '') :
      session.mode === 'test' ? t('learner_unit_test') :
      session.mode === 'mission' ? (session.unit ? session.unit.name : t('learner_mission')) :
      session.mode === 'bank' ? (session.unit ? session.unit.name : t('learner_wordbanks')) :
      t('learner_practice');

    // Remove any previous overlay
    var old = $('#learnerOverlay');
    if (old) old.remove();

    var ov = document.createElement('div');
    ov.id = 'learnerOverlay';
    ov.className = 'lesson-overlay';
    ov.innerHTML =
      '<div class="lesson-topbar">' +
        '<button type="button" class="lt-close" onclick="Learner.closeSession()" title="' + t('learner_close') + '">✕</button>' +
        '<div class="lt-title">' + esc(title) + '</div>' +
        '<div class="lt-progress"><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' +
      '</div>' +
      '<div class="lesson-stage" id="learnerStage"></div>';
    rootEl.appendChild(ov);
    renderStep();
  }

  function renderStep() {
    if (!session) return;
    var stage = $('#learnerStage');
    if (!stage) return;
    if (session.mode === 'bank') { renderCardStack(); return; }
    var step = session.steps[session.idx];
    session.matchState = null; session.mcIndex = 0;
    var html = '';

    if (step.type === 'listen') {
      html = '<div class="step-kicker" data-i18n="learner_listen">Ascolta</div>' +
        '<div class="step-prompt">' + esc(step.item.it) + '</div>' +
        '<div class="step-sub">' + esc(step.item.en) + '</div>' +
        (step.item.exampleIt ? '<div class="step-example"><b>' + esc(step.item.it) + '</b> — ' + esc(step.item.exampleIt) + '<br><span>' + esc(step.item.exampleEn || '') + '</span></div>' : '') +
        '<div class="btn-row"><button class="ghost-btn" onclick="Learner.listenAgain()" data-i18n="learner_listen_again">Riascolta</button>' +
        '<button class="primary-btn" onclick="Learner.nextStep()" data-i18n="learner_next">Avanti</button></div>';
      setTimeout(function () { speak(step.item.it); }, 250);
    } else if (step.type === 'speak') {
      html = '<div class="step-kicker" data-i18n="learner_speak">Parla</div>' +
        '<div class="step-prompt small">' + esc(step.item.en) + '</div>' +
        '<div class="step-sub">' + esc(t(session.lang === 'it' ? 'learner_tap_mic' : 'learner_tap_mic_en')) + '</div>' +
        '<button type="button" class="mic-btn" id="learnerMic" onclick="Learner.startListen()">🎙️</button>' +
        '<div class="heard-text" id="learnerHeard"></div>' +
        '<div class="btn-row"><button class="ghost-btn" onclick="Learner.listenAgain()" data-i18n="learner_listen_again">Riascolta</button>' +
        '<button class="primary-btn" id="learnerCheck" disabled onclick="Learner.checkSpeak()" data-i18n="learner_check">Controlla</button></div>';
      setTimeout(function () { speak(step.item.it); }, 250);
    } else if (step.type === 'match') {
      var pairs = step.pairs;
      var itCol = shuffle(pairs).map(function (p) { return p.it; });
      var enCol = shuffle(pairs).map(function (p) { return p.en; });
      session.matchState = { pairs: pairs.slice(), itCol: itCol, enCol: enCol, matched: {}, selIt: null, selEn: null };
      html = '<div class="step-kicker" data-i18n="learner_match">Abbina</div>' +
        '<div class="step-sub">' + esc(t(session.lang === 'it' ? 'learner_match_desc' : 'learner_match_desc_en')) + '</div>' +
        '<div class="match-wrap"><div class="match-col">' +
          itCol.map(function (it, i) { return '<button type="button" class="match-chip it" data-i="' + i + '" onclick="Learner.matchTap(this)">' + esc(it) + '</button>'; }).join('') +
        '</div><div class="match-col">' +
          enCol.map(function (en, i) { return '<button type="button" class="match-chip en" data-i="' + i + '" onclick="Learner.matchTap(this)">' + esc(en) + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="btn-row"><button class="primary-btn" onclick="Learner.nextStep()" data-i18n="learner_next">Avanti</button></div>';
    } else if (step.type === 'mc') {
      session.mcIndex = 0;
      html = '<div class="step-kicker" data-i18n="learner_quiz">Quiz</div>' +
        '<div id="mcBox"></div>';
      stage.innerHTML = html;
      renderMc();
      i18nScope(stage);
      return;
    } else if (step.type === 'convo') {
      var lines = step.convo.speakers || [];
      html = '<div class="step-kicker" data-i18n="learner_conversation">Conversazione</div>' +
        '<div class="step-sub">' + esc(step.convo.title) + '</div>' +
        '<div class="convo-list">' +
          lines.map(function (sp) {
            return '<div class="convo-line"><span class="speaker">' + esc(sp.role) + '</span>' +
              '<div class="cl-body"><div class="cl-it" onclick="Learner.speakText(' + jsArg(sp.text) + ')">' + esc(sp.text) + '</div>' +
              '<div class="cl-en">' + esc(sp.translation) + '</div></div></div>';
          }).join('') +
        '</div>' +
        '<div class="btn-row"><button class="ghost-btn" onclick="Learner.speakAll()" data-i18n="learner_listen_all">Ascolta tutto</button>' +
        '<button class="primary-btn" onclick="Learner.nextStep()" data-i18n="learner_next">Avanti</button></div>';
    }

    stage.innerHTML = html;
    i18nScope(stage);
  }

  function renderMc() {
    if (!session) return;
    var step = session.steps[session.idx];
    if (!step || step.type !== 'mc') return;
    var box = $('#mcBox', rootEl);
    if (!box) return;
    var q = step.questions[session.mcIndex];
    if (!q) { nextStep(); return; }
    box.innerHTML =
      '<div class="step-kicker" data-i18n="learner_quiz">Quiz</div>' +
      '<div class="step-prompt small">' + esc(q.prompt) + '</div>' +
      '<div class="choices">' +
        q.options.map(function (opt) {
          return '<button type="button" class="choice" onclick="Learner.answerMc(this,' + jsArg(opt) + ')">' + esc(opt) + '</button>';
        }).join('') +
      '</div>';
    i18nScope(box);
  }

  function answerMc(btn, opt) {
    if (!session) return;
    var step = session.steps[session.idx];
    var q = step.questions[session.mcIndex];
    var correct = opt === q.answer;
    $all('.choice', btn.parentElement).forEach(function (c) { c.disabled = true; });
    btn.classList.add(correct ? 'correct' : 'incorrect');
    if (correct) {
      session.earned += 1; addXp(1);
      if (session.mode === 'lesson') { /* fine */ }
    } else {
      recordMistake(q.answer, session.lang);
      // highlight correct
      $all('.choice', btn.parentElement).forEach(function (c) {
        if (c.textContent === q.answer) c.classList.add('correct');
      });
    }
    // feedback line
    var fb = document.createElement('div');
    fb.className = 'feedback ' + (correct ? 'correct' : 'incorrect');
    fb.innerHTML = (correct ? '✅ ' : '❌ ') + t(correct ? 'learner_correct' : 'learner_incorrect') + (correct ? '' : ' — ' + esc(q.answer));
    btn.parentElement.parentElement.appendChild(fb);
    session.mcIndex += 1;
    setTimeout(function () {
      if (session && session.mcIndex < step.questions.length) renderMc();
      else if (session) nextStep();
    }, correct ? 750 : 1300);
  }

  function matchTap(btn) {
    if (!session) return;
    var st = session.matchState;
    if (!st) return;
    if (btn.classList.contains('matched')) return;
    var side = btn.classList.contains('it') ? 'it' : 'en';
    // toggle selection
    if (side === 'it') {
      if (st.selIt === btn) { btn.classList.remove('selected'); st.selIt = null; return; }
      if (st.selIt) st.selIt.classList.remove('selected');
      st.selIt = btn; btn.classList.add('selected');
    } else {
      if (st.selEn === btn) { btn.classList.remove('selected'); st.selEn = null; return; }
      if (st.selEn) st.selEn.classList.remove('selected');
      st.selEn = btn; btn.classList.add('selected');
    }
    if (st.selIt && st.selEn) {
      var it = st.selIt.textContent, en = st.selEn.textContent;
      var hit = st.pairs.some(function (p) { return p.it === it && p.en === en; });
      if (hit) {
        st.selIt.classList.remove('selected'); st.selIt.classList.add('matched');
        st.selEn.classList.remove('selected'); st.selEn.classList.add('matched');
        st.matched[it] = true;
        session.earned += 1; addXp(1);
        st.selIt = null; st.selEn = null;
        if (Object.keys(st.matched).length === st.pairs.length) toast(t('learner_all_matched'));
      } else {
        var badIt = st.selIt, badEn = st.selEn;
        badIt.classList.remove('selected'); badEn.classList.remove('selected');
        badIt.classList.add('incorrect'); badEn.classList.add('incorrect');
        st.selIt = null; st.selEn = null;
        setTimeout(function () { badIt.classList.remove('incorrect'); badEn.classList.remove('incorrect'); }, 420);
      }
    }
  }

  /* ── Speech handling ── */
  var listening = false;
  var heardText = '';
  function startListen() {
    if (listening) { stopListen(); return; }
    if (!hasRecognition()) { toast(t('learner_no_mic')); return; }
    var mic = $('#learnerMic');
    if (mic) mic.classList.add('listening');
    heardText = '';
    var heardEl = $('#learnerHeard');
    if (heardEl) heardEl.innerHTML = '<span class="hint">' + t('learner_listening') + '…</span>';
    recog = makeRecognition(
      function (txt) { heardText = txt; if (heardEl) heardEl.textContent = '“' + txt + '”'; },
      function () { stopListen(); },
      function (err) { stopListen(); if (err && err !== 'no-speech' && err !== 'aborted') toast(t('learner_mic_error')); }
    );
    if (!recog) { stopListen(); toast(t('learner_no_mic')); return; }
    listening = true;
    try { recog.start(); } catch (e) { stopListen(); }
  }
  function stopListen() {
    listening = false;
    var mic = $('#learnerMic');
    if (mic) mic.classList.remove('listening');
    var checkBtn = $('#learnerCheck');
    if (checkBtn && session && session.steps[session.idx].type === 'speak' && heardText) checkBtn.disabled = false;
    if (recog) { try { recog.stop(); } catch (e) {} }
  }
  function checkSpeak() {
    if (!session) return;
    var step = session.steps[session.idx];
    if (!heardText) { toast(t('learner_tap_mic')); return; }
    var expected = step.item.it;
    var correct = norm(heardText) === norm(expected) || norm(expected).indexOf(norm(heardText)) !== -1 || norm(heardText).indexOf(norm(expected)) !== -1;
    var heardEl = $('#learnerHeard');
    var fb = document.createElement('div');
    fb.className = 'feedback ' + (correct ? 'correct' : 'incorrect');
    fb.innerHTML = (correct ? '✅ ' : '❌ ') + t(correct ? 'learner_correct' : 'learner_incorrect') + (correct ? '' : ' — ' + esc(expected));
    if (heardEl && heardEl.parentElement) heardEl.parentElement.appendChild(fb);
    var checkBtn = $('#learnerCheck');
    if (checkBtn) checkBtn.disabled = true;
    if (correct) { session.earned += 1; addXp(1); }
    else { recordMistake(expected, session.lang); }
    setTimeout(nextStep, correct ? 900 : 1600);
  }

  /* ── Navigation ── */
  function nextStep() {
    if (!session) return;
    session.idx += 1;
    if (session.idx >= session.steps.length) { endSession(); return; }
    if (session.mode === 'mission') {
      saveMissionProg({ mode: 'mission', unit: session.unit, steps: session.steps, idx: session.idx, earned: session.earned, updatedAt: new Date().toISOString() });
      trackMissionForSession((session.idx / session.steps.length) * 100, false);
    }
    renderStep();
  }

  function listenAgain() {
    if (!session) return;
    var step = session.steps[session.idx];
    if (!step) return;
    var text = step.type === 'listen' || step.type === 'speak' ? step.item.it : '';
    if (text) speak(text);
  }

  function speakText(text) { speak(text); }

  function speakAll() {
    if (!session) return;
    var step = session.steps[session.idx];
    if (!step || step.type !== 'convo') return;
    var lines = (step.convo.speakers || []).map(function (sp) { return sp.text; });
    lines.forEach(function (txt, i) { setTimeout(function () { speak(txt, 0.95); }, i * 2600); });
  }

  function endSession() {
    var mode = session.mode;
    var unit = session.unit, lesson = session.lesson;
    var earned = session.earned;
    var s = load();

    // Remove overlay, render result inside stage
    var stage = $('#learnerStage');
    var emoji = '', title = '', body = '', bonus = 0, confettiFlag = false;

    if (mode === 'lesson') {
      markLessonDone(unit.id, lesson.id);
      bonus = 10; addXp(10);
      emoji = '🎉'; title = t('learner_lesson_complete');
      body = t('learner_lesson_complete_sub');
      confettiFlag = true;
    } else if (mode === 'test') {
      var score = earned;
      var passed = score >= 8;
      markTestResult(unit.id, passed, score);
      if (passed) { bonus = 20; addXp(20); }
      emoji = passed ? '🏆' : '💪';
      title = passed ? t('learner_test_passed') : t('learner_test_failed');
      body = t('learner_you_scored') + ' ' + score + '/10';
      confettiFlag = passed;
    } else if (mode === 'bank' || mode === 'review') {
      if (earned > 0) addXp(earned);
      bonus = 5; addXp(5);
      markLessonDone(mode, unit.id); // 'bank:<id>' or 'review:<id>'
      emoji = mode === 'bank' ? '📚' : '🧠';
      title = mode === 'bank' ? t('learner_bank_done') : t('learner_review_done');
      body = t('learner_you_scored') + ' ' + earned + ' XP' + ' · ' + esc(unit.name);
      confettiFlag = earned > 0;
    } else if (mode === 'mission') {
      clearMissionProg();
      trackMissionForSession(100, true);
      if (earned > 0) addXp(earned);
      bonus = 10; addXp(10);
      markLessonDone('mission', unit.id);
      emoji = '🎯'; title = t('learner_mission_done');
      body = t('learner_you_scored') + ' ' + earned + ' XP' + ' · ' + esc(unit.name);
      confettiFlag = true;
    } else {
      if (earned > 0) addXp(earned);
      emoji = '⚡'; title = t('learner_practice_done');
      body = t('learner_you_scored') + ' ' + earned + ' XP';
    }

    if (stage) {
      stage.innerHTML = '<div class="complete-card">' +
        '<div class="cc-emoji">' + emoji + '</div>' +
        '<div class="cc-title">' + esc(title) + '</div>' +
        '<div class="cc-sub">' + esc(body) + '</div>' +
        (bonus ? '<div class="cc-xp">+ ' + bonus + ' XP</div>' : '') +
        '<div class="btn-row" style="margin-top:22px"><button class="primary-btn" onclick="Learner.closeSession()">' + t('learner_back_path') + '</button></div>' +
      '</div>';
      i18nScope(stage);
    }
    if (confettiFlag) setTimeout(confetti, 200);
  }

  function closeSession() {
    // Save mission progress so the learner can continue where they left off.
    if (session && session.mode === 'mission' && session.idx < session.steps.length) {
      saveMissionProg({ mode: 'mission', unit: session.unit, steps: session.steps, idx: session.idx, earned: session.earned, updatedAt: new Date().toISOString() });
    }
    var ov = $('#learnerOverlay');
    if (ov) ov.remove();
    session = null;
    if (recog) { try { recog.stop(); } catch (e) {} recog = null; }
    refresh();
  }

  /* ═══════════════════ Public + refresh hooks ═══════════════════ */
  function refresh() {
    rootEl = $('#learnerRoot');
    if (!rootEl) return;
    if (session) { renderOverlay(); return; }
    srcReset(); // always re-query real word-bank / review data on open
    renderShell();
    showPane(lastPane);
  }

  function setLang(l) {
    if (session) closeSession();
    learnerSetLang(l);
    refresh();
  }

  function boot() {
    rootEl = $('#learnerRoot');
    if (!rootEl) return;
    renderShell();
    showPane(learnerLang() === 'it' ? 'learner-it' : 'learner-en');

    // Re-render when the Learner sidebar item is clicked
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-panel="learner"]');
      if (nav) setTimeout(refresh, 30);
    });

    // Re-render the pane content when an internal sub-tab is clicked
    // (the app's global handler toggles the .active classes; we fill the pane)
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('#pnl-learner .tab-link[data-subtab]');
      if (tab) setTimeout(function () { showPane(tab.getAttribute('data-subtab')); }, 20);
    });

    // If the panel is deactivated (user switches tab) while a session is open, close it
    var panelEl = $('#pnl-learner');
    if (panelEl && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        if (!panelEl.classList.contains('active') && session) { closeSession(); }
      }).observe(panelEl, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // Expose public API
  w.Learner = {
    refresh: refresh,
    boot: boot,
    setLang: setLang,
    lang: learnerLang,
    openLesson: openLesson,
    openTest: openTest,
    openPractice: openPractice,
    openBankTest: openBankTest,
    openReview: openReview,
    confirmReview: confirmReview,
    confirmMission: confirmMission,
    confirmNewMission: confirmNewMission,
    confirmThemeMission: confirmThemeMission,
    openMission: openMission,
    openThemeMission: openThemeMission,
    setThemeLen: setThemeLen,
    newMission: newMission,
    closeSession: closeSession,
    nextStep: nextStep,
    listenAgain: listenAgain,
    speakText: speakText,
    speakAll: speakAll,
    startListen: startListen,
    checkSpeak: checkSpeak,
    matchTap: matchTap,
    answerMc: answerMc,
    clearMistake: clearMistake,
    flipCard: flipCard,
    replayCard: replayCard,
    gradeCard: gradeCard,
  };

  // Boot when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
