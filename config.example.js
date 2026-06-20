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
    /** Translation provider: "auto" = Google first with MyMemory fallback.
        Also accepts "google" or "mymemory" for single-provider mode. */
    provider: "auto", // "mymemory" | "google" | "none"
    myMemoryBase: "https://api.mymemory.translated.net/get"
  },

  /** Deepgram speech-to-text (optional — replaces browser Web Speech API) */
  // Set enabled:true to use Deepgram as primary STT. Requires the WebSocket
  // relay server to have DEEPGRAM_API_KEY set in its environment.
  // When disabled or unconfigured, falls back to browser webkitSpeechRecognition.
  deepgram: {
    // Deepgram STT — only activates for English (en-US). Browser Web Speech API
    // handles Italian, French, Spanish, German, Dutch, Polish, Portuguese better.
    enabled: false,

    // ── Speaker Diarization (Premium Feature) ──
    // When enabled, Deepgram labels each utterance with a speaker tag (SPEAKER_00, SPEAKER_01…).
    // This populates interruption_count and speaking_share_ratio with real data.
    // Requires the WebSocket relay to pass diarize params through to Deepgram.
    // Cost: included in Deepgram pricing (no extra API call).
    diarize: false,
    diarize_version: 2,  // latest Deepgram diarization model
    speakers: 2           // expected number of speakers (increase for group settings)
  },

  /** ── OpenAI Whisper Diarization (Premium Tier — Alternative) ──
   *  OpenAI Whisper with speaker diarization via `timestamp_granularities: ["speaker"]`.
   *  Pros: potentially better accuracy for Italian, multi-language support.
   *  Cons: NOT streaming — audio must be recorded in chunks (~30s), sent to API,
   *        results returned with latency. Costs ~$0.006/min.
   *  Implementation: audio blob → Supabase Edge Function (proxy, keeps API key safe)
   *                   → OpenAI Whisper API → speaker-labeled transcript returned.
   *  Set enabled:true when you want to use OpenAI instead of (or in addition to) Deepgram.
   */
  openaiWhisper: {
    enabled: false,
    // API key stored server-side (Supabase Edge Function secrets) — never in client config
    // model: "whisper-1"
    // diarization: via timestamp_granularities
    // Premium pricing: 5 VC/min vs 1 VC/min standard captioning
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
  },

  /** Stripe payment integration */
  stripe: {
    /** Your Stripe publishable key (pk_test_... for testing, pk_live_... for production) */
    publishableKey: "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY",
    /** Supabase Edge Function URL for creating Checkout Sessions */
    checkoutFunctionUrl: null,
    /** Stripe Price IDs — create these in your Stripe Dashboard */
    prices: {
      "5hours":   "price_xxxxxxxxxxxxx",
      "20hours":  "price_xxxxxxxxxxxxx",
      "50hours":  "price_xxxxxxxxxxxxx",
      "90tokens": "price_xxxxxxxxxxxxx",
      "studente": "price_xxxxxxxxxxxxx",
      "professionale": "price_xxxxxxxxxxxxx",
      "completo": "price_xxxxxxxxxxxxx"
    }
  }
};
