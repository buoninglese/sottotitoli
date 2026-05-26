(function (global) {
  'use strict';

  function safeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeLangCode(value) {
    const input = safeString(value).toLowerCase();
    if (!input) return '';
    if (input.startsWith('en')) return 'en';
    if (input.startsWith('it')) return 'it';
    return input.split('-')[0];
  }

  function htmlDecode(input) {
    const txt = document.createElement('textarea');
    txt.innerHTML = input || '';
    return txt.value;
  }

  async function translateWithMyMemory(text, sourceLang, targetLang, options) {
    const source = normalizeLangCode(sourceLang);
    const target = normalizeLangCode(targetLang);

    if (!text || !source || !target) {
      throw new Error('Missing translation text or language codes.');
    }

    const base = (options && options.baseUrl) || 'https://api.mymemory.translated.net/get';
    const params = new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`
    });

    const response = await fetch(`${base}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MyMemory request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    const translated = data && data.responseData && data.responseData.translatedText;

    if (!translated) {
      throw new Error('Invalid translation response from MyMemory.');
    }

    return {
      provider: 'mymemory',
      translatedText: htmlDecode(translated),
      raw: data
    };
  }

  function resolveConfig() {
    const root = global.SOTTOTITOLI_CONFIG || {};
    const translation = root.translation || {};

    return {
      provider: translation.provider || 'mymemory',
      myMemoryBase: translation.myMemoryBase || 'https://api.mymemory.translated.net/get'
    };
  }

  async function translateText(config, text, sourceLang, targetLang) {
    const provider = (config && config.provider) || 'mymemory';

    if (provider === 'mymemory') {
      return translateWithMyMemory(text, sourceLang, targetLang, {
        baseUrl: config.myMemoryBase
      });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  global.SottotitoliTranslationProviders = {
    resolveConfig,
    normalizeLangCode,
    translateText
  };
})(window);