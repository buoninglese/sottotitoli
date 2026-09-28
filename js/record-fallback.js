// ═══ Record → Transcribe fallback (iOS Safari has no SpeechRecognition) ═══
// Interval mode: tap to record — audio is transcribed in ~12s segments so
// sentences appear in the transcript WHILE you're still talking (semi-live),
// with a styled animated listening indicator that matches the desktop feel.
// Tap Stop → final flush → normal session save. Reuses _realMic.onFinal, so
// previous sentences, timestamps, stats and persistence work unchanged.
(function(){
  // Styled listening indicator (injected once)
  var st = document.createElement('style');
  st.textContent = '.rf-wave{display:inline-flex;align-items:flex-end;gap:3px;margin-right:10px;vertical-align:middle;height:20px}'
    + '.rf-wave i{width:3px;border-radius:2px;background:var(--cyan,#06b6d4);animation:rfW 1.1s ease-in-out infinite}'
    + '.rf-wave i:nth-child(1){animation-delay:0s}.rf-wave i:nth-child(2){animation-delay:.12s}.rf-wave i:nth-child(3){animation-delay:.24s}.rf-wave i:nth-child(4){animation-delay:.36s}.rf-wave i:nth-child(5){animation-delay:.48s}'
    + '.rf-wave.dim i{background:var(--muted2,#94a3b8);animation-duration:1.6s}'
    + '@keyframes rfW{0%,100%{height:6px}50%{height:20px}}'
    + '.rf-label{font-family:var(--font-ui,inherit);font-size:13px;color:var(--muted2,#94a3b8);font-weight:600;letter-spacing:.04em}';
  document.head.appendChild(st);

  var FB = {
    _stream: null,
    _recorder: null,
    _segment: [],
    _mime: '',
    _busy: false,
    _stopped: false,
    _interval: null,
    intervalSec: (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.recordIntervalSec) || 12,

    isNeeded: function(){
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      return !SR && !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    /* Two different questions, and the system-audio source needs the second one:
     *   isNeeded()  — MUST we use this instead of SpeechRecognition? (iOS/Safari: yes)
     *   canRecord() — CAN we record at all?
     * On desktop Chromium isNeeded() is false because SpeechRecognition exists, but that API can
     * only ever read the microphone — there is no way to hand it a shared tab. So computer audio
     * MUST come through here even on a browser that has an engine. Separating the two questions
     * is what lets one recorder serve both sources. */
    canRecord: function(){
      return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    // 'mic' (default) | 'system' — changes only how the UI describes itself.
    _source: 'mic',

    _pickMime: function(){
      var cands = ['audio/webm;codecs=opus','audio/webm','audio/mp4;codecs=mp4a.40.2','audio/mp4'];
      for (var i = 0; i < cands.length; i++) {
        try { if (window.MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch(e) {}
      }
      return '';
    },

    /* Guarded lookup: this file loads before the page's inline block (where S8T lives) and
     * js/i18n.js may not have loaded either. Falls back to the literal so the indicator can
     * never render blank. */
    _label: function(key, fallback){
      try { return (typeof S8T === 'function') ? S8T(key, fallback) : fallback; } catch (e) { return fallback; }
    },

    _showListening: function(){
      var it = document.getElementById('captionInterim');
      if (!it) return;
      var text = (this._source === 'system')
        ? this._label('rf_listening_system', 'Listening to computer audio…')
        : this._label('rf_listening', 'Listening…');
      it.innerHTML = '<span class="rf-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="rf-label">' + text + '</span>';
    },

    _showTranscribing: function(on){
      var it = document.getElementById('captionInterim');
      if (!it) return;
      if (on) {
        it.innerHTML = '<span class="rf-wave dim"><i></i><i></i><i></i><i></i><i></i></span><span class="rf-label">'
          + this._label('rf_transcribing', 'Transcribing…') + '</span>';
      } else if (!this._stopped) {
        this._showListening();
      }
    },

    start: async function(){
      if (this._recorder && this._recorder.state === 'recording') return true;
      // Same device choice as the desktop path — and, critically, the SAME FALLBACK. On iOS a
      // Bluetooth headset that walked out of range makes deviceId:{exact} throw, and without
      // this retry the recording simply never starts on the one platform that uses this file.
      var constraints = (typeof window.SottotitoliMicConstraints === 'function')
        ? window.SottotitoliMicConstraints()
        : { audio: true };
      try {
        this._stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (typeof _realMic !== 'undefined') _realMic.lastError = null;
      } catch(e) {
        if (constraints.audio && constraints.audio.deviceId) {
          console.warn('RecordFallback: chosen mic unavailable, using the system default:', e && e.name);
          if (typeof window.SottotitoliDropMicId === 'function') window.SottotitoliDropMicId();
          try {
            this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (typeof _realMic !== 'undefined') _realMic.lastError = null;
          } catch(e2) {
            console.error('RecordFallback mic denied:', e2);
            // Populated here too, so the busy-vs-denied copy is as accurate on iOS as the
            // platform allows. iOS reports contention differently — do not assume it fires.
            if (typeof _realMic !== 'undefined') _realMic.lastError = (e2 && e2.name) || null;
            if (typeof updateMicUI === 'function') updateMicUI('blocked');
            return false;
          }
        } else {
          console.error('RecordFallback mic denied:', e);
          if (typeof _realMic !== 'undefined') _realMic.lastError = (e && e.name) || null;
          if (typeof updateMicUI === 'function') updateMicUI('blocked');
          return false;
        }
      }
      if (typeof window.refreshMicList === 'function') window.refreshMicList();
      return this._begin(this._stream, 'mic');
    },

    /* Start from a stream the CALLER already owns. The system-audio source passes the audio track
     * of a getDisplayMedia() share here, so the recorder, the 12s segments, the Whisper upload,
     * the sentence replay and the session save are all reused untouched — the only difference is
     * where the audio came from. That reuse is the whole reason this source is cheap to add. */
    startWithStream: async function(stream, source){
      if (!stream) return false;
      if (this._recorder && this._recorder.state === 'recording') return true;
      return this._begin(stream, source || 'system');
    },

    isRecording: function(){
      return !!(this._recorder && this._recorder.state === 'recording');
    },

    /* The shared tail of both starts — everything that does not depend on where the audio
     * came from. Keeping it in ONE place is what guarantees the system source cannot drift
     * away from the mic source as this file changes. */
    _begin: function(stream, source){
      this._stream = stream;
      this._source = source || 'mic';
      this._mime = this._pickMime();
      this._segment = [];
      this._busy = false;
      this._txErrors = 0;   // consecutive failed segments — drives one-toast-per-run reporting
      this._txEmpty = 0;    // consecutive segments that came back with no words at all
      this._stopped = false;
      this._restartRec();
      if (!this._recorder) { this._cleanup(); return false; }
      if (typeof updateMicUI === 'function') {
        /* "Mic Live" is a lie on the computer-audio source. Pass the truthful label instead of
         * adding a second state to updateMicUI, which every other caller depends on. */
        updateMicUI('live', this._source === 'system'
          ? this._label('src_status_system', 'Computer audio') : null);
      }
      this._showListening();
      var self = this;
      /* 12s for BOTH sources. An earlier version of this used 6s for computer audio, on the
       * reasoning that the server meters by audio seconds (X-Audio-Seconds) so the smaller chunk
       * would cost the same. That reasoning covered COST but not REQUEST RATE: 6s doubles the
       * calls to transcribe-audio (10/min instead of 5/min), and that was changed without any
       * evidence the endpoint tolerates it. Until a rate limit can be ruled out, the value
       * already proven in production — the one the iOS path has always used — is the right
       * default. Overridable via SOTTOTITOLI_CONFIG.recordIntervalSec. */
      var sec = Math.max(6, parseInt(this.intervalSec, 10) || 12);
      this._interval = setInterval(function(){ self._flushSegment(false); }, sec * 1000);
      return true;
    },

    _restartRec: function(){
      if (this._stopped) return;
      try {
        this._recorder = this._mime
          ? new MediaRecorder(this._stream, { mimeType: this._mime })
          : new MediaRecorder(this._stream);
      } catch(e) { this._recorder = null; return; }
      var self = this;
      this._segStart = Date.now();
      this._recorder.ondataavailable = function(ev){ if (ev.data && ev.data.size) self._segment.push(ev.data); };
      try { this._recorder.start(1000); } catch(e) { this._recorder = null; }
    },

    // Stop the current recorder, ship its audio to Whisper, restart the
    // recorder immediately so the recording continues during transcription.
    _flushSegment: function(final){
      var self = this;
      if (self._busy) return Promise.resolve();
      self._busy = true;
      var seg = self._segment.slice();
      self._segment = [];
      return new Promise(function(resolve){
        var done = false;
        var fin = function(){ if (!done) { done = true; resolve(); } };
        if (self._recorder && self._recorder.state !== 'inactive') {
          self._recorder.onstop = function(){ fin(); };
          try { self._recorder.stop(); } catch(e) { fin(); }
          /* If onstop never fires, _busy stays TRUE for the rest of the session: every later tick
           * returns early, audio keeps piling up, and the page sits there looking healthy while
           * producing nothing at all. That is the same "everything looks fine, no text" shape as
           * the getUserMedia hang fixed earlier, so it gets the same treatment — a bound on the
           * wait. Without this, one missed event is an unrecoverable silent session. */
          setTimeout(fin, 4000);
        } else fin();
      }).then(function(){
        self._recorder = null;
        /* Measure the segment BEFORE _restartRec(), which resets _segStart for the next one.
         * Reading it afterwards meant the elapsed time was always ~0 and every segment was
         * clamped to 1 — the server was told a 12-second segment was ONE second long, and
         * metered and charged it as one. */
        var segSeconds = self._segStart
          ? Math.max(1, Math.round((Date.now() - self._segStart) / 1000))
          : null;
        self._segStart = null;
        if (!final && !self._stopped) self._restartRec();
        if (!seg.length) { self._busy = false; return; }
        var blob = null;
        try { blob = new Blob(seg, { type: self._mime || 'audio/webm' }); } catch(e) {}
        if (!blob) { self._busy = false; return; }
        self._showTranscribing(true);
        return self.transcribe(blob, window.currentCaptionLang, segSeconds).then(function(text){
          self._txErrors = 0;
          if (text) {
            self._txEmpty = 0;
            self.feedSentences(text);
          } else {
            /* Whisper returns an EMPTY string for silence, music and unintelligible audio. That is
             * not an error, so nothing was reported and nothing appeared. The microphone path
             * hides this because SpeechRecognition emits interim words constantly and the user
             * watches text move; here a silent segment looks exactly like a dead session. After
             * three in a row, say which of the two it is instead of leaving it ambiguous. */
            self._txEmpty = (self._txEmpty || 0) + 1;
            if (self._txEmpty === 3 && typeof showToast === 'function') {
              showToast(self._label('seg_no_speech', 'Arriva audio ma nessuna parola: controlla che la scheda condivida davvero l\'audio e che ci sia parlato.'), 'info', 11000);
            }
          }
          self._busy = false;
          if (!self._stopped) self._showTranscribing(false);
        }).catch(function(e){
          self._busy = false;
          /* 402 = the server refused to spend because the balance is gone. This used to fall
           * through to the console and KEEP RECORDING: every later segment was refused too,
           * the audio was discarded, and captions simply stopped appearing with no explanation
           * while the mic stayed live. End it instead — abort the recorder and let the page run
           * its normal Stop path, so the session is saved and the UI returns to stopped. */
          if (e && (e.status === 402 || e.code === 'NO_CREDITS')) {
            if (typeof self._abortForCredits === 'function') self._abortForCredits();
            return;
          }
          console.warn('segment transcribe failed:', e);
          /* This used to end at console.warn — invisible to anyone whose DevTools filter is on
           * Errors, and the session carried on looking perfectly healthy while producing nothing.
           * Report it, but only once per run, so a broken endpoint cannot toast every 12s. */
          self._txErrors = (self._txErrors || 0) + 1;
          if (self._txErrors === 2 && typeof showToast === 'function') {
            showToast(self._label('seg_failed', 'Trascrizione interrotta: ')
              + String((e && e.message) || e), 'error', 14000);
          }
          if (!self._stopped) self._showTranscribing(false);
          if (final) {
            if (typeof showToast === 'function') showToast(String(e.message || e), 'error');
            else alert(String(e.message || e));
          }
        });
      });
    },

    stop: function(){
      this._stopped = true;
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
      var self = this;
      var wait = function(){
        if (!self._busy) return Promise.resolve();
        return new Promise(function(res){
          var t = setInterval(function(){
            if (!self._busy) { clearInterval(t); res(); }
          }, 250);
        });
      };
      return wait()
        .then(function(){ return self._flushSegment(true); })
        .then(function(){ self._cleanup(); });
    },

    _cleanup: function(){
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
      if (this._stream) { try { this._stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e) {} this._stream = null; }
      this._recorder = null;
      this._segment = [];
      /* Stopping this._stream stops the AUDIO track only. On the computer-audio source the video
       * track lives in a separate share stream that is still open, and leaving it open would keep
       * the browser's "sharing your screen" bar on screen forever. */
      if (this._source === 'system' && window.S8tSystemAudio && typeof window.S8tSystemAudio._release === 'function') {
        window.S8tSystemAudio._release();
      }
      if (typeof updateMicUI === 'function') updateMicUI('idle');
      var interim = document.getElementById('captionInterim');
      if (interim) interim.textContent = '';
    },

    transcribe: async function(blob, lang, seconds){
      var url = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.transcribeAudioUrl)
        || 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/transcribe-audio';
      var token = null;
      try {
        if (window.sottotitoliSupabase) {
          var sr = await window.sottotitoliSupabase.auth.getSession();
          token = (sr && sr.data && sr.data.session) ? sr.data.session.access_token : null;
        }
      } catch(e) {}
      // The session id is what lets the server attribute the charge, so the
      // session save subtracts these minutes instead of billing them again.
      //
      // ⚠️ BOTH keys, and in this order. The caption room writes
      // 'sottotitoli-caption-session' (caption-s8t.html → _createCaptionRoom).
      // 'sottotitoli-active-session' is written only by _ensureSupabaseSession in
      // real-mic.js, which has no caller — so reading only that key meant this
      // header was ALWAYS empty on the iOS path, the one path it exists for.
      // Mirrors the lookup real-mic.js already uses for its sessionId.
      var sessionId = null;
      try {
        sessionId = localStorage.getItem('sottotitoli-caption-session')
          || localStorage.getItem('sottotitoli-active-session') || null;
      } catch(e) {}
      /* A BARE media type. MediaRecorder reports 'audio/webm;codecs=opus', and the server
       * forwards this header VERBATIM into the multipart part it uploads to OpenAI
       * (`new Blob([buf], { type: mime })`). A codec parameter that describes OUR encoder has no
       * business travelling to a different service's parser — and note that the webm/opus
       * combination is the one container this endpoint has never actually handled: the iOS path
       * always recorded mp4/AAC, so this branch shipped unexercised. */
      var bareMime = String(blob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      var headers = {
        'Content-Type': bareMime,
        'X-Lang': String(lang || 'en-US').split('-')[0],
        'Authorization': 'Bearer ' + (token || '')
      };
      if (seconds) headers['X-Audio-Seconds'] = String(seconds);
      if (sessionId) headers['X-Session-Id'] = sessionId;
      /* Bounded wait. A fetch with no timeout can hang for ever, and _busy would then stay true for
       * the rest of the session: the recorder keeps running, no further segment is ever sent, and
       * the UI shows no error at all. 30s is far beyond a normal Whisper round-trip. */
      var ctl = null, killTimer = null;
      try {
        if (typeof AbortController === 'function') {
          ctl = new AbortController();
          killTimer = setTimeout(function(){ try { ctl.abort(); } catch(e) {} }, 30000);
        }
      } catch(e) {}
      var resp;
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: blob,
          signal: ctl ? ctl.signal : undefined
        });
      } catch(e) {
        if (e && e.name === 'AbortError') {
          var to = new Error('Timeout: il server non ha risposto');
          to.status = 0;
          throw to;
        }
        throw e;
      } finally {
        if (killTimer) clearTimeout(killTimer);
      }
      if (!resp.ok) {
        var err = null;
        try { err = await resp.json(); } catch(e) {}
        var msg = err && err.error ? err.error : ('HTTP ' + resp.status);
        if (resp.status === 401) msg = 'Accesso richiesto: accedi per trascrivere su questo dispositivo.';
        /* `detail` is the UPSTREAM service's own message — OpenAI's verbatim reason for a 400
         * (an unsupported file format, a rejected language, a rejected keyword). The server has
         * ALWAYS returned it and the client has always thrown it away, which is why a 400 arrived
         * here as a bare "Whisper request failed (400)" with nothing to act on — while the answer
         * was sitting in the discarded field. Keep it: it is the diagnosis. */
        if (err && err.detail) msg += ' — ' + String(err.detail).slice(0, 220);
        // Carry the status + code so the caller can tell "this failed" from "you are out of
        // minutes" — they need opposite handling (retry vs end the session).
        var errObj = new Error(msg);
        errObj.status = resp.status;
        errObj.code = (err && err.code) || null;
        errObj.detail = (err && err.detail) || null;
        throw errObj;
      }
      var data = await resp.json();
      return (data && data.text) ? data.text : '';
    },

    // Split Whisper text into sentences and replay through the normal onFinal
    // pipeline (timestamps, contraction fix, _sessionLines, stats, save).
    feedSentences: function(text){
      var parts = String(text || '').split(/[.!?…]+/);
      for (var i = 0; i < parts.length; i++) {
        var s = parts[i].replace(/\s+/g, ' ').trim();
        if (s.length > 1 && _realMic && typeof _realMic.onFinal === 'function') _realMic.onFinal(s);
      }
    },

    /* Tear the recorder down because the balance is spent. Deliberately NOT stop(): that would
     * attempt a final flush, which the server would refuse again. Clearing _segment first means
     * the page's later stop() finds nothing to send, so there is no second refused request. */
    _abortForCredits: function(){
      this._stopped = true;
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
      if (this._recorder && this._recorder.state !== 'inactive') { try { this._recorder.stop(); } catch(e) {} }
      this._recorder = null;
      this._segment = [];
      if (this._stream) { try { this._stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e) {} this._stream = null; }
      // This path ends the session WITHOUT a normal stop(), so it is its own exit path and has to
      // close the screen share too — otherwise the browser keeps its sharing bar on screen.
      if (this._source === 'system' && window.S8tSystemAudio && typeof window.S8tSystemAudio._release === 'function') {
        window.S8tSystemAudio._release();
      }
      this._busy = false;
      this._showTranscribing(false);
      if (typeof window.onTranscriptionCreditsExhausted === 'function') window.onTranscriptionCreditsExhausted();
    }
  };
  window.RecordFallback = FB;
})();

