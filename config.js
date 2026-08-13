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

  /** Auth redirect URL (after Google OAuth login) */
  AUTH_REDIRECT_URL: "https://www.sottotitoli.pro/panoramica.html",

  posthogKey: "phc_tVHWvFyYxModWrjFp7NeAX72SfYthjTGo5JdBJGoV8DY",

  /** Wordnik proxy URL (Supabase Edge Function). Key is server-side only.
      Deploy with: supabase functions deploy wordnik-proxy
      Set secret: supabase secrets set WORDNIK_API_KEY=your_key */
  wordnikProxyUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/wordnik-proxy",

  /** Translation provider settings */
  translation: {
    /** Translation provider: "proxy" = server-side with caching + fallback.
        "auto" = Google first with MyMemory fallback (client-side).
        Also accepts "google" or "mymemory" for single-provider mode. */
    provider: "proxy",
    /** Supabase Edge Function URL for the translation proxy.
        Deploy with: supabase functions deploy translate --no-verify-jwt */
    proxyUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/translate",
    myMemoryBase: "https://api.mymemory.translated.net/get"
  },

  /** Analysis / speaker diarization endpoint */
  analysis: {
    speakerEndpoint: "https://sottotitoli-websocket.onrender.com/analyze-speakers"
  },

  /** CEFR vocabulary API (sottotitoli-websocket Render service + Words-CEFR-Dataset) */
  cefrApiUrl: "https://sottotitoli-websocket.onrender.com/api/cefr",

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

  /** AI Voice TTS URLs — used by hugging-voice-* iframes.
   *  Local dev: "http://localhost:8765" (Custom), ":8766" (Base), ":8767" (Kokoro)
   *  Production: HF Spaces (start them if sleeping) */
  aiVoice: {
    customVoiceUrl: "wss://s8t-sottotitoli-voice.hf.space/v1/realtime",
    baseVoiceUrl:   "http://localhost:8766",
    kokoroVoiceUrl: "wss://s8t-sottotitoli-voice.hf.space/v1/realtime"
  },

  /** AI Voice — Voice Conversation Partner (Premium) */
  voicePartner: {
    /** WebSocket URL for the speech-to-speech server */
    serverUrl: "wss://s8t-sottotitoli-voice.hf.space/v1/realtime",
    /** Voice Credits per hour */
    vcPerHour: 50,
    /** Minimum balance to start */
    minBalance: 10
  },

  /** Hugging Face token for Inference Providers (Cerebras via Router).
   *  Used by AI Voice browser mode for direct LLM calls.
   *  Create at https://huggingface.co/settings/tokens
   *  Needs "Make calls to Inference Providers" permission.
   *  Real token lives in config.secrets.js (gitignored).
   *  For production, the hf-proxy Edge Function injects it server-side. */
  hfToken: "hf_...",  // real value in config.secrets.js (gitignored)
  /** HF Proxy URL — server-side Edge Function that injects the HF token.
      Deploy with: supabase functions deploy hf-proxy --no-verify-jwt
      Set secret: supabase secrets set HF_TOKEN=hf_... */
  hfProxyUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/hf-proxy",

  /** Onboarding Starter Report AI endpoint.
   *  Local dev: "http://localhost:8771/starter-report" (tmp/report-ai-space)
   *  Production: Supabase Edge Function (deployed) */
  starterReportUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/starter-report",

  /** Learner Mission AI endpoint (Phase 2).
   *  Local dev: "http://localhost:8788/generate-learner-content" (optional)
   *  Production: Supabase Edge Function (deployed) */
  generateLearnerContentUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-learner-content",
  generateWordBankUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-word-bank",

  /** Stripe payment integration */
  stripe: {
    /** Your Stripe publishable key (pk_test_... for testing, pk_live_... for production) */
    publishableKey: "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY",
    /** Supabase Edge Function URL for creating Checkout Sessions */
    checkoutFunctionUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/create-checkout-session",
    /** Stripe Price IDs — must match the PRICE_MAP in supabase/functions/create-checkout-session */
    prices: {
      "sottotitoli_starter":  "price_1TmsOY1gZ1iapxeouZqGzPbQ",
      "sottotitoli_standard": "price_1TmsOb1gZ1iapxeoLTmIW3QV",
      "sottotitoli_premium":  "price_1TmsOf1gZ1iapxeoAo9mGSNV",
      "sottotitoli_credits":  "price_1TmsOi1gZ1iapxeoRB2FnP5w"
    }
  }
};
