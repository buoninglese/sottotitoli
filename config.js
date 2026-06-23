window.SOTTOTITOLI_CONFIG = {
  websocketUrl: "wss://sottotitoli-websocket.onrender.com",
  siteName: "Sottotitoli",
  AUTH_REDIRECT_URL: "https://buoninglese.github.io/sottotitoli/start.html",
  translation: {
    provider: "auto",  // "auto" = Google first, MyMemory fallback. Also: "google", "mymemory"
    myMemoryBase: "https://api.mymemory.translated.net/get"
  },
  deepgram: {
    enabled: false  // Deepgram STT: only reliable for English; browser Web Speech API handles other languages better
  },
  analysis: {
    speakerEndpoint: "https://sottotitoli-websocket.onrender.com/analyze-speakers"
  },
  modes: {
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
    "caption-fr": {
      title: "Live Caption French",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: false
    },
    "caption-es": {
      title: "Live Caption Spanish",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: false
    },
    "caption-nl": {
      title: "Live Caption Dutch",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: false
    },
    "caption-pl": {
      title: "Live Caption Polish",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: false
    },
    "caption-de": {
      title: "Live Caption German",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: false
    },
    "caption-pt": {
      title: "Live Caption Portuguese",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: false
    },

    "translate-en-it": {
      title: "Live Translation English to Italian",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "it"
    },
    "translate-en-fr": {
      title: "Live Translation English to French",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "fr"
    },
    "translate-en-es": {
      title: "Live Translation English to Spanish",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "es"
    },
    "translate-en-nl": {
      title: "Live Translation English to Dutch",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "nl"
    },
    "translate-en-pl": {
      title: "Live Translation English to Polish",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "pl"
    },
    "translate-en-de": {
      title: "Live Translation English to German",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "de"
    },

    "translate-it-en": {
      title: "Live Translation Italian to English",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "en"
    },
    "translate-it-fr": {
      title: "Live Translation Italian to French",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "fr"
    },
    "translate-it-es": {
      title: "Live Translation Italian to Spanish",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "es"
    },
    "translate-it-nl": {
      title: "Live Translation Italian to Dutch",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "nl"
    },
    "translate-it-pl": {
      title: "Live Translation Italian to Polish",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "pl"
    },
    "translate-it-de": {
      title: "Live Translation Italian to German",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "de"
    },

    "translate-fr-en": {
      title: "Live Translation French to English",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "en"
    },
    "translate-fr-it": {
      title: "Live Translation French to Italian",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "it"
    },
    "translate-fr-es": {
      title: "Live Translation French to Spanish",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "es"
    },
    "translate-fr-nl": {
      title: "Live Translation French to Dutch",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "nl"
    },
    "translate-fr-pl": {
      title: "Live Translation French to Polish",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "pl"
    },
    "translate-fr-de": {
      title: "Live Translation French to German",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "de"
    },

    "translate-es-en": {
      title: "Live Translation Spanish to English",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "en"
    },
    "translate-es-it": {
      title: "Live Translation Spanish to Italian",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "it"
    },
    "translate-es-fr": {
      title: "Live Translation Spanish to French",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "fr"
    },
    "translate-es-nl": {
      title: "Live Translation Spanish to Dutch",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "nl"
    },
    "translate-es-pl": {
      title: "Live Translation Spanish to Polish",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "pl"
    },
    "translate-es-de": {
      title: "Live Translation Spanish to German",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "de"
    },

    "translate-nl-en": {
      title: "Live Translation Dutch to English",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "en"
    },
    "translate-nl-it": {
      title: "Live Translation Dutch to Italian",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "it"
    },
    "translate-nl-fr": {
      title: "Live Translation Dutch to French",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "fr"
    },
    "translate-nl-es": {
      title: "Live Translation Dutch to Spanish",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "es"
    },
    "translate-nl-pl": {
      title: "Live Translation Dutch to Polish",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "pl"
    },
    "translate-nl-de": {
      title: "Live Translation Dutch to German",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "de"
    },

    "translate-pt-en": {
      title: "Live Translation Portuguese to English",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "en"
    },
    "translate-pt-it": {
      title: "Live Translation Portuguese to Italian",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "it"
    },
    "translate-pt-fr": {
      title: "Live Translation Portuguese to French",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "fr"
    },
    "translate-pt-de": {
      title: "Live Translation Portuguese to German",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "de"
    },
    "translate-pt-es": {
      title: "Live Translation Portuguese to Spanish",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "es"
    },
    "translate-pt-nl": {
      title: "Live Translation Portuguese to Dutch",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "nl"
    },
    "translate-pt-pl": {
      title: "Live Translation Portuguese to Polish",
      sourceLang: "pt-PT",
      sourceCode: "pt",
      translate: true,
      targetLang: "pl"
    },

    "translate-en-pt": {
      title: "Live Translation English to Portuguese",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: true,
      targetLang: "pt"
    },
    "translate-it-pt": {
      title: "Live Translation Italian to Portuguese",
      sourceLang: "it-IT",
      sourceCode: "it",
      translate: true,
      targetLang: "pt"
    },
    "translate-fr-pt": {
      title: "Live Translation French to Portuguese",
      sourceLang: "fr-FR",
      sourceCode: "fr",
      translate: true,
      targetLang: "pt"
    },
    "translate-de-pt": {
      title: "Live Translation German to Portuguese",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "pt"
    },
    "translate-es-pt": {
      title: "Live Translation Spanish to Portuguese",
      sourceLang: "es-ES",
      sourceCode: "es",
      translate: true,
      targetLang: "pt"
    },
    "translate-nl-pt": {
      title: "Live Translation Dutch to Portuguese",
      sourceLang: "nl-NL",
      sourceCode: "nl",
      translate: true,
      targetLang: "pt"
    },

    "translate-pl-en": {
      title: "Live Translation Polish to English",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "en"
    },
    "translate-pl-it": {
      title: "Live Translation Polish to Italian",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "it"
    },
    "translate-pl-fr": {
      title: "Live Translation Polish to French",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "fr"
    },
    "translate-pl-es": {
      title: "Live Translation Polish to Spanish",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "es"
    },
    "translate-pl-nl": {
      title: "Live Translation Polish to Dutch",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "nl"
    },
    "translate-pl-de": {
      title: "Live Translation Polish to German",
      sourceLang: "pl-PL",
      sourceCode: "pl",
      translate: true,
      targetLang: "de"
    },

    "translate-de-en": {
      title: "Live Translation German to English",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "en"
    },
    "translate-de-it": {
      title: "Live Translation German to Italian",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "it"
    },
    "translate-de-fr": {
      title: "Live Translation German to French",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "fr"
    },
    "translate-de-es": {
      title: "Live Translation German to Spanish",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "es"
    },
    "translate-de-nl": {
      title: "Live Translation German to Dutch",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "nl"
    },
    "translate-de-pl": {
      title: "Live Translation German to Polish",
      sourceLang: "de-DE",
      sourceCode: "de",
      translate: true,
      targetLang: "pl"
    },

    "lesson": {
      title: "Lesson Mode",
      sourceLang: "en-US",
      sourceCode: "en",
      translate: false,
      lessonMode: true
    }
  },

  /** Stripe payment integration */
  stripe: {
    publishableKey: "pk_test_51Tcwid1xvn5NIk3eLYEU3IQK0N4q09aU5lggFCr7TkRb2WJsm7pZJ668mUykb9N1gCnDLksDJpLa0QwP6tpE6oms00m7tQIVsx",
    checkoutFunctionUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/create-checkout-session",
    prices: {
      "2hours":   "120 min + 5 token — €10",
      "20hours":  "1200 min + 50 token — €50",
      "50hours":  "3000 min + 150 token — €100",
      "90tokens": "90 token — €10"
    }
  }
};
