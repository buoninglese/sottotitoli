// js/speech-icons.js — Text-to-speech speaker icons via browser Web Speech API
// Uses the browser's built-in speechSynthesis for instant, free TTS.
// Formerly known as kokoro-tts.js (that name was misleading — Kokoro-82M was
// never hooked up; it required a fal.ai key that wasn't available).
(function(global){
  'use strict';

  // Default voice preferences per language
  // For English: dual voices (US + UK Male) with two speaker icons separated by |
  var DEFAULTS = {
    en:  [
      { name: 'Google US English', flag: '🇺🇸', label: 'US English' },
      { name: 'Google UK English Male', altNames: ['Google UK English', 'Google UK English Female', 'Daniel'], flag: '🇬🇧', label: 'UK English' }
    ],
    it:  'Google italiano',
    de:  'Google Deutsch',
    fr:  'Google français',
    es:  'Google español',
    nl:  'Google Nederlands',
    pl:  'Google polski',
  };

  // Languages that have dual voice support (two icons)
  var DUAL_LANGS = { en: true };

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
    var key = 'speech-icons-voice-' + (lang || 'en');
    var saved = localStorage.getItem(key);
    if (saved) return saved;
    var def = DEFAULTS[lang] || DEFAULTS['en'];
    // For dual-lang like en, return just the name array
    if (Array.isArray(def)) return def.map(function(v){ return typeof v === 'string' ? v : v.name; });
    return def;
  }

  function setVoiceForLang(lang, voiceId) {
    var key = 'speech-icons-voice-' + (lang || 'en');
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
    // For English dual voices, try alternative names (e.g. "Google UK English Male" → "Daniel")
    if (base === 'en' && preferredName) {
      var enDefs = DEFAULTS['en'];
      if (Array.isArray(enDefs)) {
        for (var i = 0; i < enDefs.length; i++) {
          var def = enDefs[i];
          if (typeof def === 'object' && def.name === preferredName && def.altNames) {
            for (var j = 0; j < def.altNames.length; j++) {
              var altMatch = allVoices.find(function(v){ return v.name === def.altNames[j]; });
              if (altMatch) return altMatch;
            }
          }
        }
      }
    }
    // Fall back to any voice in this language (but not the same as the first match)
    var langMatches = allVoices.filter(function(v){ return v.lang.toLowerCase().indexOf(base) === 0; });
    if (langMatches.length > 1 && preferredName) {
      // Try to find a different voice than the first match
      for (var k = 0; k < langMatches.length; k++) {
        if (langMatches[k].name !== preferredName) return langMatches[k];
      }
    }
    if (langMatches.length) return langMatches[0];
    // Fall back to first available voice
    return allVoices[0] || null;
  }

  function speak(text, options) {
    var opts = options || {};
    var lang = opts.lang || 'en';
    var preferredVoice = opts.voice || getVoiceForLang(lang);
    // If dual-lang, use the first voice by default unless a specific one is passed
    if (Array.isArray(preferredVoice)) preferredVoice = preferredVoice[0];
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

  function _makeOneButton(text, lang, voiceName, label) {
    var btn = document.createElement('button');
    btn.className = 'speech-icon-btn';
    btn.innerHTML = '🔊';
    btn.title = label || voiceName || 'Listen';
    btn.setAttribute('data-tts-text', text);
    btn.setAttribute('data-tts-lang', lang);
    btn.setAttribute('data-tts-voice', voiceName || '');
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
        voice: this.getAttribute('data-tts-voice'),
        onEnd: function(){ self.classList.remove('playing'); self.style.borderColor = 'rgba(255,255,255,.1)'; },
        onError: function(){ self.classList.remove('playing'); self.style.borderColor = 'rgba(255,255,255,.1)'; }
      });
    };
    return btn;
  }

  // Build a speaker button element (for English: two buttons separated by |)
  function createSpeakerButton(text, lang, className) {
    var base = (lang || 'en').split('-')[0].toLowerCase();
    var wrapper = document.createElement('span');
    wrapper.className = (className || '') + ' speech-icon-wrap';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.verticalAlign = 'middle';

    if (DUAL_LANGS[base]) {
      var voices = getVoiceForLang(base);
      if (!Array.isArray(voices)) voices = [voices];
      // Get the rich voice objects for labels
      var defs = DEFAULTS[base];
      if (!Array.isArray(defs)) defs = [{name: defs, flag: '', label: defs}];
      voices.forEach(function(v, i){
        if (i > 0) {
          var sep = document.createElement('span');
          sep.textContent = '|';
          sep.style.cssText = 'font-size:10px;color:var(--t3);margin:0 2px;user-select:none';
          wrapper.appendChild(sep);
        }
        var label = (defs[i] && defs[i].flag ? defs[i].flag + ' ' : '') + (defs[i] ? (defs[i].label || v) : v);
        wrapper.appendChild(_makeOneButton(text, lang, v, label));
      });
    } else {
      wrapper.appendChild(_makeOneButton(text, lang, null, null));
    }
    return wrapper;
  }

  // Exports
  global.SpeechIcons = {
    speak: speak,
    stop: stop,
    getVoiceForLang: getVoiceForLang,
    setVoiceForLang: setVoiceForLang,
    getVoiceList: getVoiceList,
    createSpeakerButton: createSpeakerButton,
    DEFAULTS: DEFAULTS
  };

})(window);
