(function (w) {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const modeKey = params.get('mode') || 'caption-en';
  const config = (w.SOTTOTITOLI_CONFIG && w.SOTTOTITOLI_CONFIG.modes[modeKey]) || w.SOTTOTITOLI_CONFIG.modes['caption-en'];

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let wsPublisher = null;
  let transcriptBuffer = [];

  function $(id) {
    return document.getElementById(id);
  }

  function randomRoom() {
    return Math.random().toString(36).slice(2, 10);
  }

  const room = params.get('room') || randomRoom();

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function appendLine(id, text) {
    const el = $(id);
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = text;
    el.prepend(div);
  }

  function updateOverlayLink() {
    const link = $('overlayLink');
    if (!link) return;
    link.href = `overlay.html?room=${encodeURIComponent(room)}`;
    link.textContent = link.href;
  }

  async function maybeTranslate(text) {
    if (!config.translate) return null;

    try {
      const providerConfig = window.CaptionTranslationProviders.resolveConfig(new URLSearchParams(window.location.search), {
        forceLocal: true
      });

      const result = await window.CaptionTranslationProviders.translateText(
        providerConfig,
        text,
        config.sourceLang,
        config.targetLang
      );

      return result ? result.translatedText : null;
    } catch (err) {
      return null;
    }
  }

  async function handleFinalTranscript(text) {
    transcriptBuffer.push(text);
    appendLine('sourceOutput', text);

    const payload = {
      type: 'caption',
      mode: modeKey,
      room: room,
      final: text,
      sourceLang: config.sourceLang
    };

    if (config.translate) {
      const translated = await maybeTranslate(text);
      if (translated) {
        appendLine('translatedOutput', translated);
        payload.translated = translated;
        payload.targetLang = config.targetLang;
      }
    }

    if (wsPublisher) wsPublisher.publish(payload);
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setText('statusText', 'Speech recognition is not supported in this browser.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.sourceLang;

    recognition.onstart = function () {
      setText('statusText', 'Listening...');
    };

    recognition.onresult = function (event) {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (!text) continue;

        if (event.results[i].isFinal) {
          setText('interimOutput', '');
          handleFinalTranscript(text);
        } else {
          interim += ' ' + text;
        }
      }

      if (interim.trim()) {
        setText('interimOutput', interim.trim());
        if (wsPublisher) {
          wsPublisher.publish({
            type: 'caption',
            mode: modeKey,
            room: room,
            interim: interim.trim(),
            sourceLang: config.sourceLang
          });
        }
      }
    };

    recognition.onerror = function (event) {
      setText('statusText', 'Speech error: ' + event.error);
    };

    recognition.onend = function () {
      setText('statusText', 'Stopped');
    };

    recognition.start();
  }

  function stopRecognition() {
    if (recognition) recognition.stop();
  }

  function connectSocket() {
    wsPublisher = createWSPublisher({
      url: window.SOTTOTITOLI_CONFIG.websocketUrl,
      room: room,
      onStateChange: function (state) {
        setText('socketStatus', state);
      }
    });
    wsPublisher.connect();
  }

  async function generateLessonReport() {
    const output = $('lessonReport');
    if (!output) return;

    const report = await window.SottotitoliLessonReport.generateLessonReport(transcriptBuffer.join(' '));
    output.textContent = JSON.stringify(report, null, 2);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setText('modeTitle', config.title);
    setText('modeMeta', config.lessonMode ? 'Lesson mode with report' : 'Live mode');
    updateOverlayLink();
    connectSocket();

    $('startBtn').addEventListener('click', startRecognition);
    $('stopBtn').addEventListener('click', stopRecognition);

    if (config.lessonMode) {
      $('lessonActions').style.display = 'block';
      $('reportBtn').addEventListener('click', generateLessonReport);
    }
  });
})(window);