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
  function recordMistake(itWord) { var s = load(); s.mistakes[itWord] = (s.mistakes[itWord] || 0) + 1; save(s); return s; }
  function clearMistake(itWord) { var s = load(); delete s.mistakes[itWord]; save(s); return s; }

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
      u.lang = 'it-IT';
      u.rate = rate || 0.92;
      if (itVoice) u.voice = itVoice;
      w.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* ── Speech recognition (it-IT) ── */
  var recog = null;
  function hasRecognition() {
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }
  function makeRecognition(onResult, onEnd, onError) {
    var SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return null;
    var r = new SR();
    r.lang = 'it-IT';
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
  var rootEl = null;  var lastPane = 'learner-path';
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

  function optionsFor(answerIt) {
    var opts = [answerIt];
    var all = w.LEARNER_ALL_WORDS();
    var tries = 0;
    while (opts.length < 4 && tries < 200) {
      tries++;
      var cand = all[Math.floor(Math.random() * all.length)].it;
      if (opts.indexOf(cand) === -1) opts.push(cand);
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
          '<div><div class="lh-xp">' + s.xp + '<small data-i18n="learner_xp">XP</small></div></div>' +
          '<div class="lh-goal">' +
            '<div class="goal-top"><span data-i18n="learner_daily_goal">Obiettivo giornaliero</span><span>' + s.todayXp + ' / ' + s.dailyGoal + '</span></div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + goalPct + '%"></div></div>' +
          '</div>' +
          '<div class="lh-streak"><span class="flame">🔥</span><span>' + s.streak + ' <span data-i18n="learner_streak">Serie</span></span></div>' +
        '</div>' +
        '<div class="panel-tabs"><div class="tabs" role="tablist">' +
          '<button role="tab" aria-selected="true" class="tab-link active" data-subtab="learner-path" data-i18n="learner_path">Percorso</button>' +
          '<button role="tab" aria-selected="false" class="tab-link" data-subtab="learner-practice" data-i18n="learner_practice">Allenamento</button>' +
          '<button role="tab" aria-selected="false" class="tab-link" data-subtab="learner-progress" data-i18n="learner_progress">Progressi</button>' +
        '</div></div>' +
        '<div role="tabpanel" class="subtab-pane active" id="sub-learner-path"></div>' +
        '<div role="tabpanel" class="subtab-pane" id="sub-learner-practice"></div>' +
        '<div role="tabpanel" class="subtab-pane" id="sub-learner-progress"></div>' +
      '</div>';
    // i18n for injected chrome
    i18nScope(rootEl);
  }

  function showPane(name) {
    if (!rootEl) return;
    lastPane = name;
    $all('.tab-link[data-subtab]', rootEl).forEach(function (b) {
      var on = b.getAttribute('data-subtab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $all('.subtab-pane', rootEl).forEach(function (p) {
      p.classList.toggle('active', p.id === 'sub-' + name);
    });
    renderPane(name);
  }

  function renderPane(name) {
    if (name === 'learner-path') renderPath();
    else if (name === 'learner-practice') renderPractice();
    else if (name === 'learner-progress') renderProgress();
  }

  /* ── PATH ── */
  function renderPath() {
    var pane = $('#sub-learner-path', rootEl);
    if (!pane) return;
    var html = '';
    var s = load();
    COURSE.levels.forEach(function (lv) {
      html += '<div style="margin:26px 0 14px"><span style="font-size:13px;font-weight:800;color:' + lv.color + ';text-transform:uppercase;letter-spacing:.1em">' + esc(lv.icon + ' ' + lv.label) + '</span></div>';
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
        // Test node
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
  function renderPractice() {
    var pane = $('#sub-learner-practice', rootEl);
    if (!pane) return;
    var words = learnedWords();
    if (!words.length) {
      pane.innerHTML = '<div class="learner-empty"><div class="le-emoji">📚</div><div class="le-title">' + t('learner_no_words_yet') + '</div></div>';
      return;
    }
    var speakCount = Math.min(5, words.filter(function (p) { return p.en.split(' ').length >= 2; }).length);
    pane.innerHTML =
      '<div class="practice-grid">' +
        '<div class="practice-card" onclick="Learner.openPractice(\'quiz\')">' +
          '<div class="pc-icon">⚡</div><div class="pc-title" data-i18n="learner_quiz">Quiz rapido</div>' +
          '<div class="pc-desc" data-i18n="learner_practice_quiz_desc">Scegli la traduzione corretta e abbina le parole delle tue lezioni.</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
        '<div class="practice-card" onclick="Learner.openPractice(\'speak\')">' +
          '<div class="pc-icon">🎙️</div><div class="pc-title" data-i18n="learner_speak_title">Pronuncia</div>' +
          '<div class="pc-desc" data-i18n="learner_practice_speak_desc">Ascolta e ripeti le frasi ad alta voce in italiano (' + speakCount + ').</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
        '<div class="practice-card" onclick="Learner.openPractice(\'match\')">' +
          '<div class="pc-icon">🧩</div><div class="pc-title" data-i18n="learner_match_title">Abbina parole</div>' +
          '<div class="pc-desc" data-i18n="learner_practice_match_desc">Collega le parole italiane alla traduzione inglese.</div>' +
          '<button class="lesson-link pc-go">' + t('learner_continue') + '</button></div>' +
      '</div>';
    i18nScope(pane);
  }

  /* ── PROGRESS ── */
  function renderProgress() {
    var pane = $('#sub-learner-progress', rootEl);
    if (!pane) return;
    var s = load();
    var totalLessons = 0, doneLessons = 0, unitsPassed = 0, totalUnits = 0;
    COURSE.levels.forEach(function (lv) {
      lv.units.forEach(function (u) {
        totalUnits++;
        totalLessons += u.lessons.length;
        doneLessons += unitLessonsDone(u);
        if (s.tests[u.id] && s.tests[u.id].passed) unitsPassed++;
      });
    });
    var pct = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    var html =
      '<div class="stats-grid">' +
        '<div class="stat-tile"><div class="st-value">' + s.xp + '</div><div class="st-label" data-i18n="learner_xp">XP</div></div>' +
        '<div class="stat-tile"><div class="st-value">🔥 ' + s.streak + '</div><div class="st-label" data-i18n="learner_streak">Serie</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + doneLessons + '/' + totalLessons + '</div><div class="st-label" data-i18n="learner_lessons_completed">Lezioni</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + unitsPassed + '/' + totalUnits + '</div><div class="st-label" data-i18n="learner_unit_passed">Unità</div></div>' +
        '<div class="stat-tile"><div class="st-value">' + pct + '%</div><div class="st-label" data-i18n="learner_overall">Totale</div></div>' +
      '</div>';
    // Per-level progress
    COURSE.levels.forEach(function (lv) {
      var dl = 0, tl = 0;
      lv.units.forEach(function (u) { tl += u.lessons.length; dl += unitLessonsDone(u); });
      var lp = tl ? Math.round((dl / tl) * 100) : 0;
      html += '<div class="level-progress-block">' +
        '<div class="lp-head"><span class="lp-title">' + esc(lv.icon + ' ' + lv.label) + '</span><span class="lp-num">' + dl + '/' + tl + '</span></div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + lp + '%"></div></div></div>';
    });
    // Mistake review
    var mistakes = Object.keys(s.mistakes);
    if (mistakes.length) {
      html += '<div class="level-progress-block"><div class="lp-head"><span class="lp-title">' + t('learner_review') + '</span></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
        mistakes.map(function (wrd) {
          return '<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--panel-2);font-size:12.5px;font-weight:600;color:var(--text)">' + esc(wrd) +
            '<button type="button" onclick="Learner.clearMistake(' + jsArg(wrd) + ')" style="border:none;background:rgba(239,68,68,.1);color:#ef4444;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer">✕</button></span>';
        }).join('') + '</div></div>';
    }
    pane.innerHTML = html;
    i18nScope(pane);
  }

  /* ═══════════════════ LESSON / TEST / PRACTICE sessions ═══════════════════ */
  function openSession(mode, unit, lesson, steps) {
    session = { mode: mode, unit: unit || null, lesson: lesson || null, steps: steps, idx: 0, earned: 0 };
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
    var words = learnedWords();
    if (!words.length) { toast(t('learner_no_words_yet')); return; }
    var steps = buildStepsForPractice(mode, words);
    if (!steps.length) { toast(t('learner_no_words_yet')); return; }
    openSession('practice' + (mode === 'speak' ? '-speak' : ''), null, null, steps);
  }

  function renderOverlay() {
    if (!session) return;
    var step = session.steps[session.idx];
    var total = session.steps.length;
    var pct = Math.round((session.idx / total) * 100);
    var title = session.mode === 'lesson' ? (session.lesson ? session.lesson.title : '') :
      session.mode === 'test' ? t('learner_unit_test') : t('learner_practice');

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
        '<div class="step-sub" data-i18n="learner_tap_mic">Premi e parla in italiano</div>' +
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
        '<div class="step-sub" data-i18n="learner_match_desc">Tocca la parola italiana e poi la traduzione inglese.</div>' +
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
      recordMistake(q.answer);
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
    else { recordMistake(expected); }
    setTimeout(nextStep, correct ? 900 : 1600);
  }

  /* ── Navigation ── */
  function nextStep() {
    if (!session) return;
    session.idx += 1;
    if (session.idx >= session.steps.length) { endSession(); return; }
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
    renderShell();
    showPane(lastPane);
  }

  function boot() {
    rootEl = $('#learnerRoot');
    if (!rootEl) return;
    renderShell();
    showPane('learner-path');

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
    openLesson: openLesson,
    openTest: openTest,
    openPractice: openPractice,
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
  };

  // Boot when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
