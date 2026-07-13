/**
 * S8T Speech Service — Browser Speech Recognition adapter.
 * Uses Web Speech API (SpeechRecognition) for real-time speech-to-text.
 * Falls back to typed input when unsupported or permission denied.
 */
(function(w){
  'use strict';

  var recognition = null;
  var isListening = false;
  var currentLang = 'en';
  var onInterimCallback = null;
  var onFinalCallback = null;
  var onStateCallback = null;
  var onErrorCallback = null;
  var networkErrorCount = 0;
  var MAX_NETWORK_ERRORS = 3;

  var SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

  /**
   * Check if speech recognition is supported in this browser.
   */
  function isSupported(){
    return !!SpeechRecognition;
  }

  /**
   * Initialize the speech recognizer for a given language.
   */
  function init(lang, callbacks){
    if (!isSupported()) {
      if (callbacks.onError) callbacks.onError('unsupported', 'Speech recognition not available in this browser');
      return false;
    }
    currentLang = lang || 'en';
    onInterimCallback = callbacks.onInterim || null;
    onFinalCallback = callbacks.onFinal || null;
    onStateCallback = callbacks.onState || null;
    onErrorCallback = callbacks.onError || null;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = mapLangCode(currentLang);

      recognition.onresult = function(event){
        var interim = '';
        var final = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (final && onFinalCallback) onFinalCallback(final.trim());
        if (interim && onInterimCallback) onInterimCallback(interim.trim());
      };

      recognition.onerror = function(event){
        if (event.error === 'no-speech') return;
        if (event.error === 'aborted') return;
        if (event.error === 'network') {
          networkErrorCount++;
          if (networkErrorCount >= MAX_NETWORK_ERRORS) {
            isListening = false;
            setState('error');
            if (onErrorCallback) onErrorCallback('network', 'Speech recognition unavailable. Using typed input.');
            return;
          }
          return; // Retry — network may recover
        }
        if (onErrorCallback) onErrorCallback(event.error, event.message || 'Speech recognition error');
        setState('error');
      };

      recognition.onend = function(){
        // Auto-restart if still listening (continuous mode sometimes stops)
        if (isListening && recognition) {
          try { recognition.start(); } catch(e) {}
        } else {
          setState('idle');
        }
      };

      recognition.onstart = function(){
        setState('listening');
      };

      return true;
    } catch(e) {
      if (onErrorCallback) onErrorCallback('init_error', e.message);
      return false;
    }
  }

  /**
   * Start listening. Requests microphone permission if needed.
   */
  async function start(){
    if (!recognition) return false;

    // Check microphone permission first
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream — we only needed permission
      stream.getTracks().forEach(function(t){ t.stop(); });
    } catch(e) {
      if (onErrorCallback) onErrorCallback('mic_denied', 'Microphone access was denied');
      setState('error');
      return false;
    }

    setState('connecting');
    networkErrorCount = 0;
    try {
      recognition.start();
      isListening = true;
      return true;
    } catch(e) {
      if (onErrorCallback) onErrorCallback('start_error', e.message);
      setState('error');
      return false;
    }
  }

  /**
   * Stop listening.
   */
  function stop(){
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
    setState('idle');
  }

  /**
   * Abort immediately (no final result processing).
   */
  function abort(){
    isListening = false;
    if (recognition) {
      try { recognition.abort(); } catch(e) {}
    }
    setState('idle');
  }

  /**
   * Check if currently listening.
   */
  function isActive(){
    return isListening;
  }

  function setState(state){
    if (onStateCallback) onStateCallback(state);
  }

  /**
   * Map ISO language codes to BCP-47 format for SpeechRecognition.
   */
  function mapLangCode(code){
    var map = {
      'en': 'en-US',
      'it': 'it-IT',
      'nl': 'nl-NL',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'es': 'es-ES'
    };
    return map[code] || code;
  }

  // Export
  w.S8T_SPEECH = {
    isSupported: isSupported,
    init: init,
    start: start,
    stop: stop,
    abort: abort,
    isActive: isActive
  };

})(window);
