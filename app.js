// app.js

(function (w) {
  "use strict";

  var LANGUAGES = [
    { code: "en", label: "English", stt: "en-US" },
    { code: "it", label: "Italian", stt: "it-IT" },
    { code: "fr", label: "French", stt: "fr-FR" },
    { code: "de", label: "German", stt: "de-DE" }
  ];

  const params = new URLSearchParams(window.location.search);

  let modeKey = params.get("mode") || "caption-en";
  const configRoot =
    w.SOTTOTITOLI_CONFIG || w.SOTTOTITOLICONFIG || w.SottotitoliConfig || {};
  let modeConfig =
    (configRoot.modes && configRoot.modes[modeKey]) ||
    (configRoot.modes && configRoot.modes["caption-en"]) ||
    {};

  let room = params.get("room");
  if (!room && w.SottotitoliSessionUtils) {
    room = w.SottotitoliSessionUtils.randomRoom();
  }
  if (!room) room = "room-demo";

  function populateLanguageSelectsFromMode() {
    var srcSelect = document.getElementById("sourceLangSelect");
    var tgtSelect = document.getElementById("targetLangSelect");
    if (!srcSelect || !tgtSelect) return;

    srcSelect.innerHTML = "";
    tgtSelect.innerHTML = "";

    LANGUAGES.forEach(function (lang) {
      var opt1 = document.createElement("option");
      opt1.value = lang.code;
      opt1.textContent = lang.label;
      srcSelect.appendChild(opt1);

      var opt2 = document.createElement("option");
      opt2.value = lang.code;
      opt2.textContent = lang.label;
      tgtSelect.appendChild(opt2);
    });

    var parts = modeKey.split("-");
    if (parts[0] === "caption") {
      srcSelect.value = parts[1] || "en";
      tgtSelect.value = srcSelect.value;
    } else if (parts[0] === "translate") {
      srcSelect.value = parts[1] || "en";
      tgtSelect.value = parts[2] || "it";
    }
  }

  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
  const DIARIZE_URL =
    (configRoot.analysis && configRoot.analysis.speakerEndpoint) ||
    "https://sottotitoli-websocket.onrender.com/analyze-speakers";
  const SPEAKER_ANALYSIS_MARKER = "\n\n=== Speaker Analysis ===\n\n";

  let recognition = null;
  let wsPublisher = null;
  let transcriptLines = [];
  let latestReportText = "";
  let lastInterimSent = "";
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

  const sessionSupabase = window.sottotitoliSupabase;
  let currentSessionId = null;
  let currentSessionStart = null;

  // coalescing state: we keep one “current utterance” and update it
  let currentUtterance = null;

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
    el.textContent = placeholder || "";
    el.dataset.placeholderActive = "true";
  }

  function ensureBoxReady(id) {
    const el = $(id);
    if (!el) return null;
    if (el.dataset.placeholderActive === "true") {
      el.textContent = "";
      el.dataset.placeholderActive = "false";
    }
    return el;
  }

  function appendLine(targetId, text) {
    const box = ensureBoxReady(targetId);
    if (!box || !text) return;
    const div = document.createElement("div");
    div.className = "line";
    div.textContent = text;
    box.prepend(div);
  }

  function replaceTopLine(targetId, text) {
    const box = ensureBoxReady(targetId);
    if (!box) return;
    if (!text) {
      box.firstChild && box.removeChild(box.firstChild);
      return;
    }
    if (box.firstChild && box.firstChild.classList.contains("line")) {
      box.firstChild.textContent = text;
    } else {
      appendLine(targetId, text);
    }
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", modeKey);
    url.searchParams.set("room", room);
    url.searchParams.set("v", "12");
    history.replaceState({}, "", url.toString());
  }

  function currentOverlayUrl() {
    const url = new URL("overlay.html", window.location.href);
    url.searchParams.set("room", room);
    url.searchParams.set("v", "12");
    return url.toString();
  }

  function updateRoomUI() {
    syncUrl();
    setText("roomValue", room);
    const link = $("overlayLink");
    if (link) {
      const overlayUrl = currentOverlayUrl();
      link.href = overlayUrl;
      link.textContent = overlayUrl;
    }
  }

  function updateStats() {
    const plain = transcriptLines.map((x) => x.text).join(" ").trim();
    setText("statLines", String(transcriptLines.length));
    setText("statWords", String(w.SottotitoliSessionUtils.countWords(plain)));
    setText("statChars", String(plain.length));
  }

  function updateSocketState(state) {
    setText("socketStatus", state);
    const dot = $("socketDot");
    if (!dot) return;
    dot.classList.toggle("connected", state === "connected");
  }

  function updateMicState(stateText, live) {
    setText("micStatus", stateText);
    const dot = $("micDot");
    if (!dot) return;
    dot.classList.toggle("connected", !!live);
  }

  function updateAnalyzeButtonState() {
    if (!analyzeBtnRef) return;

    analyzeBtnRef.className = "btn btn-primary";
    analyzeBtnRef.style.opacity = "";
    analyzeBtnRef.style.cursor = "";
    analyzeBtnRef.style.background = "";
    analyzeBtnRef.style.border = "";
    analyzeBtnRef.style.color = "";

    if (speakerAnalysisCompleted) {
      analyzeBtnRef.disabled = true;
      analyzeBtnRef.textContent = "Speaker analysis completed";
      analyzeBtnRef.style.background = "#16a34a";
      analyzeBtnRef.style.border = "1px solid #16a34a";
      analyzeBtnRef.style.color = "#ffffff";
      analyzeBtnRef.style.opacity = "1";
      analyzeBtnRef.style.cursor = "not-allowed";
      return;
    }

    if (isAnalyzingSpeakers) {
      analyzeBtnRef.disabled = true;
      analyzeBtnRef.textContent = "Analyzing speakers...";
      analyzeBtnRef.style.background = "#d97706";
      analyzeBtnRef.style.border = "1px solid #d97706";
      analyzeBtnRef.style.color = "#ffffff";
      analyzeBtnRef.style.opacity = "1";
      analyzeBtnRef.style.cursor = "progress";
      return;
    }

    analyzeBtnRef.disabled = false;
    analyzeBtnRef.textContent = "Analyze speakers";
    analyzeBtnRef.style.background = "#2563eb";
    analyzeBtnRef.style.border = "1px solid #2563eb";
    analyzeBtnRef.style.color = "#ffffff";
  }

  function removeExistingSpeakerAnalysis(reportText) {
    if (!reportText) return reportText;
    const markerIndex = reportText.indexOf(SPEAKER_ANALYSIS_MARKER);
    if (markerIndex === -1) return reportText.trim();
    return reportText.slice(0, markerIndex).trim();
  }

  async function maybeTranslate(text) {
    if (!modeConfig || !modeConfig.translate) return null;
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
      setText("statusText", "Translation error: " + err.message);
      return null;
    }
  }

  function sendPayload(payload, statusMessage) {
    if (!wsPublisher) {
      setText("statusText", "No websocket publisher available.");
      return;
    }
    wsPublisher.publish(payload);
    if (statusMessage) setText("statusText", statusMessage);
  }

  function annotateLineWithNgsl(text) {
    if (!w.LEMMA_POS_MAP || !text) return null;

    const tokens = text.split(/\s+/);
    return tokens.map((token) => {
      const surface = token;
      const lemmaKey = surface.toLowerCase().replace(/[^a-z']/g, "");
      if (!lemmaKey) {
        return {
          surface,
          lemmaKey: null,
          inNgsl: false
        };
      }
      const inNgsl = !!w.LEMMA_POS_MAP[lemmaKey];
      return {
        surface,
        lemmaKey,
        inNgsl
      };
    });
  }

  async function commitUtteranceFinal(text) {
    if (!text) return;
    const timestamp = w.SottotitoliSessionUtils.formatTimestamp(new Date());

    // If we already have a current utterance, update its text instead of pushing a new entry
    if (currentUtterance) {
      currentUtterance.text = text;
    } else {
      currentUtterance = {
        timestamp,
        text,
        translated: null,
        learning: annotateLineWithNgsl(text)
      };
      transcriptLines.push(currentUtterance);
    }

    replaceTopLine("sourceOutput", text);

    const payload = {
      type: "caption",
      room,
      mode: modeKey,
      final: text,
      timestamp,
      sourceLang: modeConfig ? modeConfig.sourceLang : "en-US",
      kind: modeConfig && modeConfig.translate ? "translation" : "caption"
    };

    if (modeConfig && modeConfig.translate) {
      const translated = await maybeTranslate(text);
      if (translated) {
        currentUtterance.translated = translated;
        replaceTopLine("translatedOutput", translated);
        payload.translated = translated;
        payload.targetLang = modeConfig.targetLang;
      }
    }

    updateStats();
    lastInterimSent = "";
    clearBox("interimOutput", "Interim");

    sendPayload(payload, "Final caption sent to overlay.");

    // Start a fresh utterance for the next sentence
    currentUtterance = null;
  }

  function handleInterimTranscript(text) {
    const clean = (text || "").trim();
    const interimBox = $("interimOutput");
    if (!interimBox) return;
    if (!clean) {
      clearBox("interimOutput", "Interim");
      return;
    }
    interimBox.textContent = clean;
    interimBox.dataset.placeholderActive = "false";

    if (clean === lastInterimSent) return;
    lastInterimSent = clean;

    sendPayload(
      {
        type: "caption",
        room,
        mode: modeKey,
        interim: clean,
        sourceLang: modeConfig ? modeConfig.sourceLang : "en-US",
        kind: modeConfig && modeConfig.translate ? "translation" : "caption"
      },
      "Interim caption sent to overlay."
    );
  }

  function clearRestartTimer() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
  }

  function scheduleRestart(delay) {
    clearRestartTimer();
    if (!shouldKeepListening) return;
    restartTimer = setTimeout(function () {
      try {
        if (recognition) recognition.start();
      } catch (e) {
        setText("statusText", "Recognition restart waiting...");
        scheduleRestart(1200);
      }
    }, delay || 700);
  }

  function buildRecognition() {
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (modeConfig && modeConfig.sourceLang) || "en-US";

    rec.onstart = function () {
      hasStartedOnce = true;
      setText(
        "statusText",
        "Listening in " + ((modeConfig && modeConfig.sourceLang) || "en-US")
      );
      updateMicState("live", true);
    };

    rec.onresult = function (event) {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0].transcript.trim();
        if (!text) continue;

        if (res.isFinal) {
          // Coalesce: treat the whole utterance as one line
          commitUtteranceFinal(text);
        } else {
          interim = text;
        }
      }
      handleInterimTranscript(interim.trim());
    };

    rec.onerror = function (event) {
      const err = event.error || "unknown";
      setText(
        "statusText",
        "Speech error (" +
          ((modeConfig && modeConfig.sourceLang) || "en-US") +
          "): " +
          err
      );
      if (
        err === "not-allowed" ||
        err === "service-not-allowed" ||
        err === "audio-capture"
      ) {
        shouldKeepListening = false;
        updateMicState("blocked", false);
        return;
      }
      updateMicState("recovering", false);
    };

    rec.onend = function () {
      updateMicState(shouldKeepListening ? "restarting" : "stopped", false);
      if (shouldKeepListening) {
        setText(
          "statusText",
          hasStartedOnce
            ? "Recognition ended, restarting..."
            : "Recognition did not stay active, retrying..."
        );
        scheduleRestart();
      } else {
        setText("statusText", "Recognition stopped.");
      }
    };

    return rec;
  }

  async function startAudioCapture() {
    if (audioRecorder && audioRecorder.state === "recording") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setText("statusText", "Audio recording is not supported in this browser.");
      return;
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      lastAudioBlob = null;
      speakerAnalysisCompleted = false;
      isAnalyzingSpeakers = false;
      updateAnalyzeButtonState();

      let mimeType;
      if (
        w.MediaRecorder &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ) {
        mimeType = "audio/webm;codecs=opus";
      } else if (
        w.MediaRecorder &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        mimeType = "audio/webm";
      }

      audioRecorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      audioRecorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      audioRecorder.onstop = function () {
        const actualType = audioRecorder.mimeType || "audio/webm";
        lastAudioBlob = new Blob(audioChunks, { type: actualType });
        isRecordingAudio = false;

        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop());
          audioStream = null;
        }

        setText(
          "statusText",
          lastAudioBlob.size > 0
            ? "Lesson audio captured and ready for speaker analysis."
            : "Recording stopped, but no audio was captured."
        );
      };

      audioRecorder.start();
      isRecordingAudio = true;
      setText(
        "statusText",
        "Recording lesson audio for later speaker analysis..."
      );
    } catch (err) {
      setText("statusText", "Could not start audio capture: " + err.message);
    }
  }

  function stopAudioCapture() {
    if (!audioRecorder || audioRecorder.state !== "recording") return;
    try {
      audioRecorder.stop();
    } catch (err) {
      setText("statusText", "Could not stop audio recorder: " + err.message);
    }
  }

  async function startRecognition() {
    if (!SpeechRecognition) {
      setText(
        "statusText",
        "Speech recognition is not supported in this browser."
      );
      return;
    }

    clearRestartTimer();
    shouldKeepListening = true;
    hasStartedOnce = false;
    currentUtterance = null;

    if (!recognition) recognition = buildRecognition();

    try {
      recognition.start();
      startAudioCapture();
      await createSessionRow();
    } catch (e) {
      setText("statusText", "Recognition start retrying...");
      scheduleRestart(900);
    }
  }

  function stopRecognition() {
    shouldKeepListening = false;
    clearRestartTimer();
    currentUtterance = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    stopAudioCapture();
    updateMicState("stopped", false);
    setText("statusText", "Recognition stopped by user.");
    finalizeSessionRow();
  }

  function connectSocket() {
    const cfgRoot =
      w.SOTTOTITOLI_CONFIG ||
      w.SOTTOTITOLICONFIG ||
      w.SottotitoliConfig ||
      configRoot ||
      {};

    const wsUrl = cfgRoot.websocketUrl || cfgRoot.websocket_url || "";

    if (!wsUrl) {
      console.warn("No websocket URL configured in SOTTOTITOLI_CONFIG.");
      setText("statusText", "No websocket URL configured.");
      return;
    }

    wsPublisher = w.createWSPublisher({
      url: wsUrl,
      room,
      onStateChange(state) {
        updateSocketState(state);
        setText(
          "statusText",
          "Socket state: " + state + " (room " + room + ")"
        );
      },
      onError(error) {
        setText("statusText", "Socket error: " + error);
      }
    });

    wsPublisher.connect();
  }

  async function generateLessonReport() {
    try {
      const report =
        await w.SottotitoliLessonReport.generateLessonReport(transcriptLines);
      latestReportText =
        w.SottotitoliLessonReport.formatLessonReport(report);
      latestReportText =
        removeExistingSpeakerAnalysis(latestReportText);
      setText("lessonReport", latestReportText || "No report yet.");
      setText("statusText", "Lesson report generated.");
    } catch (e) {
      setText("statusText", "Could not generate report: " + e.message);
    }
  }

  async function copyOverlayLink() {
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(
      currentOverlayUrl()
    );
    setText(
      "statusText",
      ok ? "Overlay link copied." : "Could not copy overlay link."
    );
  }

  async function copyTranscript() {
    const text =
      w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    if (!text) {
      setText("statusText", "No transcript yet.");
      return;
    }
    const ok = await w.SottotitoliSessionUtils.copyToClipboard(text);
    setText(
      "statusText",
      ok ? "Transcript copied." : "Could not copy transcript."
    );
  }

  function downloadTranscript() {
    const text =
      w.SottotitoliSessionUtils.transcriptToPlainText(transcriptLines);
    if (!text) {
      setText("statusText", "No transcript yet.");
      return;
    }
    w.SottotitoliSessionUtils.downloadText(
      "sottotitoli-transcript-" + room + ".txt",
      text
    );
    setText("statusText", "Transcript downloaded.");
  }

  function downloadReport() {
    if (!latestReportText) {
      setText("statusText", "No report yet.");
      return;
    }
    w.SottotitoliSessionUtils.downloadText(
      "sottotitoli-lesson-report-" + room + ".txt",
      latestReportText
    );
    setText("statusText", "Report downloaded.");
  }

  function openOverlay() {
    window.open(currentOverlayUrl(), "_blank", "noopener");
  }

  function newRoom() {
    room = w.SottotitoliSessionUtils.randomRoom();
    transcriptLines = [];
    latestReportText = "";
    lastInterimSent = "";
    audioChunks = [];
    lastAudioBlob = null;
    isAnalyzingSpeakers = false;
    speakerAnalysisCompleted = false;
    currentUtterance = null;
    updateAnalyzeButtonState();
    clearBox("interimOutput", "Interim");
    clearBox("sourceOutput", "Source output");
    clearBox("translatedOutput", "Translated output");
    setText("lessonReport", "No report yet.");
    updateStats();
    updateRoomUI();
    if (wsPublisher) {
      wsPublisher.disconnect();
      connectSocket();
    }
    setText("statusText", "New room created: " + room);
  }

  function sendTestMessage() {
    const useIt =
      modeConfig && modeConfig.sourceLang === "it-IT";
    const finalText = useIt
      ? "Questo è un test. This is a test."
      : "This is a test.";
    const translated =
      modeConfig && modeConfig.translate
        ? modeConfig.targetLang === "it"
          ? "Questo è un test. This is a test."
          : "This is a test."
        : null;
    sendPayload(
      {
        type: "caption",
        room,
        mode: modeKey,
        final: finalText,
        translated,
        timestamp: new Date().toISOString(),
        sourceLang: modeConfig ? modeConfig.sourceLang : "en-US",
        kind: modeConfig && modeConfig.translate ? "translation" : "caption"
      },
      "Test message sent to room " + room
    );
  }

  function formatDiarizationResult(data) {
    if (!data) return "No speaker analysis result returned.";
    const lines = [];

    if (typeof data.text === "string" && data.text.trim()) {
      lines.push("Transcript");
      lines.push(data.text.trim());
      lines.push("");
    }

    if (data.analytics) {
      lines.push("Speaker summary...");
      if (
        Array.isArray(data.analytics.speakers) &&
        data.analytics.speakers.length
      ) {
        data.analytics.speakers.forEach((speaker, index) => {
          const share =
            speaker.shareOfTime != null
              ? Math.round(Number(speaker.shareOfTime) * 100)
              : 0;
          lines.push(
            (index + 1) +
              ". " +
              speaker.speaker +
              " — turns " +
              speaker.turns +
              ", words " +
              speaker.words +
              ", duration " +
              Number(speaker.duration || 0).toFixed(1) +
              "s, share " +
              share +
              "%"
          );
        });
      }
      if (data.analytics.interruptions != null) {
        lines.push("");
        lines.push("Interruptions: " + data.analytics.interruptions);
      }
      if (data.analytics.totalDuration != null) {
        lines.push(
          "Total duration: " +
            Number(data.analytics.totalDuration).toFixed(1) +
            "s"
        );
      }
      lines.push("");
    }

    const segments = Array.isArray(data.segments) ? data.segments : [];
    if (segments.length) {
      lines.push("Segments");
      segments.forEach((seg, index) => {
        const speaker = seg.speaker || "Unknown speaker";
        const start =
          seg.start != null ? Number(seg.start).toFixed(1) : "?";
        const end =
          seg.end != null ? Number(seg.end).toFixed(1) : "?";
        const text = (seg.text || "").trim();
        lines.push(
          (index + 1) +
            ". " +
            speaker +
            " " +
            start +
            "s - " +
            end +
            "s"
        );
        if (text) lines.push(text);
        lines.push("");
      });
    }

    return lines.join("\n").trim() || JSON.stringify(data, null, 2);
  }

  async function analyzeSpeakers() {
    if (speakerAnalysisCompleted) {
      setText(
        "statusText",
        "Speaker analysis has already been completed for this session."
      );
      return;
    }

    if (isAnalyzingSpeakers) {
      setText("statusText", "Speaker analysis is already running.");
      return;
    }

    if (isRecordingAudio) {
      setText(
        "statusText",
        "Stop the microphone first so the lesson recording can finish."
      );
      return;
    }

    if (!lastAudioBlob || !lastAudioBlob.size) {
      setText(
        "statusText",
        "No recorded lesson audio is available yet. Start and stop a session first."
      );
      return;
    }

    isAnalyzingSpeakers = true;
    updateAnalyzeButtonState();
    setText(
      "statusText",
      "Uploading lesson audio for speaker analysis..."
    );

    try {
      const ext =
        lastAudioBlob.type &&
        lastAudioBlob.type.indexOf("ogg") !== -1
          ? "ogg"
          : "webm";
      const formData = new FormData();
      formData.append("file", lastAudioBlob, "lesson-" + room + "." + ext);
      formData.append("room", room);
      formData.append("mode", modeKey);
      formData.append(
        "sourceLang",
        modeConfig ? modeConfig.sourceLang : "en-US"
      );

      const response = await fetch(DIARIZE_URL, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          "Speaker analysis failed with status " +
            response.status +
            ": " +
            errorText
        );
      }

      const data = await response.json();
      const diarizationText = formatDiarizationResult(data);

      let baseReport = removeExistingSpeakerAnalysis(latestReportText);
      if (!baseReport) {
        baseReport =
          "No report yet.\n\nLesson Report (written lesson report not generated yet).";
      }

      latestReportText =
        baseReport + SPEAKER_ANALYSIS_MARKER + diarizationText + "\n";
      setText("lessonReport", latestReportText);
      speakerAnalysisCompleted = true;
      setText("statusText", "Speaker analysis completed.");
    } catch (err) {
      setText("statusText", "Speaker analysis failed: " + err.message);
    } finally {
      isAnalyzingSpeakers = false;
      updateAnalyzeButtonState();
    }
  }

  function describeMode() {
    const cfg = modeConfig || {};
    const title = cfg.title || "Sottotitoli Session";

    const lesson = cfg.lessonMode
      ? "Lesson mode is active with report generation."
      : "Live mode is active with overlay publishing.";

    const translation = cfg.translate
      ? "Translation mode is enabled."
      : "Caption mode is enabled.";

    setText("modeTitle", title);
    setText("modeDescription", lesson + " " + translation);
  }

  function getCurrentModeKeyFromSelects() {
    var srcSelect = document.getElementById("sourceLangSelect");
    var tgtSelect = document.getElementById("targetLangSelect");
    if (!srcSelect || !tgtSelect) return modeKey;

    var src = srcSelect.value;
    var tgt = tgtSelect.value;

    if (!src || !tgt) return modeKey;

    if (src === tgt) {
      return "caption-" + src;
    }
    return "translate-" + src + "-" + tgt;
  }

  function updateModeFromUI() {
    modeKey = getCurrentModeKeyFromSelects();
    const cfgRoot =
      w.SOTTOTITOLI_CONFIG ||
      w.SOTTOTITOLICONFIG ||
      w.SottotitoliConfig ||
      configRoot;
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
    url.searchParams.set("mode", mode);
    window.location.href = url.toString();
  }

  function computeNgslCoverage(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return null;
    let total = 0;
    let inNgsl = 0;

    lines.forEach((line) => {
      const tokens = Array.isArray(line.learning) ? line.learning : [];
      tokens.forEach((t) => {
        if (!t || !t.lemmaKey) return;
        total += 1;
        if (t.inNgsl) inNgsl += 1;
      });
    });

    if (total === 0) return null;
    return inNgsl / total;
  }

  // Simple metrics helpers (stubs if not defined elsewhere)
  function computeSentencesCount(text) {
    if (!text) return 0;
    return (text.match(/[.!?]/g) || []).length || 1;
  }

  function computeFillersCount(text) {
    if (!text) return 0;
    const fillers = ["uh", "um", "eh", "like", "you know"];
    const lower = text.toLowerCase();
    let count = 0;
    fillers.forEach((f) => {
      const re = new RegExp("\\b" + f.replace(" ", "\\s+") + "\\b", "g");
      const matches = lower.match(re);
      if (matches) count += matches.length;
    });
    return count;
  }

  function computeUniqueWordsCount(text) {
    if (!text) return 0;
    const tokens = text
      .toLowerCase()
      .match(/[a-z']+/g);
    if (!tokens) return 0;
    return new Set(tokens).size;
  }

  function computeQualityScore(metrics) {
    const { wpm, fillersPerMinute, lexicalDiversity } = metrics;
    let score = 0;
    if (wpm != null && wpm >= 80 && wpm <= 170) score += 0.4;
    if (fillersPerMinute != null && fillersPerMinute < 4) score += 0.3;
    if (lexicalDiversity != null && lexicalDiversity > 0.35) score += 0.3;
    return score;
  }

  async function createSessionRow() {
    try {
      const result = await sessionSupabase.auth.getSession();
      const sessionData = result.data;
      const sessionError = result.error;

      if (sessionError || !sessionData || !sessionData.session) {
        console.warn("No Supabase session; not logging Sottotitoli session.");
        return;
      }

      const user = sessionData.session.user;
      const userId = user.id;

      currentSessionStart = new Date();

      const languagePair =
        modeKey.startsWith("translate-")
          ? modeKey.replace("translate-", "").replace("-", "->")
          : "en-en";

      const sessionType = "solo";
      const topicTag = null;

      const { data, error } = await sessionSupabase
        .from("sessions")
        .insert({
          userid: userId,
          room,
          mode: modeKey,
          startedat: currentSessionStart.toISOString(),
          languagepair: languagePair,
          sessiontype: sessionType,
          topictag: topicTag
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating session row:", error);
        return;
      }

      currentSessionId = data.id;
    } catch (e) {
      console.error("Unexpected error creating session row:", e);
    }
  }

  async function finalizeSessionRow() {
    if (!currentSessionId || !currentSessionStart) return;

    try {
      const ended = new Date();
      const durationSeconds = Math.round(
        (ended.getTime() - currentSessionStart.getTime()) / 1000
      );

      const plain = transcriptLines.map((x) => x.text).join(" ").trim();
      const wordsCount =
        w.SottotitoliSessionUtils.countWords(plain);
      const charsCount = plain.length;

      const wpm =
        durationSeconds > 0 ? (wordsCount * 60) / durationSeconds : null;

      const sentencesCount = computeSentencesCount(plain);
      const avgSentenceLength =
        sentencesCount > 0 ? wordsCount / sentencesCount : null;

      const fillersCount = computeFillersCount(plain);
      const fillersPerMinute =
        durationSeconds > 0 ? (fillersCount * 60) / durationSeconds : null;

      const uniqueWordsCount = computeUniqueWordsCount(plain);
      const lexicalDiversity =
        wordsCount > 0 ? uniqueWordsCount / wordsCount : null;

      const qualityScore = computeQualityScore({
        wpm,
        fillersPerMinute,
        lexicalDiversity
      });

      const ngslCoverage = computeNgslCoverage(transcriptLines);

      const updatePayload = {
        endedat: ended.toISOString(),
        durationseconds: durationSeconds,
        wordscount: wordsCount,
        charscount: charsCount,
        wpm,
        sentencescount: sentencesCount,
        avgsentencelengthwords: avgSentenceLength,
        fillerscount: fillersCount,
        fillersperminute: fillersPerMinute,
        uniquewordscount: uniqueWordsCount,
        lexicaldiversity: lexicalDiversity,
        qualityscore: qualityScore,
        ngslcoverage: ngslCoverage
      };

      const { error } = await sessionSupabase
        .from("sessions")
        .update(updatePayload)
        .eq("id", currentSessionId);

      if (error) {
        console.error("Error updating session row:", error);
      }
    } catch (e) {
      console.error("Unexpected error updating session row:", e);
    } finally {
      currentSessionId = null;
      currentSessionStart = null;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    try {
      populateLanguageSelectsFromMode();
      describeMode();
      updateRoomUI();
    } catch (e) {
      console.error("Mode initialisation error:", e);
    }

    connectSocket();
    updateStats();
    clearBox("interimOutput", "Interim");
    clearBox("sourceOutput", "Source output");
    clearBox("translatedOutput", "Translated output");

    var srcSelect = document.getElementById("sourceLangSelect");
    var tgtSelect = document.getElementById("targetLangSelect");
    if (srcSelect && tgtSelect) {
      srcSelect.addEventListener("change", () => {
        updateModeFromUI();
        if (recognition) {
          stopRecognition();
          startRecognition();
        }
      });
      tgtSelect.addEventListener("change", () => {
        updateModeFromUI();
        if (recognition) {
          stopRecognition();
          startRecognition();
        }
      });
      var applyBtn = document.getElementById("applyLangModeBtn");
      if (applyBtn) {
        applyBtn.addEventListener("click", goToSelectedModePage);
      }
    }

    const startBtn = $("startBtn");
    const stopBtn = $("stopBtn");
    const openOverlayBtn = $("openOverlayBtn");
    const copyOverlayBtn = $("copyOverlayBtn");
    const newRoomBtn = $("newRoomBtn");
    const copyTranscriptBtn = $("copyTranscriptBtn");
    const downloadTranscriptBtn = $("downloadTranscriptBtn");
    const reportBtn = $("reportBtn");
    const downloadReportBtn = $("downloadReportBtn");
    const lessonActions = $("lessonActions");
    const languageToolbar = $("languageToolbar");

    if (startBtn) startBtn.addEventListener("click", startRecognition);
    if (stopBtn) stopBtn.addEventListener("click", stopRecognition);
    if (openOverlayBtn) openOverlayBtn.addEventListener("click", openOverlay);
    if (copyOverlayBtn)
      copyOverlayBtn.addEventListener("click", copyOverlayLink);
    if (newRoomBtn) newRoomBtn.addEventListener("click", newRoom);
    if (copyTranscriptBtn)
      copyTranscriptBtn.addEventListener("click", copyTranscript);
    if (downloadTranscriptBtn)
      downloadTranscriptBtn.addEventListener("click", downloadTranscript);

    if (languageToolbar) {
      languageToolbar.addEventListener("click", function (evt) {
        const btn = evt.target.closest("button[data-mode]");
        if (!btn) return;
        const newMode = btn.getAttribute("data-mode");
        if (!newMode) return;
        const url = new URL(window.location.href);
        url.searchParams.set("mode", newMode);
        window.location.href = url.toString();
      });
      const activeBtn = languageToolbar.querySelector(
        "button[data-mode='" + modeKey + "']"
      );
      if (activeBtn) {
        activeBtn.classList.remove("btn-default");
        activeBtn.classList.add("btn-primary");
      }
      const extraBtn = document.createElement("button");
      extraBtn.className = "btn btn-default";
      extraBtn.textContent = "Send test message";
      if (startBtn && startBtn.parentNode) {
        startBtn.parentNode.appendChild(extraBtn);
      }
      extraBtn.addEventListener("click", sendTestMessage);
    }

    if (modeConfig && modeConfig.lessonMode && lessonActions) {
      lessonActions.style.display = "block";
      if (reportBtn)
        reportBtn.addEventListener("click", generateLessonReport);
      if (downloadReportBtn)
        downloadReportBtn.addEventListener("click", downloadReport);

      analyzeBtnRef = document.createElement("button");
      analyzeBtnRef.className = "btn btn-primary";
      analyzeBtnRef.textContent = "Analyze speakers";
      analyzeBtnRef.addEventListener("click", analyzeSpeakers);
      const toolbar = lessonActions.querySelector(".studio-toolbar");
      if (toolbar) toolbar.appendChild(analyzeBtnRef);
      updateAnalyzeButtonState();
    }
  });

  w.SottotitoliApp = {
    startRecognition,
    stopRecognition,
    newRoom
  };
})(window);
