// config.example.js
// Copy this file to config.js and fill in your own values.
// Never commit config.js with real secrets.

window.SOTTOTITOLI_CONFIG = {
  // ── Supabase ──
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',

  // ── Backends ──
  WEBSOCKET_URL: 'https://your-websocket-service.onrender.com',
  LEARNING_API_URL: 'https://your-learning-service.onrender.com',

  // ── Auth ──
  AUTH_REDIRECT_URL: 'https://your-domain.github.io/sottotitoli/studio.html',

  // ── Mode definitions ──
  modes: {
    'caption-en': { title: 'English Caption', sourceLang: 'en-US', sourceCode: 'en', translate: false },
    'caption-it': { title: 'Italian Caption', sourceLang: 'it-IT', sourceCode: 'it', translate: false },
    'caption-fr': { title: 'French Caption', sourceLang: 'fr-FR', sourceCode: 'fr', translate: false },
    'caption-de': { title: 'German Caption', sourceLang: 'de-DE', sourceCode: 'de', translate: false },
    'caption-es': { title: 'Spanish Caption', sourceLang: 'es-ES', sourceCode: 'es', translate: false },
    'caption-pt': { title: 'Portuguese Caption', sourceLang: 'pt-PT', sourceCode: 'pt', translate: false },
    'caption-nl': { title: 'Dutch Caption', sourceLang: 'nl-NL', sourceCode: 'nl', translate: false },
    'caption-pl': { title: 'Polish Caption', sourceLang: 'pl-PL', sourceCode: 'pl', translate: false },
    'translate-en-it': { title: 'English → Italian', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'it', translate: true },
    'translate-it-en': { title: 'Italian → English', sourceLang: 'it-IT', sourceCode: 'it', targetLang: 'en', translate: true },
    'translate-en-es': { title: 'English → Spanish', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'es', translate: true },
    'translate-en-fr': { title: 'English → French', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'fr', translate: true },
    'translate-en-de': { title: 'English → German', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'de', translate: true },
    'translate-en-pt': { title: 'English → Portuguese', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'pt', translate: true },
    'translate-en-nl': { title: 'English → Dutch', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'nl', translate: true },
    'translate-en-pl': { title: 'English → Polish', sourceLang: 'en-US', sourceCode: 'en', targetLang: 'pl', translate: true }
  },

  // ── Translation ──
  translation: {
    provider: 'mymemory',
    myMemoryBase: 'https://api.mymemory.translated.net/get'
  },

  // ── Analysis ──
  analysis: {
    speakerEndpoint: 'https://sottotitoli-websocket.onrender.com/analyze-speakers'
  }
};
