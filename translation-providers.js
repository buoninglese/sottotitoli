(function (global) {
  'use strict';

  function safeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeLangCode(value) {
    const input = safeString(value).toLowerCase();
    if (!input) return '';
    const base = input.split('-')[0];
    const allowed = ['en', 'it', 'fr', 'de', 'es', 'pt', 'nl', 'pl'];
    return allowed.indexOf(base) !== -1 ? base : '';
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
      headers: { 'Accept': 'application/json' }
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

  async function translateWithGoogle(text, sourceLang, targetLang) {
    const source = normalizeLangCode(sourceLang);
    const target = normalizeLangCode(targetLang);

    if (!text || !source || !target) {
      throw new Error('Missing translation text or language codes.');
    }

    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
      encodeURIComponent(source) + '&tl=' + encodeURIComponent(target) +
      '&dt=t&q=' + encodeURIComponent(text);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Google Translate request failed with HTTP ${response.status}`);
    }

    const raw = await response.text();
    // Response format: [[["translated text","original",...]],...]
    const match = raw.match(/"([^"]+)"/);
    if (!match) {
      throw new Error('Could not parse Google Translate response.');
    }

    return {
      provider: 'google',
      translatedText: match[1],
      raw: raw
    };
  }

  async function translateWithFallback(text, sourceLang, targetLang, config) {
    // Try Google first (better quality for European languages), fall back to MyMemory
    try {
      return await translateWithGoogle(text, sourceLang, targetLang);
    } catch (googleErr) {
      console.warn('Google Translate failed, trying MyMemory:', googleErr.message);
      try {
        return await translateWithMyMemory(text, sourceLang, targetLang, {
          baseUrl: config && config.myMemoryBase
        });
      } catch (myMemoryErr) {
        throw new Error('All translation providers failed. Google: ' + googleErr.message + ' | MyMemory: ' + myMemoryErr.message);
      }
    }
  }

  function resolveConfig() {
    const root = global.SOTTOTITOLI_CONFIG || {};
    const translation = root.translation || {};

    return {
      provider: translation.provider || 'google',  // default to Google
      myMemoryBase: translation.myMemoryBase || 'https://api.mymemory.translated.net/get'
    };
  }

  async function translateText(config, text, sourceLang, targetLang) {
    const provider = (config && config.provider) || 'google';

    if (provider === 'google') {
      return translateWithGoogle(text, sourceLang, targetLang);
    }

    if (provider === 'mymemory') {
      return translateWithMyMemory(text, sourceLang, targetLang, {
        baseUrl: config && config.myMemoryBase
      });
    }

    if (provider === 'fallback' || provider === 'auto') {
      return translateWithFallback(text, sourceLang, targetLang, config);
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  global.SottotitoliTranslationProviders = {
    resolveConfig,
    normalizeLangCode,
    translateText,
    translateWithFallback,
    translateWithGoogle,
    translateWithMyMemory
  };
})(window);