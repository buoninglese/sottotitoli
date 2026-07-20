// js/kokoro-tts.js — Text-to-speech via browser Web Speech API
// Note: Kokoro-82M via HuggingFace API is not available (requires fal.ai key).
// This module uses the browser's built-in speechSynthesis for instant, free TTS.
(function(global){
  'use strict';

  // Default voice preferences per language (stored in localStorage)
  var DEFAULTS = {
    en: 'Samantha',
    it: 'Alice',
  };

  // Available browser voices by language (discovered at runtime)
  var _browserVoices = [];

  function _loadVoices(){
    var voices = speechSynthesis.getVoices();
    if (voices.length) { _browserVoices = voices; return; }
    // Chrome loads voices async
    speechSynthesis.onvoiceschanged = function(){
      _browserVoices = speechSynthesis.getVoices();
    };
  }
  _loadVoices();

  function getVoiceForLang(lang) {
    var key = 'kokoro-voice-' + (lang || 'en');
    var saved = localStorage.getItem(key);
    if (saved) return saved;
    return DEFAULTS[lang] || DEFAULTS['en'];
  }

  function setVoiceForLang(lang, voiceId) {
    var key = 'kokoro-voice-' + (lang || 'en');
    localStorage.setItem(key, voiceId);
  }

  function getVoiceList(lang) {
    var base = (lang || 'en').split('-')[0].toLowerCase();
    var allVoices = speechSynthesis.getVoices();
    if (!allVoices.length) allVoices = _browserVoices;
    // Filter voices matching the language
    var matches = allVoices.filter(function(v){
      return v.lang.toLowerCase().indexOf(base) === 0;
    });
    if (!matches.length) matches = allVoices;
    return matches.map(function(v){
      return { id: v.name, label: v.name + ' (' + v.lang + ')', voice: v };
    });
  }

  function _findVoice(lang, preferredName){
    var allVoices = speechSynthesis.getVoices();
    if (!allVoices.length) allVoices = _browserVoices;
    var base = (lang || 'en').split('-')[0].toLowerCase();
    // Try preferred voice first
    if (preferredName) {
      var match = allVoices.find(function(v){ return v.name === preferredName; });
      if (match) return match;
    }
    // Fall back to any voice in this language
    var langMatch = allVoices.find(function(v){ return v.lang.toLowerCase().indexOf(base) === 0; });
    if (langMatch) return langMatch;
    // Fall back to first available voice
    return allVoices[0] || null;
  }

  function speak(text, options) {
    var opts = options || {};
    var lang = opts.lang || 'en';
    var preferredVoice = opts.voice || getVoiceForLang(lang);
    var rate = opts.speed || 1.0;
    var onStart = opts.onStart || null;
    var onEnd = opts.onEnd || null;
    var onError = opts.onError || null;

    if (!text) return;
    if (!window.speechSynthesis) {
      if (onError) onError(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any current speech
    speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(text);
    var voice = _findVoice(lang, preferredVoice);
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    if (onError) utterance.onerror = function(e){ onError(new Error(e.error || 'Speech error')); };

    speechSynthesis.speak(utterance);
  }

  function stop(){
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  // Build a speaker button element
  function createSpeakerButton(text, lang, className) {
    var btn = document.createElement('button');
    btn.className = (className || '') + ' kokoro-spk-btn';
    btn.innerHTML = '🔊';
    btn.title = 'Listen';
    btn.setAttribute('data-tts-text', text);
    btn.setAttribute('data-tts-lang', lang);
    btn.style.cssText = 'width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:transparent;cursor:pointer;font-size:11px;display:inline-flex;align-items:center;justify-content:center;margin-left:4px;transition:all .15s;flex-shrink:0;vertical-align:middle';
    btn.onmouseenter = function(){ this.style.borderColor = 'var(--accent)'; };
    btn.onmouseleave = function(){ if (!this.classList.contains('playing')) this.style.borderColor = 'rgba(255,255,255,.1)'; };
    btn.onclick = function(e){
      e.stopPropagation();
      e.preventDefault();
      if (this.classList.contains('playing')) { stop(); this.classList.remove('playing'); return; }
      this.classList.add('playing');
      this.style.borderColor = 'var(--green)';
      var self = this;
      speak(this.getAttribute('data-tts-text'), {
        lang: this.getAttribute('data-tts-lang'),
        onEnd: function(){ self.classList.remove('playing'); self.style.borderColor = 'rgba(255,255,255,.1)'; },
        onError: function(){ self.classList.remove('playing'); self.style.borderColor = 'rgba(255,255,255,.1)'; }
      });
    };
    return btn;
  }

  // Exports
  global.KokoroTTS = {
    speak: speak,
    stop: stop,
    getVoiceForLang: getVoiceForLang,
    setVoiceForLang: setVoiceForLang,
    getVoiceList: getVoiceList,
    createSpeakerButton: createSpeakerButton,
    DEFAULTS: DEFAULTS
  };

})(window);
