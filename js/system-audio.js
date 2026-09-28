// ═══ Computer-audio source: transcribe what the COMPUTER is playing ═══
// A tab, a window or the whole screen — no driver, no install, no admin password. Chromium hands
// a page the audio of a shared surface through getDisplayMedia({ audio: true }).
//
// Why this cannot use SpeechRecognition: that API only ever reads the microphone, and there is no
// way to hand it a shared tab. So this source always rides the MediaRecorder → Whisper path in
// record-fallback.js (the one iOS already uses) and therefore spends server minutes — unlike live
// mic captioning, which is free and runs entirely in the browser.
//
// Safari and Firefox return no audio track from getDisplayMedia, so isSupported() is the only
// thing that decides whether the option is offered at all.
(function () {
  /* ⛔ PARKED 2026-09-28 — do not flip this to true without passing the re-entry criterion.
   *
   * The source works end to end locally (share → recorder → segments → upload), but the LIVE
   * endpoint rejects the audio: OpenAI answers 400 and transcribe-audio maps that to 502. The
   * prime suspect is the container — webm/Opus is the ONE format this endpoint has never handled,
   * because the iOS path always recorded mp4/AAC and every tuning constant in the function was
   * measured on m4a — but that is a hypothesis, not a diagnosis.
   *
   * RE-ENTRY CRITERION: a real tab share transcribes two consecutive sentences. The cheapest test
   * is to have the desktop recorder emit mp4/AAC (Chrome supports 'audio/mp4;codecs=mp4a.40.2'),
   * so the upload uses the container the endpoint has demonstrably handled. Passing that re-enables
   * this; failing it means the cause lies elsewhere, and the client now surfaces the server's
   * `detail` (OpenAI's own reason) to name it.
   *
   * Parking hides the menu entry — but hiding alone is NOT enough. S8tSource.get() coerces a
   * stored 'system' back to 'mic' while this is false, so nobody is left stranded in a mode they
   * can neither see nor leave, and toggleSession cannot keep reaching for getDisplayMedia. */
  var FEATURE_ENABLED = false;

  var S = {
    _share: null,   // the FULL share stream; see _release() for why it is kept around

    isSupported: function () {
      if (!FEATURE_ENABLED) return false;
      return !!(navigator.mediaDevices
        && typeof navigator.mediaDevices.getDisplayMedia === 'function'
        && window.RecordFallback
        && typeof window.RecordFallback.canRecord === 'function'
        && window.RecordFallback.canRecord());
    },

    /* Returns { ok: true } or { ok: false, reason }. The caller turns `reason` into a message.
     * NotAllowedError means the user DISMISSED the picker — that is a decision, not a failure,
     * and must never be reported as one. */
    start: async function () {
      if (!S.isSupported()) return { ok: false, reason: 'unsupported' };

      var share;
      try {
        share = await navigator.mediaDevices.getDisplayMedia({
          /* Chrome refuses an audio-only display request, so video:true is what makes the picker
           * appear. Its track is then carried but never read — see _release().
           * Voice-processing is switched OFF because this is not a voice: echo cancellation and
           * auto-gain mangle music, and the "echo" here is what the user MEANT to capture. */
          video: true,
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      } catch (e) {
        return { ok: false, reason: (e && e.name) || 'error' };
      }

      var audio = null;
      try { audio = share.getAudioTracks()[0]; } catch (e) {}
      if (!audio) {
        // In Chrome a "Window" and most full-screen choices carry no audio, and neither does a
        // tab whose audio was not shared. Say which choice works instead of leaving the user
        // with a session that is silently recording nothing.
        try { share.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        return { ok: false, reason: 'no-audio' };
      }

      S._share = share;

      /* The user can end the capture from the browser's own "Stop sharing" bar. Nothing else
       * tells the page, so without this the session would keep recording silence and still look
       * live — the exact failure shape this whole area has been fighting. */
      try {
        audio.addEventListener('ended', function () {
          if (typeof window.onSystemAudioEnded === 'function') window.onSystemAudioEnded();
        });
      } catch (e) {}

      // A NEW stream holding only the audio: MediaRecorder must never be handed the video track.
      var audioOnly = null;
      try { audioOnly = new MediaStream([audio]); } catch (e) { audioOnly = null; }
      if (!audioOnly) { S._release(); return { ok: false, reason: 'error' }; }

      var started = await window.RecordFallback.startWithStream(audioOnly, 'system');
      if (!started) { S._release(); return { ok: false, reason: 'recorder' }; }
      return { ok: true };
    },

    stop: function () {
      if (window.RecordFallback && typeof window.RecordFallback.isRecording === 'function'
        && window.RecordFallback.isRecording()) {
        return window.RecordFallback.stop();   // its _cleanup() calls _release()
      }
      S._release();
      return Promise.resolve();
    },

    /* ⚠️ The video track is deliberately NOT stopped when the share starts. In Chromium both
     * tracks belong to ONE capture session, and stopping the video track ends that session —
     * taking the audio with it, so the recorder would get a stream that dies immediately.
     * The video is therefore kept alive but never read, and the recorder is handed a separate
     * audio-only stream built from the audio track.
     *
     * Consequence to respect: the share stays open (and the "sharing your screen" bar stays
     * visible) until its tracks are stopped, so _release() must run on EVERY exit path —
     * including the credit-exhausted abort, which ends the session without a normal stop. */
    _release: function () {
      if (!S._share) return;
      try { S._share.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      S._share = null;
    }
  };
  window.S8tSystemAudio = S;
})();
