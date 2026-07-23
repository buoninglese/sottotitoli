# Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Studio   │  │ Overlay  │  │  Gara    │  │ AI Voice    │ │
│  │ (capture) │  │(display) │  │ (game)   │  │ (premium)   │ │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│        │              │             │                │        │
│        └──────────────┼─────────────┼────────────────┘        │
│                       │             │                         │
│              ┌────────┴─────────────┴──────────┐              │
│              │      WebSocket Relay             │              │
│              │   (sottotitoli-websocket)        │              │
│              │        on Render                 │              │
│              └────────┬─────────────┬───────────┘              │
│                       │             │                          │
└───────────────────────┼─────────────┼──────────────────────────┘
                        │             │
        ┌───────────────┴───┐   ┌─────┴──────────────┐
        │   OpenAI Whisper  │   │   OpenAI GPT-4o    │
        │  (transcription)  │   │   (AI reports)     │
        └───────────────────┘   └────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  Auth     │  │PostgreSQL│  │   Edge Functions          │  │
│  │ (Google   │  │  (RLS)   │  │  • create-checkout-session│  │
│  │  OAuth)   │  │          │  │  • stripe-webhook         │  │
│  └──────────┘  └──────────┘  │  • process-ai-reports     │  │
│                               │  • wordnik-proxy          │  │
│                               └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      STRIPE                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  Checkout Session │  │  Webhook → Supabase Edge Function│ │
│  │  (payment page)   │  │  → grant credits/tokens          │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL APIs                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │Google Translate│ │  MyMemory    │  │  Hugging Face    │   │
│  │(unofficial)   │  │ (free tier)  │  │  (voice models)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Capture:** Browser microphone → Web Speech API → interim transcripts
2. **Relay:** Final transcript → WebSocket → all clients in room
3. **Translation:** Caption text → Google Translate / MyMemory → translated caption
4. **Analysis:** Session data → Supabase → OpenAI → AI report
5. **Payments:** Frontend → Supabase Edge Function → Stripe → webhook → credits granted
6. **Voice:** Browser mic → HF speech-to-speech WebSocket → TTS audio back

## Room-Based Communication

All real-time communication uses room IDs:
- Room IDs stored in URL params and `localStorage`
- WebSocket relay broadcasts to all clients in the same room
- No authentication on WebSocket connections (rooms are the security boundary)
- `security-utils.js` warns about predictable room names

## Frontend Architecture

- **No build step** — static HTML/CSS/JS served by GitHub Pages
- **Config:** `config.js` (gitignored, but deployed for GitHub Pages)
- **Auth:** `js/auth.js` — Supabase Google OAuth
- **Theme:** `js/theme.js` — day/night mode via `data-theme` attribute on `<html>`
- **CSS Variables:** Each page defines its own `:root` / `[data-theme="dark"]` palette
- **Script loading order is critical:** config.js → auth.js → theme.js → page scripts

