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

    _pickMime: function(){
      var cands = ['audio/webm;codecs=opus','audio/webm','audio/mp4;codecs=mp4a.40.2','audio/mp4'];
      for (var i = 0; i < cands.length; i++) {
        try { if (window.MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch(e) {}
      }
      return '';
    },

    _showListening: function(){
      var it = document.getElementById('captionInterim');
      if (it) it.innerHTML = '<span class="rf-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="rf-label">Listening…</span>';
    },

    _showTranscribing: function(on){
      var it = document.getElementById('captionInterim');
      if (!it) return;
      if (on) {
        it.innerHTML = '<span class="rf-wave dim"><i></i><i></i><i></i><i></i><i></i></span><span class="rf-label">Transcribing…</span>';
      } else if (!this._stopped) {
        this._showListening();
      }
    },

    start: async function(){
      if (this._recorder && this._recorder.state === 'recording') return true;
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch(e) {
        console.error('RecordFallback mic denied:', e);
        if (typeof updateMicUI === 'function') updateMicUI('blocked');
        return false;
      }
      this._mime = this._pickMime();
      this._segment = [];
      this._busy = false;
      this._stopped = false;
      this._restartRec();
      if (!this._recorder) { this._cleanup(); return false; }
      if (typeof updateMicUI === 'function') updateMicUI('live');
      this._showListening();
      var self = this;
      var sec = Math.max(6, parseInt(self.intervalSec, 10) || 12);
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
        if (self._recorder && self._recorder.state !== 'inactive') {
          self._recorder.onstop = function(){ resolve(); };
          try { self._recorder.stop(); } catch(e) { resolve(); }
        } else resolve();
      }).then(function(){
        self._recorder = null;
        if (!final && !self._stopped) self._restartRec();
        if (!seg.length) { self._busy = false; return; }
        var blob = null;
        try { blob = new Blob(seg, { type: self._mime || 'audio/webm' }); } catch(e) {}
        if (!blob) { self._busy = false; return; }
        self._showTranscribing(true);
        return self.transcribe(blob, window.currentCaptionLang).then(function(text){
          if (text) self.feedSentences(text);
          self._busy = false;
          if (!self._stopped) self._showTranscribing(false);
        }).catch(function(e){
          console.warn('segment transcribe failed:', e);
          self._busy = false;
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
      if (typeof updateMicUI === 'function') updateMicUI('idle');
      var interim = document.getElementById('captionInterim');
      if (interim) interim.textContent = '';
    },

    transcribe: async function(blob, lang){
      var url = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.transcribeAudioUrl)
        || 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/transcribe-audio';
      var token = null;
      try {
        if (window.sottotitoliSupabase) {
          var sr = await window.sottotitoliSupabase.auth.getSession();
          token = (sr && sr.data && sr.data.session) ? sr.data.session.access_token : null;
        }
      } catch(e) {}
      var resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
          'X-Lang': String(lang || 'en-US').split('-')[0],
          'Authorization': 'Bearer ' + (token || '')
        },
        body: blob
      });
      if (!resp.ok) {
        var err = null;
        try { err = await resp.json(); } catch(e) {}
        var msg = err && err.error ? err.error : ('HTTP ' + resp.status);
        if (resp.status === 401) msg = 'Accesso richiesto: accedi per trascrivere su questo dispositivo.';
        throw new Error(msg);
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
    }
  };
  window.RecordFallback = FB;
})();

