(function (w) {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const modeKey = params.get('mode') || 'caption-en';
  const configRoot = w.SOTTOTITOLI_CONFIG || {};
  const modeConfig = (configRoot.modes && configRoot.modes[modeKey]) || configRoot.modes['caption-en'];

  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

  let recognition = null;
  let wsPublisher = null;
  let transcriptLines = [];
  let room = params.get('room') || w.SottotitoliSessionUtils.randomRoom();
  let latestReportText = '';
  let lastInterimSent = '';
  let shouldKeepListening = false;
  let restartTimer = null;
  let hasStartedOnce = false;

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function appendLine(targetId, text) {
    const box = $(targetId);
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
    if (!url.searchParams.has('v')) url.searchParams.set('v', '8');
    history.replaceState({}, '', url.toString());
  }

  function currentOverlayUrl() {
    const url = new URL('overlay.html', window.location.href);
    url.searchParams.set('room', room);
    url.searchParams.set('v', '8');
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
    const entry = {
      timestamp,
      text,
      translated: null
    };

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
      }
    } else {
      payload.translated = '';
    }

    transcriptLines.push(entry);
    updateStats();
    lastInterimSent = '';
    sendPayload(payload, 'Final caption sent to overlay.');
  }

  function handleInterimTranscript(text) {
    const clean = (text || '').trim();
    setText('interimOutput', clean);

    if (!clean) return;
    if (clean === lastInterimSent) return;
    lastInterimSent = clean;

    sendPayload({
      type: 'caption',
      room,
      mode: modeKey,
      interim: clean,
      sourceLang: modeConfig.sourceLang,
      kind: modeConfig.translate ? 'translation' : 'caption'
    }, 'Interim caption sent to overlay.');
  }

  function clearRestartTimer() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart(delay = 700) {
    clearRestartTimer();
    if (!shouldKeepListening) return;

    restartTimer = setTimeout(() => {
      try {
        if (recognition) {
          recognition.start();
        }
      } catch (e) {
        setText('statusText', 'Recognition restart waiting...');
        scheduleRestart(1200);
      }
    }, delay);
  }

  function buildRecognition() {
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = modeConfig.sourceLang || 'en-US';

    rec.onstart = function () {
      hasStartedOnce = true;
      setText('statusText', `Listening in ${modeConfig.sourceLang}...`);
      updateMicState('live', true);
    };

    rec.onresult = function (event) {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = (event.results[i][0] && event.results[i][0].transcript || '').trim();
        if (!text) continue;

        if (event.results[i].isFinal) {
          setText('interimOutput', '');
          handleFinalTranscript(text);
        } else {
          interim += ' ' + text;
        }
      }

      handleInterimTranscript(interim.trim());
    };

    rec.onerror = function (event) {
      const err = event.error || 'unknown';
      setText('statusText', `Speech error (${modeConfig.sourceLang}): ${err}`);

      if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
        shouldKeepListening = false;
        updateMicState('blocked', false);
        return;
      }

      updateMicState('recovering', false);
    };

    rec.onend = function () {
      updateMicState(shouldKeepListening ? 'restarting' : 'stopped', false);

      if (shouldKeepListening) {
        setText('statusText', hasStartedOnce
          ? 'Recognition ended, restarting...'
          : 'Recognition did not stay active, retrying...');
        scheduleRestart();
      } else {
        setText('statusText', 'Recognition stopped.');
      }
    };

    return rec;
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setText('statusText', 'Speech recognition is not supported in this browser.');
      return;
    }

    clearRestartTimer();
    shouldKeepListening = true;
    hasStartedOnce = false;

    if (!recognition) {
      recognition = buildRecognition();
    }

    try {
      recognition.start();
    } catch (e) {
      setText('statusText', 'Recognition start retrying...');
      scheduleRestart(900);
    }
  }

  function stopRecognition() {
    shouldKeepListening = false;
    clearRestartTimer();

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }

    updateMicState('stopped', false);
    setText('statusText', 'Recognition stopped by user.');
  }

  function connectSocket() {
    wsPublisher = w.createWSPublisher({
      url: w.SOTTOTITOLI_CONFIG.websocketUrl,
      room,
      onStateChange: function (state) {
        updateSocketState(state);
        setText('statusText', 'Socket state: ' + state + ' · room: ' + room);
      },
      onError: function (error) {
        setText('statusText', 'Socket error: ' + error);
      }
    });

    wsPublisher.connect();
  }

  async function generateLessonReport() {
    const report = await w.SottotitoliLessonReport.generateLessonReport(transcriptLines);
    latestReportText = w.SottotitoliLessonReport.formatLessonReport(report);
    setText('lessonReport', latestReportText);
  }

  async function copyOverlayLink() {
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(currentOverlayUrl());
    setText('statusText', ok ? 'Overlay link copied.' : 'Could not copy overlay link.');
  }

  async function copyTranscript() {
    const text = w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(text || 'No transcript yet.');
    setText('statusText', ok ? 'Transcript copied.' : 'Could not copy transcript.');
  }

  function downloadTranscript() {
    const text = w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    w.SottotitoliSessionUtils.downloadText(`sottotitoli-transcript-${room}.txt`, text || 'No transcript yet.');
    setText('statusText', 'Transcript downloaded.');
  }

  function downloadReport() {
    w.SottotitoliSessionUtils.downloadText(`sottotitoli-lesson-report-${room}.txt`, latestReportText || 'No report yet.');
    setText('statusText', 'Report downloaded.');
  }

  function openOverlay() {
    window.open(currentOverlayUrl(), '_blank', 'noopener');
  }

  function newRoom() {
    room = w.SottotitoliSessionUtils.randomRoom();
    updateRoomUI();
    if (wsPublisher) wsPublisher.disconnect();
    connectSocket();
    setText('statusText', 'New room created: ' + room);
  }

  function sendTestMessage() {
    sendPayload({
      type: 'caption',
      room,
      mode: modeKey,
      final: modeConfig.sourceLang === 'it-IT' ? 'Questo è un test.' : 'This is a test.',
      translated: modeConfig.translate
        ? (modeConfig.targetLang === 'it' ? 'Questo è un test.' : 'This is a test.')
        : '',
      timestamp: new Date().toISOString(),
      sourceLang: modeConfig.sourceLang,
      kind: modeConfig.translate ? 'translation' : 'caption'
    }, 'Test message sent to room: ' + room);
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
    setText('modeDescription', `${lesson} ${translation}`);
  }

  document.addEventListener('DOMContentLoaded', function () {
    describeMode();
    updateRoomUI();
    connectSocket();
    updateStats();

    $('startBtn').addEventListener('click', startRecognition);
    $('stopBtn').addEventListener('click', stopRecognition);
    $('openOverlayBtn').addEventListener('click', openOverlay);
    $('copyOverlayBtn').addEventListener('click', copyOverlayLink);
    $('newRoomBtn').addEventListener('click', newRoom);
    $('copyTranscriptBtn').addEventListener('click', copyTranscript);
    $('downloadTranscriptBtn').addEventListener('click', downloadTranscript);

    const extraBtn = document.createElement('button');
    extraBtn.className = 'btn ghost';
    extraBtn.textContent = 'Send test message';
    extraBtn.addEventListener('click', sendTestMessage);
    $('startBtn').parentNode.appendChild(extraBtn);

    if (modeConfig.lessonMode) {
      $('lessonActions').style.display = 'block';
      $('reportBtn').addEventListener('click', generateLessonReport);
      $('downloadReportBtn').addEventListener('click', downloadReport);
    }
  });
})(window);