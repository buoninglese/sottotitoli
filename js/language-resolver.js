/**
 * language-resolver.js — Single source of truth for all language routing.
 * Determines content_language, explanation_language, model, and provider
 * for every AI-assisted feature across the site.
 * 
 * Loaded on: caption-s8t.html, panoramica.html, duo-s8t.html
 * Must load after: js/auth.js (window.sottotitoliSupabase)
 */

var S8T_LANG = (function() {
  'use strict';

  var DEFAULT_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
  var DEFAULT_PROVIDER = 'llama31';
  var DEFAULT_LANG = 'en';

  // ── Model selection per language ──
  // NL and PL use Llama 3.3 70B (better quality for those languages)
  // EN uses Llama 3.1 + LanguageTool fallback
  // All others use Llama 3.1
  var MODEL_PER_LANG = {
    nl: 'meta-llama/Llama-3.3-70B-Instruct',
    pl: 'meta-llama/Llama-3.3-70B-Instruct',
  };
  var PROVIDER_PER_LANG = {
    nl: 'llama33',
    pl: 'llama33',
  };
  var MODEL_LABELS = {
    'meta-llama/Llama-3.1-8B-Instruct': 'Llama 3.1',
    'meta-llama/Llama-3.3-70B-Instruct': 'Llama 3.3',
    'meta-llama/Llama-4-Scout-17B-16E-Instruct': 'Llama 4',
  };

  function getModelForLanguage(lang) {
    return MODEL_PER_LANG[lang] || DEFAULT_MODEL;
  }
  function getProviderForLanguage(lang) {
    return PROVIDER_PER_LANG[lang] || DEFAULT_PROVIDER;
  }
  function getModelLabel(modelId) {
    return MODEL_LABELS[modelId] || modelId.split('/').pop();
  }

  // ── Cached profile data ──
  var _profile = null;       // { native_lang, explanation_language, ai_model, ai_provider }
  var _profileLoaded = false;

  // ── Resolver ──
  /**
   * Resolve language settings for the current room + user.
   * @param {Object} roomConfig - { caption_lang, translate_src, translate_tgt, room_mode }
   *   Usually read from rooms.settings_json or URL params.
   * @returns {Object} resolved settings
   */
  async function resolve(roomConfig) {
    var profile = await loadProfile();
    var rc = roomConfig || {};

    // Content language: room config → URL param → default English
    var contentLang = rc.caption_lang || DEFAULT_LANG;

    // Explanation language: profile preference → profile native → default
    var explanationLang = profile.explanation_language || profile.native_lang || DEFAULT_LANG;

    var model = profile.ai_model || getModelForLanguage(contentLang);
    var provider = profile.ai_provider || getProviderForLanguage(contentLang);

    return {
      content_language: contentLang,
      explanation_language: explanationLang,
      ui_language: DEFAULT_LANG,  // product rule: UI labels in English

      // Derived
      grammar_language: contentLang,
      vocabulary_language: contentLang,
      meaning_language: contentLang,
      analysis_language: contentLang,

      // Translation (from room config)
      translation_source: rc.translate_src || null,
      translation_target: rc.translate_tgt || null,

      // AI config
      model: model,
      provider: provider,

      // Room mode
      room_mode: rc.room_mode || 'caption',
    };
  }

  // ── Profile loader ──
  async function loadProfile() {
    if (_profileLoaded) return _profile;

    var sb = window.sottotitoliSupabase;
    if (!sb) { _profile = {}; _profileLoaded = true; return _profile; }

    try {
      var r = await sb.auth.getSession();
      if (!r.data || !r.data.session) { _profile = {}; _profileLoaded = true; return _profile; }

      var { data, error } = await sb
        .from('profiles')
        .select('native_lang, explanation_language, ai_model, ai_provider')
        .eq('id', r.data.session.user.id)
        .maybeSingle();

      if (!error && data) {
        _profile = {
          native_lang: data.native_lang || null,
          explanation_language: data.explanation_language || null,
          ai_model: data.ai_model || null,
          ai_provider: data.ai_provider || null,
        };
      } else {
        _profile = {};
      }
    } catch (e) {
      console.warn('S8T_LANG: profile load failed, using defaults', e);
      _profile = {};
    }
    _profileLoaded = true;
    return _profile;
  }

  // ── Room config reader ──
  /**
   * Read room config from URL params + localStorage cache.
   * Falls back to defaults if no room config available.
   */
  function readRoomConfig() {
    var params = new URLSearchParams(window.location.search);
    var config = {};

    function normalizeLang(code) {
      if (!code) return null;
      return code.split('-')[0].toLowerCase(); // 'en-US' → 'en'
    }

    // From URL params (set by panoramica.html Start Session)
    if (params.get('lang')) config.caption_lang = normalizeLang(params.get('lang'));
    if (params.get('src')) config.translate_src = normalizeLang(params.get('src'));
    if (params.get('tgt')) config.translate_tgt = normalizeLang(params.get('tgt'));

    // From localStorage cache (set on room entry, survives refresh)
    var cached = localStorage.getItem('s8t-room-config');
    if (cached) {
      try {
        var c = JSON.parse(cached);
        config = Object.assign(c, config); // URL params override cache
      } catch (e) {}
    }

    // Mode
    config.room_mode = config.translate_src ? 'translate' : 'caption';

    return config;
  }

  // ── Save room config to cache ──
  function saveRoomConfig(config) {
    try {
      localStorage.setItem('s8t-room-config', JSON.stringify({
        caption_lang: config.caption_lang,
        translate_src: config.translate_src,
        translate_tgt: config.translate_tgt,
        room_mode: config.room_mode,
      }));
    } catch (e) {}
  }

  // ── Save user preference to profile ──
  async function savePreference(field, value) {
    var sb = window.sottotitoliSupabase;
    if (!sb) return false;
    try {
      var r = await sb.auth.getSession();
      if (!r.data || !r.data.session) return false;
      var update = {};
      update[field] = value;
      await sb.from('profiles').update(update).eq('id', r.data.session.user.id);
      // Update cache
      if (_profile) _profile[field] = value;
      return true;
    } catch (e) {
      console.warn('S8T_LANG: savePreference failed', e);
      return false;
    }
  }

  // ── Public API ──
  return {
    resolve: resolve,
    readRoomConfig: readRoomConfig,
    saveRoomConfig: saveRoomConfig,
    savePreference: savePreference,
    getModelForLanguage: getModelForLanguage,
    getProviderForLanguage: getProviderForLanguage,
    getModelLabel: getModelLabel,
    DEFAULT_MODEL: DEFAULT_MODEL,
    DEFAULT_PROVIDER: DEFAULT_PROVIDER,
    DEFAULT_LANG: DEFAULT_LANG,
  };
})();
