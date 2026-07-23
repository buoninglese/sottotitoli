# Sottotitoli 🎬

**Real-time AI captioning, transcription, and translation — directly in your browser.**

Live at [buoninglese.github.io/sottotitoli](https://buoninglese.github.io/sottotitoli)

## What is Sottotitoli?

Sottotitoli provides instant live captions and translations for streams, presentations, meetings, and language learning. It works entirely in the browser — no install, no account required for basic use.

- 🎤 **Live speech-to-text** in 8 languages
- 🌐 **Real-time translation** (Google Translate + MyMemory)
- 🧠 **AI lesson reports** with vocabulary analysis and CEFR leveling
- 🔊 **AI Voice conversation partner** (premium, speech-to-speech)
- 📊 **Session analytics** — speaker diarization, NGSL coverage, MATTR scores
- 💳 **Freemium** — free basic use, prepaid Voice Credits via Stripe for premium features

## Local Development

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

No build step. Pure static HTML/CSS/JS. Served by GitHub Pages.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system diagram and [AGENTS.md](AGENTS.md) for the full developer handoff file (conventions, pitfalls, multi-repo structure).

| Repo | Purpose |
|------|---------|
| `sottotitoli` (this one) | Frontend — all pages, UI, client logic |
| `sottotitoli-websocket` | WebSocket relay + OpenAI Whisper (Render) |
| `sottotitoli-learning` | Lesson reports + Oxford dictionary (Render) |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Auth & DB:** Supabase (Google OAuth, PostgreSQL, Edge Functions)
- **Payments:** Stripe Checkout + Webhooks
- **Real-time:** WebSocket relay on Render
- **AI:** OpenAI (transcription + reports), Hugging Face (voice)
- **Font:** Inter (Google Fonts)
- **Icons:** Font Awesome 6

## Contributing

Read [AGENTS.md](AGENTS.md) before making changes — it documents the CSS theming system, script loading order, multi-repo architecture, and common pitfalls.
