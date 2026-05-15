window.SOTTOTITOLI_CONFIG = {
  websocketUrl: "wss://sottotitoli-websocket.onrender.com",
  siteName: "Sottotitoli",
  modes: {
    "caption-en": {
      title: "Live Caption English",
      sourceLang: "en-US",
      translate: false
    },
    "caption-it": {
      title: "Live Caption Italian",
      sourceLang: "it-IT",
      translate: false
    },
    "translate-en-it": {
      title: "Live Translation English to Italian",
      sourceLang: "en-US",
      translate: true,
      targetLang: "it"
    },
    "translate-it-en": {
      title: "Live Translation Italian to English",
      sourceLang: "it-IT",
      translate: true,
      targetLang: "en"
    },
    "lesson": {
      title: "Lesson Mode",
      sourceLang: "en-US",
      translate: false,
      lessonMode: true
    }
  }
};