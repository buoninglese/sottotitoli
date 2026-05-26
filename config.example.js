/**
 * config.example.js
 * =================
 * Template for window.SOTTOTITOLI_CONFIG.
 * Copy this to config.js and fill in your values.
 *
 *   cp config.example.js config.js
 */

window.SOTTOTITOLI_CONFIG = {
  /** WebSocket relay server URL */
  websocketUrl: "wss://sottotitoli-websocket.onrender.com",

  /** Site display name */
  siteName: "Sottotitoli",

  /** Translation provider settings */
  translation: {
    provider: "mymemory", // "mymemory" | "google" | "none"
    myMemoryBase: "https://api.mymemory.translated.net/get"
  },

  /** Analysis / speaker diarization endpoint */
  analysis: {
    speakerEndpoint: "https://sottotitoli-websocket.onrender.com/analyze-speakers"
  },

  /** Language and translation mode definitions */
  modes: {
    // Caption-only modes
    "caption-en": {
      title: "Live Caption English",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: false
    },
    "caption-it": {
      title: "Live Caption Italian",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: false
    },

    // Translation modes — extend with your own pairs
    "translate-en-it": {
      title: "Live Translation English to Italian",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "it"
    },
    "translate-it-en": {
      title: "Live Translation Italian to English",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "en"
    },

    // Lesson mode (vocab/grammar analysis)
    lesson: {
      title: "Lesson Mode",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: false,
      lessonMode: true
    }
  }
};
