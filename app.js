// app.js

(function (w) {
  'use strict';

  var LANGUAGES = [
    { code: 'en', label: 'English', stt: 'en-US' },
    { code: 'it', label: 'Italian', stt: 'it-IT' },
    { code: 'fr', label: 'French', stt: 'fr-FR' },
    { code: 'de', label: 'German', stt: 'de-DE' }
  ];

  const params = new URLSearchParams(window.location.search);

  let modeKey = params.get('mode') || 'caption-en';
  const configRoot = w.SOTTOTITOLI_CONFIG || {};
  let modeConfig =
    (configRoot.modes && configRoot.modes[modeKey]) ||
    (configRoot.modes && configRoot.modes['caption-en']) ||
    {};

  function populateLanguageSelectsFromMode() {
    var srcSelect = document.getElementById('sourceLangSelect');
    var tgtSelect = document.getElementById('targetLangSelect');
    if (!srcSelect || !tgtSelect) return;

    srcSelect.innerHTML = '';
    tgtSelect.innerHTML = '';

    LANGUAGES.forEach(function (lang) {
      var opt1 = document.createElement('option');
      opt1.value = lang.code;
      opt1.textContent = lang.label;
      srcSelect.appendChild(opt1);

      var opt2 = document.createElement('option');
      opt2.value = lang.code;
      opt2.textContent = lang.label;
      tgtSelect.appendChild(opt2);
    });

    var parts = modeKey.split('-');
    if (parts[0] === 'caption') {
      srcSelect.value = parts[1] || 'en';
      tgtSelect.value = srcSelect.value;
    } else if (parts[0] === 'translate') {
      srcSelect.value = parts[1] || 'en';
      tgtSelect.value = parts[2] || 'it';
    }
  }

  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
  const DIARIZE_URL = 'https://sottotitoli-websocket.onrender.com/analyze-speakers';
  const SPEAKER_ANALYSIS_MARKER = '=== Speaker Analysis ===';

  let recognition = null;
  let wsPublisher = null;
  let transcriptLines = [];
  let room =
    params.get('room') ||
    (w.SottotitoliSessionUtils ? w.SottotitoliSessionUtils.randomRoom() : 'room-demo');
  let latestReportText = '';
  let lastInterimSent = '';
  let shouldKeepListening = false;
  let restartTimer = null;
  let hasStartedOnce = false;

  let audioRecorder = null;
  let audioStream = null;
  let audioChunks = [];
  let lastAudioBlob = null;
  let isRecordingAudio = false;

  let isAnalyzingSpeakers = false;
  let speakerAnalysisCompleted = false;
  let analyzeBtnRef = null;

  // Reuse the global Supabase client set up in auth.js
  const sessionSupabase = window.sottotitoliSupabase;
  let currentSessionId = null;
  let currentSessionStart = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function clearBox(id, placeholder) {
    const el = $(id);
    if (!el) return;
    el.textContent = placeholder || '';
    el.dataset.placeholderActive = 'true';
  }

  function ensureBoxReady(id) {
    const el = $(id);
    if (!el) return null;
    if (el.dataset.placeholderActive === 'true') {
      el.textContent = '';
      el.dataset.placeholderActive = 'false';
    }
    return el;
  }

  function appendLine(targetId, text) {
    const box = ensureBoxReady(targetId);
    if (!box || !text) return;
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = text;
    box.prepend(div);
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', modeKey);
    url.searchParams.set('room', room);
    url.searchParams.set('v', '12');
    history.replaceState({}, '', url.toString());
  }

  function switchMode(newModeKey) {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newModeKey);
    url.searchParams.set('room', room);
    url.searchParams.set('v', '12');
    window.location.href = url.toString();
  }

  function currentOverlayUrl() {
    const url = new URL('overlay.html', window.location.href);
    url.searchParams.set('room', room);
    url.searchParams.set('v', '12');
    return url.toString();
  }

  function updateRoomUI() {
    syncUrl();
    setText('roomValue', room);
    const link = $('overlayLink');
    if (link) {
      const overlayUrl = currentOverlayUrl();
      link.href = overlayUrl;
      link.textContent = overlayUrl;
    }
  }

  function updateStats() {
    const plain = transcriptLines.map(x => x.text).join(' ').trim();
    setText('statLines', String(transcriptLines.length));
    setText('statWords', String(w.SottotitoliSessionUtils.countWords(plain)));
    setText('statChars', String(plain.length));
  }

  // --- METRIC HELPERS ---

  function computeSentencesCount(text) {
    if (!text) return 0;
    const parts = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    return parts.length;
  }

  function computeFillersCount(text) {
    if (!text) return 0;
    const lower = text.toLowerCase();
    const fillers = ['uh', 'um', 'ehm', 'erm', 'you know', 'like'];
    let count = 0;
    fillers.forEach(f => {
      const regex = new RegExp('\\b' + f.replace(' ', '\\s+') + '\\b', 'g');
      const matches = lower.match(regex);
      if (matches) count += matches.length;
    });
    return count;
  }

  function computeUniqueWordsCount(text) {
    if (!text) return 0;
    const tokens = text
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ÿ\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return 0;
    const set = new Set(tokens);
    return set.size;
  }

  function tokenizeWords(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ÿ'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function countRegexMatches(text, regex) {
    if (!text) return 0;
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  function computeQuestionCount(text) {
    if (!text) return 0;
    return countRegexMatches(text, /\?/g);
  }

  function computeNegationCount(text) {
    if (!text) return 0;
    return countRegexMatches(
      text.toLowerCase(),
      /\b(no|not|never|nothing|nobody|none|neither|nor|cannot|can't|don't|doesn't|didn't|won't|wouldn't|shouldn't|couldn't|isn't|aren't|wasn't|weren't|without)\b/g
    );
  }

  function computeClauseEstimate(text) {
    if (!text) return 0;
    const base = computeSentencesCount(text);
    const connectors = countRegexMatches(
      text.toLowerCase(),
      /\b(and|but|or|because|although|though|while|when|if|that|which|who|where|since|unless)\b/g
    );
    return base + connectors;
  }

  function computeRepetitionRate(text) {
    const tokens = tokenizeWords(text);
    if (!tokens.length) return null;
    const counts = new Map();
    tokens.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    let repeatedOccurrences = 0;
    counts.forEach((count) => {
      if (count > 1) repeatedOccurrences += count - 1;
    });
    return repeatedOccurrences / tokens.length;
  }

  function computeMarkerCounts(text) {
    const lower = (text || '').toLowerCase();

    return {
      present_marker_count: countRegexMatches(lower, /\b(am|is|are|do|does|have|has)\b/g),
      past_marker_count: countRegexMatches(lower, /\b(was|were|did|had)\b/g),
      future_marker_count: countRegexMatches(lower, /\b(will|going to|shall)\b/g),
      conditional_marker_count: countRegexMatches(lower, /\b(would|could|should|might|if)\b/g)
    };
  }

  function computeComparativeCount(text) {
    const lower = (text || '').toLowerCase();
    return countRegexMatches(lower, /\b(more|less|better|worse|faster|slower|bigger|smaller|than)\b/g);
  }

  function computeSuperlativeCount(text) {
    const lower = (text || '').toLowerCase();
    return countRegexMatches(lower, /\b(most|least|best|worst|fastest|slowest|biggest|smallest)\b/g);
  }

  function computePassiveEstimateCount(text) {
    const lower = (text || '').toLowerCase();
    return countRegexMatches(lower, /\b(am|is|are|was|were|be|been|being)\s+\w+(ed|en)\b/g);
  }

  function computeLexicalBuckets(text) {
    const tokens = tokenizeWords(text);

    const pronouns = new Set([
      'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their',
      'mine', 'yours', 'hers', 'ours', 'theirs'
    ]);
    const prepositions = new Set([
      'in', 'on', 'at', 'by', 'for', 'with', 'from', 'to', 'of',
      'about', 'under', 'over', 'between', 'through', 'during',
      'before', 'after', 'into', 'onto', 'against', 'without'
    ]);
    const conjunctions = new Set([
      'and', 'but', 'or', 'so', 'yet', 'for', 'nor',
      'although', 'because', 'since', 'unless', 'while', 'whereas'
    ]);
    const modals = new Set([
      'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would'
    ]);
    const commonVerbs = new Set([
      'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
      'do', 'does', 'did', 'done', 'have', 'has', 'had',
      'say', 'go', 'get', 'make', 'know', 'think', 'take', 'see',
      'come', 'want', 'look', 'use', 'find', 'give', 'tell',
      'work', 'call', 'try', 'ask', 'need', 'feel', 'become',
      'leave', 'put'
    ]);
    const commonAdverbs = new Set([
      'very', 'really', 'quite', 'just', 'also', 'only', 'always',
      'never', 'often', 'sometimes', 'quickly', 'slowly', 'well'
    ]);
    const commonAdjectives = new Set([
      'good', 'bad', 'big', 'small', 'important', 'different',
      'high', 'low', 'early', 'late', 'great', 'simple', 'hard'
    ]);

    let pronoun_count = 0;
    let preposition_count = 0;
    let conjunction_count = 0;
    let modal_verb_count = 0;
    let verb_count = 0;
    let adjective_count = 0;
    let adverb_count = 0;
    let noun_count = 0;

    tokens.forEach((token) => {
      if (pronouns.has(token)) pronoun_count += 1;
      if (prepositions.has(token)) preposition_count += 1;
      if (conjunctions.has(token)) conjunction_count += 1;
      if (modals.has(token)) modal_verb_count += 1;
      if (commonVerbs.has(token) || /(ed|ing)$/.test(token)) verb_count += 1;
      if (commonAdverbs.has(token) || /ly$/.test(token)) adverb_count += 1;
      if (commonAdjectives.has(token) || /(ous|ful|ive|al|able|ible|ic)$/.test(token)) adjective_count += 1;
    });

    noun_count = Math.max(
      0,
      tokens.length -
        pronoun_count -
        preposition_count -
        conjunction_count -
        modal_verb_count -
        verb_count -
        adjective_count -
        adverb_count
    );

    const functionWordCount =
      pronoun_count + preposition_count + conjunction_count + modal_verb_count;

    return {
      noun_count,
      verb_count,
      adjective_count,
      adverb_count,
      pronoun_count,
      preposition_count,
      conjunction_count,
      modal_verb_count,
      function_words_ratio: tokens.length > 0 ? functionWordCount / tokens.length : null,
      unique_lemmas_count: computeUniqueWordsCount(text),
      nouns_count: noun_count,
      verbs_count: verb_count,
      adjectives_count: adjective_count,
      adverbs_count: adverb_count
    };
  }

  function computeQualityScore({ wpm, fillersPerMinute, lexicalDiversity }) {
    let score = 50;

    if (typeof wpm === 'number') {
      if (wpm >= 90 && wpm <= 160) {
        score += 15;
      } else if (wpm >= 70 && wpm <= 180) {
        score += 8;
      }
    }

    if (typeof lexicalDiversity === 'number') {
      if (lexicalDiversity >= 0.45) {
        score += 20;
      } else if (lexicalDiversity >= 0.35) {
        score += 12;
      } else if (lexicalDiversity >= 0.25) {
        score += 6;
      }
    }

    if (typeof fillersPerMinute === 'number') {
      if (fillersPerMinute <= 3) {
        score += 15;
      } else if (fillersPerMinute <= 6) {
        score += 8;
      } else if (fillersPerMinute <= 9) {
        score -= 4;
      } else {
        score -= 10;
      }
    }

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    return score;
  }

  function buildAiStatus(wordsCount, speakerMetricsPresent) {
    if (!wordsCount || wordsCount < 5) return 'insufficient_data';
    if (speakerMetricsPresent) return 'speaker_ready';
    return 'text_ready';
  }

  function extractSpeakerMetrics(data) {
    if (!data) {
      return {
        turn_count: null,
        interruption_count: null,
        speaking_share_ratio: null,
        avg_turn_length_words: null
      };
    }

    const analytics = data.analytics || {};
    const speakers = Array.isArray(analytics.speakers) ? analytics.speakers : [];
    const segments = Array.isArray(data.segments) ? data.segments : [];

    let totalWords = 0;
    let maxSpeakerWords = 0;

    speakers.forEach((speaker) => {
      const words = Number(speaker.words || 0);
      totalWords += words;
      if (words > maxSpeakerWords) maxSpeakerWords = words;
    });

    const totalTurns =
      speakers.length > 0
        ? speakers.reduce((sum, s) => sum + Number(s.turns || 0), 0)
        : segments.length;

    const totalSpeakerWords =
      speakers.length > 0
        ? speakers.reduce((sum, s) => sum + Number(s.words || 0), 0)
        : 0;

    const avgTurnLengthWords =
      totalTurns > 0 ? totalSpeakerWords / totalTurns : null;

    return {
      turn_count: totalTurns || null,
      interruption_count:
        analytics.interruptions != null ? Number(analytics.interruptions) : null,
      speaking_share_ratio:
        totalWords > 0 ? maxSpeakerWords / totalWords : null,
      avg_turn_length_words:
        avgTurnLengthWords != null && Number.isFinite(avgTurnLengthWords)
          ? avgTurnLengthWords
          : null
    };
  }

  // --- SUPABASE SESSION LOGGING ---

  async function createSessionRow() {
    try {
      const result = await sessionSupabase.auth.getSession();
      const sessionData = result.data;
      const sessionError = result.error;

      if (sessionError || !sessionData || !sessionData.session) {
        console.warn('No Supabase session; not logging Sottotitoli session.');
        return;
      }

      const user = sessionData.session.user;
      const userId = user.id;

      currentSessionStart = new Date();
      currentSessionId = null;

      const languagePair =
        modeKey.startsWith('translate-')
          ? modeKey.replace('translate-', '').replace('-', '->')
          : 'en-en';

      const sessionType = 'solo';
      const topicTag = null;

      const { data, error } = await sessionSupabase
        .from('sessions')
        .insert([
          {
            user_id: userId,
            room,
            mode: modeKey,
            started_at: currentSessionStart.toISOString(),
            language_pair: languagePair,
            session_type: sessionType,
            topic_tag: topicTag
          }
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session row:', error);
        return;
      }

      currentSessionId = data.id;
      console.log('Created session row with id', currentSessionId);
    } catch (e) {
      console.error('Unexpected error creating session row:', e);
    }
  }

  async function finalizeSessionRow() {
    if (!currentSessionId || !currentSessionStart) {
      return;
    }

    try {
      const ended = new Date();
      const durationSeconds = Math.round(
        (ended.getTime() - currentSessionStart.getTime()) / 1000
      );

      const plain = transcriptLines.map(x => x.text).join(' ').trim();
      const wordsCount = w.SottotitoliSessionUtils.countWords(plain);
      const charsCount = plain.length;

      const wpm =
        durationSeconds > 0 ? wordsCount / (durationSeconds / 60) : null;

      const sentencesCount = computeSentencesCount(plain);
      const avgSentenceLength =
        sentencesCount > 0 ? wordsCount / sentencesCount : null;

      const fillersCount = computeFillersCount(plain);
      const fillersPerMinute =
        durationSeconds > 0 ? fillersCount / (durationSeconds / 60) : null;

      const uniqueWordsCount = computeUniqueWordsCount(plain);
      const lexicalDiversity =
        wordsCount > 0 ? uniqueWordsCount / wordsCount : null;

      const qualityScore = computeQualityScore({
        wpm,
        fillersPerMinute,
        lexicalDiversity
      });

      const transcriptText = plain || null;
      const questionCount = computeQuestionCount(plain);
      const negationCount = computeNegationCount(plain);
      const clauseEstimate = computeClauseEstimate(plain);
      const repetitionRate = computeRepetitionRate(plain);
      const markerCounts = computeMarkerCounts(plain);
      const comparativeCount = computeComparativeCount(plain);
      const superlativeCount = computeSuperlativeCount(plain);
      const passiveEstimateCount = computePassiveEstimateCount(plain);
      const lexicalBuckets = computeLexicalBuckets(plain);

      const updatePayload = {
        ended_at: ended.toISOString(),
        duration_seconds: durationSeconds,
        words_count: wordsCount,
        chars_count: charsCount,
        wpm,
        sentences_count: sentencesCount,
        avg_sentence_length_words: avgSentenceLength,
        fillers_count: fillersCount,
        fillers_per_minute: fillersPerMinute,
        unique_words_count: uniqueWordsCount,
        lexical_diversity: lexicalDiversity,
        quality_score: qualityScore,

        transcript_text: transcriptText,

        unique_lemmas_count: lexicalBuckets.unique_lemmas_count,
        nouns_count: lexicalBuckets.nouns_count,
        verbs_count: lexicalBuckets.verbs_count,
        adjectives_count: lexicalBuckets.adjectives_count,
        adverbs_count: lexicalBuckets.adverbs_count,

        function_words_ratio: lexicalBuckets.function_words_ratio,
        noun_count: lexicalBuckets.noun_count,
        verb_count: lexicalBuckets.verb_count,
        adjective_count: lexicalBuckets.adjective_count,
        adverb_count: lexicalBuckets.adverb_count,
        pronoun_count: lexicalBuckets.pronoun_count,
        preposition_count: lexicalBuckets.preposition_count,
        conjunction_count: lexicalBuckets.conjunction_count,
        modal_verb_count: lexicalBuckets.modal_verb_count,

        question_count: questionCount,
        negation_count: negationCount,
        clause_estimate: clauseEstimate,
        repetition_rate: repetitionRate,

        present_marker_count: markerCounts.present_marker_count,
        past_marker_count: markerCounts.past_marker_count,
        future_marker_count: markerCounts.future_marker_count,
        conditional_marker_count: markerCounts.conditional_marker_count,

        passive_estimate_count: passiveEstimateCount,
        comparative_count: comparativeCount,
        superlative_count: superlativeCount,

        ai_status: buildAiStatus(wordsCount, false),
        ai_last_error: null
      };

      const { error } = await sessionSupabase
        .from('sessions')
        .update(updatePayload)
        .eq('id', currentSessionId);

      if (error) {
        console.error('Error updating session row:', error);
      } else {
        console.log('Updated session row for', currentSessionId, updatePayload);
      }
    } catch (e) {
      console.error('Unexpected error updating session row:', e);
    } finally {
      currentSessionStart = null;
    }
  }

  // --- UI STATE HELPERS ---

  function updateSocketState(state) {
    setText('socketStatus', state);
    const dot = $('socketDot');
    if (!dot) return;
    dot.classList.toggle('connected', state === 'connected');
  }

  function updateMicState(stateText, live) {
    setText('micStatus', stateText);
    const dot = $('micDot');
    if (!dot) return;
    dot.classList.toggle('connected', !!live);
  }

  function updateAnalyzeButtonState() {
    if (!analyzeBtnRef) return;

    analyzeBtnRef.className = 'btn btn-primary';
    analyzeBtnRef.style.opacity = '';
    analyzeBtnRef.style.cursor = '';
    analyzeBtnRef.style.background = '';
    analyzeBtnRef.style.border = '';
    analyzeBtnRef.style.color = '';

    if (speakerAnalysisCompleted) {
      analyzeBtnRef.disabled = true;
      analyzeBtnRef.textContent = 'Speaker analysis completed';
      analyzeBtnRef.style.background = '#16a34a';
      analyzeBtnRef.style.border = '1px solid #16a34a';
      analyzeBtnRef.style.color = '#ffffff';
      analyzeBtnRef.style.opacity = '1';
      analyzeBtnRef.style.cursor = 'not-allowed';
      return;
    }

    if (isAnalyzingSpeakers) {
      analyzeBtnRef.disabled = true;
      analyzeBtnRef.textContent = 'Analyzing speakers...';
      analyzeBtnRef.style.background = '#d97706';
      analyzeBtnRef.style.border = '1px solid #d97706';
      analyzeBtnRef.style.color = '#ffffff';
      analyzeBtnRef.style.opacity = '1';
      analyzeBtnRef.style.cursor = 'progress';
      return;
    }

    analyzeBtnRef.disabled = false;
    analyzeBtnRef.textContent = 'Analyze speakers';
    analyzeBtnRef.style.background = '#2563eb';
    analyzeBtnRef.style.border = '1px solid #2563eb';
    analyzeBtnRef.style.color = '#ffffff';
  }

  function removeExistingSpeakerAnalysis(reportText) {
    if (!reportText) return '';
    const markerIndex = reportText.indexOf(SPEAKER_ANALYSIS_MARKER);
    if (markerIndex === -1) return reportText.trim();
    return reportText.slice(0, markerIndex).trim();
  }

  async function maybeTranslate(text) {
    if (!modeConfig.translate) return null;

    try {
      const providerConfig = w.CaptionTranslationProviders.resolveConfig();
      const result = await w.CaptionTranslationProviders.translateText(
        providerConfig,
        text,
        modeConfig.sourceCode,
        modeConfig.targetLang
      );
      return result && result.translatedText ? result.translatedText : null;
    } catch (err) {
      setText('statusText', 'Translation error: ' + err.message);
      return null;
    }
  }

  function sendPayload(payload, statusMessage) {
    if (!wsPublisher) {
      setText('statusText', 'No websocket publisher available.');
      return;
    }
    wsPublisher.publish(payload);
    if (statusMessage) setText('statusText', statusMessage);
  }

  async function handleFinalTranscript(text) {
    if (!text) return;

    const timestamp = w.SottotitoliSessionUtils.formatTimestamp(new Date());
    const entry = { timestamp, text, translated: null };

    appendLine('sourceOutput', text);

    const payload = {
      type: 'caption',
      room,
      mode: modeKey,
      final: text,
      timestamp,
      sourceLang: modeConfig.sourceLang,
      kind: modeConfig.translate ? 'translation' : 'caption'
    };

    if (modeConfig.translate) {
      const translated = await maybeTranslate(text);
      if (translated) {
        entry.translated = translated;
        appendLine('translatedOutput', translated);
        payload.translated = translated;
        payload.targetLang = modeConfig.targetLang;
      } else {
        payload.translated = '';
      }
    }

    transcriptLines.push(entry);
    updateStats();
    lastInterimSent = '';
    clearBox('interimOutput', 'Interim');
    sendPayload(payload, 'Final caption sent to overlay.');
  }

  function handleInterimTranscript(text) {
    const clean = (text || '').trim();
    const interimBox = $('interimOutput');
    if (!interimBox) return;

    if (!clean) {
      clearBox('interimOutput', 'Interim');
      return;
    }

    interimBox.textContent = clean;
    interimBox.dataset.placeholderActive = 'false';

    if (clean === lastInterimSent) return;
    lastInterimSent = clean;

    sendPayload(
      {
        type: 'caption',
        room,
        mode: modeKey,
        interim: clean,
        sourceLang: modeConfig.sourceLang,
        kind: modeConfig.translate ? 'translation' : 'caption'
      },
      'Interim caption sent to overlay.'
    );
  }

  function clearRestartTimer() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart(delay) {
    clearRestartTimer();
    if (!shouldKeepListening) return;

    restartTimer = setTimeout(() => {
      try {
        if (recognition) recognition.start();
      } catch (e) {
        setText('statusText', 'Recognition restart waiting...');
        scheduleRestart(1200);
      }
    }, delay || 700);
  }

  function buildRecognition() {
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = modeConfig.sourceLang || 'en-US';

    rec.onstart = () => {
      hasStartedOnce = true;
      setText('statusText', 'Listening in ' + (modeConfig.sourceLang || 'en-US') + '...');
      updateMicState('live', true);
    };

    rec.onresult = event => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text =
          ((event.results[i][0] && event.results[i][0].transcript) || '').trim();
        if (!text) continue;

        if (event.results[i].isFinal) {
          handleFinalTranscript(text);
        } else {
          interim += ' ' + text;
        }
      }

      handleInterimTranscript(interim.trim());
    };

    rec.onerror = event => {
      const err = event.error || 'unknown';
      setText(
        'statusText',
        'Speech error (' + (modeConfig.sourceLang || 'en-US') + '): ' + err
      );

      if (
        err === 'not-allowed' ||
        err === 'service-not-allowed' ||
        err === 'audio-capture'
      ) {
        shouldKeepListening = false;
        updateMicState('blocked', false);
        return;
      }

      updateMicState('recovering', false);
    };

    rec.onend = () => {
      updateMicState(shouldKeepListening ? 'restarting' : 'stopped', false);

      if (shouldKeepListening) {
        setText(
          'statusText',
          hasStartedOnce
            ? 'Recognition ended, restarting...'
            : 'Recognition did not stay active, retrying...'
        );
        scheduleRestart();
      } else {
        setText('statusText', 'Recognition stopped.');
      }
    };

    return rec;
  }

  async function startAudioCapture() {
    if (audioRecorder && audioRecorder.state === 'recording') return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setText(
        'statusText',
        'Audio recording is not supported in this browser.'
      );
      return;
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      lastAudioBlob = null;
      speakerAnalysisCompleted = false;
      isAnalyzingSpeakers = false;
      updateAnalyzeButtonState();

      let mimeType = '';
      if (w.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (w.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      audioRecorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      audioRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      audioRecorder.onstop = () => {
        const actualType =
          (audioRecorder && audioRecorder.mimeType) || 'audio/webm';
        lastAudioBlob = new Blob(audioChunks, { type: actualType });
        isRecordingAudio = false;

        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          audioStream = null;
        }

        setText(
          'statusText',
          lastAudioBlob.size > 0
            ? 'Lesson audio captured and ready for speaker analysis.'
            : 'Recording stopped, but no audio was captured.'
        );
      };

      audioRecorder.start();
      isRecordingAudio = true;
      setText(
        'statusText',
        'Recording lesson audio for later speaker analysis...'
      );
    } catch (err) {
      setText('statusText', 'Could not start audio capture: ' + err.message);
    }
  }

  function stopAudioCapture() {
    if (!audioRecorder || audioRecorder.state !== 'recording') return;
    try {
      audioRecorder.stop();
    } catch (err) {
      setText(
        'statusText',
        'Could not stop audio recorder: ' + err.message
      );
    }
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setText(
        'statusText',
        'Speech recognition is not supported in this browser.'
      );
      return;
    }

    clearRestartTimer();
    shouldKeepListening = true;
    hasStartedOnce = false;

    if (!recognition) {
      recognition = buildRecognition();
    } else {
      recognition.lang = modeConfig.sourceLang || 'en-US';
    }

    try {
      recognition.start();
      startAudioCapture();
      createSessionRow();
    } catch (e) {
      setText('statusText', 'Recognition start retrying...');
      scheduleRestart(900);
    }
  }

  function stopRecognition() {
    shouldKeepListening = false;
    clearRestartTimer();

    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }

    stopAudioCapture();
    updateMicState('stopped', false);
    setText('statusText', 'Recognition stopped by user.');

    finalizeSessionRow();
  }

  function connectSocket() {
    wsPublisher = w.createWSPublisher({
      url: w.SOTTOTITOLI_CONFIG.websocketUrl,
      room,
      onStateChange: state => {
        updateSocketState(state);
        setText(
          'statusText',
          'Socket state: ' + state + ' · room: ' + room
        );
      },
      onError: error => {
        setText('statusText', 'Socket error: ' + error);
      }
    });

    wsPublisher.connect();
  }

  async function generateLessonReport() {
    const report = await w.SottotitoliLessonReport.generateLessonReport(
      transcriptLines
    );
    latestReportText =
      w.SottotitoliLessonReport.formatLessonReport(report);
    latestReportText = removeExistingSpeakerAnalysis(latestReportText);
    setText('lessonReport', latestReportText || 'No report yet.');
  }

  async function copyOverlayLink() {
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(
      currentOverlayUrl()
    );
    setText(
      'statusText',
      ok ? 'Overlay link copied.' : 'Could not copy overlay link.'
    );
  }

  async function copyTranscript() {
    const text =
      w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(
      text || 'No transcript yet.'
    );
    setText(
      'statusText',
      ok ? 'Transcript copied.' : 'Could not copy transcript.'
    );
  }

  function downloadTranscript() {
    const text =
      w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    w.SottotitoliSessionUtils.downloadText(
      `sottotitoli-transcript-${room}.txt`,
      text || 'No transcript yet.'
    );
    setText('statusText', 'Transcript downloaded.');
  }

  function downloadReport() {
    w.SottotitoliSessionUtils.downloadText(
      `sottotitoli-lesson-report-${room}.txt`,
      latestReportText || 'No report yet.'
    );
    setText('statusText', 'Report downloaded.');
  }

  function openOverlay() {
    window.open(currentOverlayUrl(), '_blank', 'noopener');
  }

  function newRoom() {
    room = w.SottotitoliSessionUtils.randomRoom();
    transcriptLines = [];
    latestReportText = '';
    lastInterimSent = '';
    audioChunks = [];
    lastAudioBlob = null;
    isAnalyzingSpeakers = false;
    speakerAnalysisCompleted = false;
    currentSessionId = null;
    currentSessionStart = null;
    updateAnalyzeButtonState();

    clearBox('interimOutput', 'Interim');
    clearBox('sourceOutput', 'Source output');
    clearBox('translatedOutput', 'Translated output');
    setText('lessonReport', 'No report yet.');
    updateStats();

    updateRoomUI();
    if (wsPublisher) wsPublisher.disconnect();
    connectSocket();
    setText('statusText', 'New room created: ' + room);
  }

  function sendTestMessage() {
    sendPayload(
      {
        type: 'caption',
        room,
        mode: modeKey,
        final:
          modeConfig.sourceLang === 'it-IT'
            ? 'Questo è un test.'
            : 'This is a test.',
        translated: modeConfig.translate
          ? modeConfig.targetLang === 'it'
            ? 'Questo è un test.'
            : 'This is a test.'
          : '',
        timestamp: new Date().toISOString(),
        sourceLang: modeConfig.sourceLang,
        kind: modeConfig.translate ? 'translation' : 'caption'
      },
      'Test message sent to room: ' + room
    );
  }

  function formatDiarizationResult(data) {
    if (!data) return 'No speaker analysis result returned.';
    const lines = [];

    if (typeof data.text === 'string' && data.text.trim()) {
      lines.push('Transcript');
      lines.push(data.text.trim());
      lines.push('');
    }

    if (data.analytics) {
      lines.push('Speaker summary');

      if (Array.isArray(data.analytics.speakers) && data.analytics.speakers.length) {
        data.analytics.speakers.forEach((speaker, index) => {
          const share =
            speaker.shareOfTime != null
              ? Math.round(Number(speaker.shareOfTime) * 100)
              : 0;
          lines.push(
            `${index + 1}. ${speaker.speaker}: turns ${speaker.turns}, words ${speaker.words}, duration ${Number(speaker.duration || 0).toFixed(1)}s, share ${share}%`
          );
        });
      }

      if (data.analytics.interruptions != null) {
        lines.push('');
        lines.push('Interruptions: ' + data.analytics.interruptions);
      }

      if (data.analytics.totalDuration != null) {
        lines.push(
          'Total duration: ' + Number(data.analytics.totalDuration).toFixed(1) + 's'
        );
      }

      lines.push('');
    }

    const segments = Array.isArray(data.segments) ? data.segments : [];
    if (segments.length) {
      lines.push('Segments');
      segments.forEach((seg, index) => {
        const speaker = seg.speaker || 'Unknown speaker';
        const start = seg.start != null ? Number(seg.start).toFixed(1) : '?';
        const end = seg.end != null ? Number(seg.end).toFixed(1) : '?';
        const text = (seg.text || '').trim();
        lines.push(`${index + 1}. ${speaker} [${start}s - ${end}s]`);
        if (text) lines.push(text);
        lines.push('');
      });
    }

    return lines.join('\n').trim() || JSON.stringify(data, null, 2);
  }

  async function analyzeSpeakers() {
    if (speakerAnalysisCompleted) {
      setText(
        'statusText',
        'Speaker analysis has already been completed for this session.'
      );
      return;
    }

    if (isAnalyzingSpeakers) {
      setText('statusText', 'Speaker analysis is already running.');
      return;
    }

    if (isRecordingAudio) {
      setText(
        'statusText',
        'Stop the microphone first so the lesson recording can finish.'
      );
      return;
    }

    if (!lastAudioBlob || !lastAudioBlob.size) {
      setText(
        'statusText',
        'No recorded lesson audio is available yet. Start and stop a session first.'
      );
      return;
    }

    isAnalyzingSpeakers = true;
    updateAnalyzeButtonState();
    setText('statusText', 'Uploading lesson audio for speaker analysis...');

    try {
      const ext =
        lastAudioBlob.type && lastAudioBlob.type.indexOf('ogg') !== -1
          ? 'ogg'
          : 'webm';

      const formData = new FormData();
      formData.append('file', lastAudioBlob, `lesson-${room}.${ext}`);
      formData.append('room', room);
      formData.append('mode', modeKey);
      formData.append('sourceLang', modeConfig.sourceLang || '');

      const response = await fetch(DIARIZE_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || 'Speaker analysis failed with status ' + response.status
        );
      }

      const data = await response.json();
      const diarizationText = formatDiarizationResult(data);
      const speakerMetrics = extractSpeakerMetrics(data);

      if (sessionSupabase && currentSessionId) {
        const { error: speakerSaveError } = await sessionSupabase
          .from('sessions')
          .update({
            speaker_analysis_json: data,
            turn_count: speakerMetrics.turn_count,
            interruption_count: speakerMetrics.interruption_count,
            speaking_share_ratio: speakerMetrics.speaking_share_ratio,
            avg_turn_length_words: speakerMetrics.avg_turn_length_words,
            ai_status: buildAiStatus(
              w.SottotitoliSessionUtils.countWords(
                transcriptLines.map(x => x.text).join(' ').trim()
              ),
              true
            ),
            ai_last_error: null
          })
          .eq('id', currentSessionId);

        if (speakerSaveError) {
          console.error('Error saving speaker analysis:', speakerSaveError);
        }
      }

      let baseReport = removeExistingSpeakerAnalysis(latestReportText);
      if (!baseReport || baseReport === 'No report yet.') {
        baseReport =
          '=== Lesson Report ===\n\nNo written lesson report generated yet.';
      }

      latestReportText =
        baseReport + '\n\n' + SPEAKER_ANALYSIS_MARKER + '\n' + diarizationText;
      setText('lessonReport', latestReportText);

      speakerAnalysisCompleted = true;
      setText('statusText', 'Speaker analysis completed.');
    } catch (err) {
      if (sessionSupabase && currentSessionId) {
        try {
          await sessionSupabase
            .from('sessions')
            .update({
              ai_status: 'speaker_error',
              ai_last_error: err.message || 'Unknown speaker analysis error'
            })
            .eq('id', currentSessionId);
        } catch (saveErr) {
          console.error('Could not persist speaker analysis error:', saveErr);
        }
      }

      setText('statusText', 'Speaker analysis failed: ' + err.message);
    } finally {
      isAnalyzingSpeakers = false;
      updateAnalyzeButtonState();
    }
  }

  function describeMode() {
    const title = modeConfig.title || 'Sottotitoli Session';
    const lesson = modeConfig.lessonMode
      ? 'Lesson mode is active with report generation.'
      : 'Live mode is active with overlay publishing.';
    const translation = modeConfig.translate
      ? 'Translation mode is enabled.'
      : 'Caption mode is enabled.';
    setText('modeTitle', title);
    setText('modeDescription', lesson + ' ' + translation);
  }

  function getCurrentModeKeyFromSelects() {
    var srcSelect = document.getElementById('sourceLangSelect');
    var tgtSelect = document.getElementById('targetLangSelect');
    if (!srcSelect || !tgtSelect) return modeKey;

    var src = srcSelect.value;
    var tgt = tgtSelect.value;

    if (!src || !tgt) return modeKey;

    if (src === tgt) {
      return 'caption-' + src;
    }
    return 'translate-' + src + '-' + tgt;
  }

  function updateModeFromUI() {
    modeKey = getCurrentModeKeyFromSelects();
    var cfgRoot = window.SOTTOTITOLI_CONFIG || window.SottotitoliConfig || configRoot;
    if (cfgRoot && cfgRoot.modes && cfgRoot.modes[modeKey]) {
      modeConfig = cfgRoot.modes[modeKey];
    }
    describeMode();
    syncUrl();
  }

  function goToSelectedModePage() {
    var mode = getCurrentModeKeyFromSelects();
    if (!mode) return;

    var url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    url.searchParams.set('room', room);
    url.searchParams.set('v', '12');
    window.location.href = url.toString();
  }

  document.addEventListener('DOMContentLoaded', () => {
    populateLanguageSelectsFromMode();
    describeMode();
    updateRoomUI();
    connectSocket();
    updateStats();
    clearBox('interimOutput', 'Interim');
    clearBox('sourceOutput', 'Source output');
    clearBox('translatedOutput', 'Translated output');

    var srcSelect = document.getElementById('sourceLangSelect');
    var tgtSelect = document.getElementById('targetLangSelect');
    if (srcSelect && tgtSelect) {
      srcSelect.addEventListener('change', () => {
        updateModeFromUI();
        if (recognition) {
          stopRecognition();
          startRecognition();
        }
      });
      tgtSelect.addEventListener('change', () => {
        updateModeFromUI();
        if (recognition) {
          stopRecognition();
          startRecognition();
        }
      });
    }

    var applyBtn = document.getElementById('applyLangModeBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        goToSelectedModePage();
      });
    }

    const startBtn = $('startBtn');
    const stopBtn = $('stopBtn');
    const openOverlayBtn = $('openOverlayBtn');
    const copyOverlayBtn = $('copyOverlayBtn');
    const newRoomBtn = $('newRoomBtn');
    const copyTranscriptBtn = $('copyTranscriptBtn');
    const downloadTranscriptBtn = $('downloadTranscriptBtn');

    startBtn.addEventListener('click', startRecognition);
    stopBtn.addEventListener('click', stopRecognition);
    openOverlayBtn.addEventListener('click', openOverlay);
    copyOverlayBtn.addEventListener('click', copyOverlayLink);
    newRoomBtn.addEventListener('click', newRoom);
    copyTranscriptBtn.addEventListener('click', copyTranscript);
    downloadTranscriptBtn.addEventListener('click', downloadTranscript);

    const langToolbar = $('languageToolbar');
    if (langToolbar) {
      langToolbar.addEventListener('click', evt => {
        const btn = evt.target.closest('button[data-mode]');
        if (!btn) return;
        const newMode = btn.getAttribute('data-mode');
        if (!newMode) return;
        switchMode(newMode);
      });

      const activeBtn = langToolbar.querySelector(
        `button[data-mode="${modeKey}"]`
      );
      if (activeBtn) {
        activeBtn.classList.remove('btn-default');
        activeBtn.classList.add('btn-primary');
      }
    }

    const extraBtn = document.createElement('button');
    extraBtn.className = 'btn btn-default';
    extraBtn.textContent = 'Send test message';
    extraBtn.addEventListener('click', sendTestMessage);
    $('startBtn').parentNode.appendChild(extraBtn);

    if (modeConfig.lessonMode) {
      $('lessonActions').style.display = 'block';
      $('reportBtn').addEventListener('click', generateLessonReport);
      $('downloadReportBtn').addEventListener('click', downloadReport);

      analyzeBtnRef = document.createElement('button');
      analyzeBtnRef.className = 'btn btn-primary';
      analyzeBtnRef.textContent = 'Analyze speakers';
      analyzeBtnRef.addEventListener('click', analyzeSpeakers);
      $('lessonActions')
        .querySelector('.studio-toolbar')
        .appendChild(analyzeBtnRef);
      updateAnalyzeButtonState();
    }
  });

})(window);