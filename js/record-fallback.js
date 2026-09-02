// ═══ Record → Transcribe fallback (iOS Safari has no SpeechRecognition) ═══
// Tap-to-record UX: start() records via MediaRecorder, stop() returns the blob,
// transcribe() POSTs it to the transcribe-audio edge function (Whisper),
// feedSentences() replays the text through the existing _realMic.onFinal
// pipeline so previous-sentences, stats and session save all work unchanged.
(function(){
  var FB = {
    _stream: null,
    _recorder: null,
    _chunks: [],
    _mime: '',
    _startedAt: 0,

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
      this._chunks = [];
      try {
        this._recorder = this._mime
          ? new MediaRecorder(this._stream, { mimeType: this._mime })
          : new MediaRecorder(this._stream);
      } catch(e) {
        console.error('RecordFallback recorder failed:', e);
        this._cleanup();
        return false;
      }
      this._startedAt = Date.now();
      var self = this;
      this._recorder.ondataavailable = function(ev){ if (ev.data && ev.data.size) self._chunks.push(ev.data); };
      this._recorder.start(1000); // 1s timeslices
      if (typeof updateMicUI === 'function') updateMicUI('live');
      var interim = document.getElementById('captionInterim');
      if (interim) interim.textContent = '● Recording… tap Stop to transcribe';
      return true;
    },

    stop: function(){
      var self = this;
      return new Promise(function(resolve){
        if (!self._recorder || self._recorder.state === 'inactive') { self._cleanup(); resolve(null); return; }
        self._recorder.onstop = function(){
          var blob = null;
          if (self._chunks.length) {
            try { blob = new Blob(self._chunks, { type: self._mime || 'audio/webm' }); } catch(e) {}
          }
          self._cleanup();
          resolve(blob);
        };
        try { self._recorder.stop(); } catch(e) { self._cleanup(); resolve(null); }
      });
    },

    _cleanup: function(){
      if (this._stream) { try { this._stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e) {} this._stream = null; }
      this._recorder = null;
      this._chunks = [];
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
