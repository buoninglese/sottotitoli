// js/kokoro-tts.js — Kokoro-82M TTS via HuggingFace Inference API
// Shared module for all pages that need text-to-speech
(function(global){
  'use strict';

  var HF_TOKEN = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.kokoroToken) || '';
  var API_URL = 'https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M';

  // Default voice per language (overridable via settings)
  var DEFAULTS = {
    en: { voice: 'af_heart', lang_code: 'a' },  // American English female
    it: { voice: 'if_sara',  lang_code: 'i' },  // Italian female
  };

  // All available voices grouped by language
  var VOICE_MAP = {
    'en-US': [
      {id:'af_heart',label:'❤️ Heart (F)'},{id:'af_bella',label:'🔥 Bella (F)'},
      {id:'af_alloy',label:'Alloy (F)'},{id:'af_aoede',label:'Aoede (F)'},
      {id:'af_jessica',label:'Jessica (F)'},{id:'af_kore',label:'Kore (F)'},
      {id:'af_nicole',label:'🎧 Nicole (F)'},{id:'af_nova',label:'Nova (F)'},
      {id:'af_river',label:'River (F)'},{id:'af_sarah',label:'Sarah (F)'},
      {id:'af_sky',label:'Sky (F)'},
      {id:'am_adam',label:'Adam (M)'},{id:'am_echo',label:'Echo (M)'},
      {id:'am_eric',label:'Eric (M)'},{id:'am_fenrir',label:'Fenrir (M)'},
      {id:'am_liam',label:'Liam (M)'},{id:'am_michael',label:'Michael (M)'},
      {id:'am_onyx',label:'Onyx (M)'},{id:'am_puck',label:'Puck (M)'},
      {id:'am_santa',label:'Santa (M)'},
    ],
    'en-GB': [
      {id:'bf_alice',label:'Alice (F)'},{id:'bf_emma',label:'Emma (F)'},
      {id:'bf_isabella',label:'Isabella (F)'},{id:'bf_lily',label:'Lily (F)'},
      {id:'bm_daniel',label:'Daniel (M)'},{id:'bm_fable',label:'Fable (M)'},
      {id:'bm_george',label:'George (M)'},{id:'bm_lewis',label:'Lewis (M)'},
    ],
    'it': [
      {id:'if_sara',label:'Sara (F)'},{id:'im_nicola',label:'Nicola (M)'},
    ]
  };

  var currentAudio = null;

  function getVoiceForLang(lang) {
    var key = 'kokoro-voice-' + (lang || 'en');
    var saved = localStorage.getItem(key);
    if (saved) return saved;
    var def = DEFAULTS[lang] || DEFAULTS['en'];
    return def.voice;
  }

  function getLangCodeForVoice(voiceId) {
    var prefix = voiceId.substring(0, 2);
    var map = {af:'a', am:'a', bf:'b', bm:'b', if:'i', im:'i', ef:'e', em:'e', ff:'f', jf:'j', jm:'j', zf:'z', zm:'z', hf:'h', hm:'h', pf:'p', pm:'p'};
    return map[prefix] || 'a';
  }

  function setVoiceForLang(lang, voiceId) {
    var key = 'kokoro-voice-' + (lang || 'en');
    localStorage.setItem(key, voiceId);
  }

  function getVoiceList(lang) {
    // Normalize: en-US → en, it-IT → it
    var base = (lang || 'en').split('-')[0].toLowerCase();
    if (base === 'en') {
      return (VOICE_MAP['en-US'] || []).concat(VOICE_MAP['en-GB'] || []);
    }
    return VOICE_MAP[base] || VOICE_MAP['en-US'] || [];
  }

  async function speak(text, options) {
    var opts = options || {};
    var lang = opts.lang || 'en';
    var voice = opts.voice || getVoiceForLang(lang);
    var speed = opts.speed || 1.0;
    var onStart = opts.onStart || null;
    var onEnd = opts.onEnd || null;
    var onError = opts.onError || null;

    if (!text) return;

    // Stop any current playback
    stop();

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + HF_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { voice: voice, speed: speed }
        })
      });

      if (!response.ok) {
        var errText = await response.text();
        throw new Error('HTTP ' + response.status + ': ' + errText.substring(0, 200));
      }

      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var audio = new Audio(url);
      currentAudio = audio;

      if (onStart) onStart();

      audio.onended = function(){
        currentAudio = null;
        URL.revokeObjectURL(url);
        if (onEnd) onEnd();
      };

      audio.onerror = function(){
        currentAudio = null;
        URL.revokeObjectURL(url);
        if (onError) onError(new Error('Playback failed'));
      };

      await audio.play();

    } catch(e) {
      console.warn('Kokoro TTS error:', e.message);
      if (onError) onError(e);
    }
  }

  function stop(){
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.remove();
      currentAudio = null;
    }
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
    getLangCodeForVoice: getLangCodeForVoice,
    createSpeakerButton: createSpeakerButton,
    DEFAULTS: DEFAULTS
  };

})(window);
