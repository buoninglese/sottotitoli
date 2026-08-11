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

  /** PostHog project API key (find in PostHog → Project Settings → API key) */
  posthogKey: "phx_YOUR_POSTHOG_KEY",

  /** Wordnik proxy URL (Supabase Edge Function). Key is server-side only.
      Deploy with: supabase functions deploy wordnik-proxy
      Set secret: supabase secrets set WORDNIK_API_KEY=your_key */
  wordnikProxyUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/wordnik-proxy",

  /** HuggingFace API token for Kokoro-82M TTS (text-to-speech).
      Get your free token at https://huggingface.co/settings/tokens */
  kokoroToken: "hf_your_token_here",

  /** CEFR vocabulary API (sottotitoli-websocket Render service + Words-CEFR-Dataset) */
  cefrApiUrl: "https://sottotitoli-websocket.onrender.com/api/cefr",

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

  /** AI Voice conversation partner (speech-to-speech).
   *  Local dev: "http://localhost:8765" (CustomVoice), ":8766" (Base/cloning), ":8767" (Kokoro/53 voices)
   *  Production: deploy a speech-to-speech HF Space and use its URL, e.g.
   *  "https://buoninglese-sottotitoli-voice.hf.space" */
  aiVoice: {
    customVoiceUrl: "http://localhost:8765",
    baseVoiceUrl:   "http://localhost:8766",
    kokoroVoiceUrl: "http://localhost:8767"
  },

  /** Hugging Face token for Inference Providers (Cerebras, etc.).
   *  Create at https://huggingface.co/settings/tokens
   *  Needs "Make calls to Inference Providers" permission.
   *  Real token lives in config.secrets.js (gitignored).
   *  For production, the hf-proxy Edge Function injects it server-side. */
  hfToken: "hf_...",
  /** HF Proxy URL — server-side Edge Function that injects the HF token.
      Deploy with: supabase functions deploy hf-proxy --no-verify-jwt
      Set secret: supabase secrets set HF_TOKEN=hf_... */
  hfProxyUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/hf-proxy",

  /** Onboarding Starter Report AI endpoint.
   *  Deploy with: supabase functions deploy starter-report --no-verify-jwt
   *  Requires secret: supabase secrets set OPENAI_API_KEY=sk-... */
  starterReportUrl: "https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/starter-report",

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
  /** AI Voice — Voice Conversation Partner (Premium feature) */
  voicePartner: {
    /** WebSocket URL of the speech-to-speech server.
        Deploy from: https://github.com/huggingface/speech-to-speech
        Options:
        - HF Space (free CPU): duplicate the space, get URL from settings
        - Render: deploy as Docker web service
        - Local: 'ws://localhost:8080/v1/realtime' */
    serverUrl: null,

    /** Voice Credits consumed per hour of conversation */
    vcPerHour: 50,

    /** Minimum VC balance required to start a session */
    minBalance: 10
  },

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
