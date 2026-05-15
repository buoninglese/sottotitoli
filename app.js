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

  function currentOverlayUrl() {
    const url = new URL('overlay.html', window.location.href);
    url.searchParams.set('room', room);
    return url.toString();
  }

  function updateRoomUI() {
    setText('roomValue', room);
    const link = $('overlayLink');
    if (link) {
      link.href = currentOverlayUrl();
      link.textContent = currentOverlayUrl();
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

  async function publishPayload(payload) {
    if (!wsPublisher) return;
    wsPublisher.publish(payload);
    setText('statusText', 'Sent to websocket room.');
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
      sourceLang: modeConfig.sourceLang
    };

    if (modeConfig.translate) {
      const translated = await maybeTranslate(text);
      if (translated) {
        entry.translated = translated;
        appendLine('translatedOutput', translated);
        payload.translated = translated;
        payload.targetLang = modeConfig.targetLang;
      }
    }

    transcriptLines.push(entry);
    updateStats();
    await publishPayload(payload);
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setText('statusText', 'Speech recognition is not supported in this browser.');
      return;
    }

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = modeConfig.sourceLang || 'en-US';

    recognition.onstart = function () {
      setText('statusText', 'Listening...');
      updateMicState('live', true);
    };

    recognition.onresult = function (event) {
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

      const cleanInterim = interim.trim();
      setText('interimOutput', cleanInterim);

      if (cleanInterim && wsPublisher) {
        wsPublisher.publish({
          type: 'caption',
          room,
          mode: modeKey,
          interim: cleanInterim,
          sourceLang: modeConfig.sourceLang
        });
      }
    };

    recognition.onerror = function (event) {
      setText('statusText', 'Speech error: ' + event.error);
      updateMicState('error', false);
    };

    recognition.onend = function () {
      setText('statusText', 'Stopped');
      updateMicState('stopped', false);
    };

    recognition.start();
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    updateMicState('stopped', false);
  }

  function connectSocket() {
    wsPublisher = w.createWSPublisher({
      url: w.SOTTOTITOLI_CONFIG.websocketUrl,
      room,
      onStateChange: function (state) {
        updateSocketState(state);
        setText('statusText', 'Socket state: ' + state);
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
    setText('statusText', 'New room created.');
  }

  function sendTestMessage() {
    const payload = {
      type: 'caption',
      room,
      mode: modeKey,
      final: 'Test caption from Sottotitoli.',
      translated: modeConfig.translate ? 'Messaggio di test da Sottotitoli.' : '',
      timestamp: new Date().toISOString(),
      sourceLang: modeConfig.sourceLang
    };

    publishPayload(payload);
  }

  function describeMode() {
    const title = modeConfig.title || 'Sottotitoli Session';
    const lesson = modeConfig.lessonMode
      ? 'Lesson mode is active with report generation.'
      : 'Live mode is active with overlay publishing.';
    const translation = modeConfig.translate
      ? 'Translation mode is enabled.'
      : 'Captions only.';
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