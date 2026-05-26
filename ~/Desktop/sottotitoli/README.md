# Sottotitoli

Live captioning and translation tool for language learners.

## Overview

Sottotitoli is a static frontend deployed on GitHub Pages. It uses the browser's built-in Speech Recognition API for real-time captioning, MyMemory for translation, and a custom WebSocket backend for broadcasting captions to overlay displays.

## Architecture

```
Browser (Chrome/Edge)
  ├── Speech Recognition (built-in Web Speech API)
  ├── Supabase Auth (Google sign-in)
  ├── Supabase DB (session storage)
  ├── WebSocket → Render (sottotitoli-websocket)
  ├── Translation API → MyMemory
  └── Learning API → Render (sottotitoli-learning)
```

## Repositories

| Repo | Purpose | URL |
|------|---------|-----|
| **sottotitoli** | Frontend (this repo) | https://buoninglese.github.io/sottotitoli |
| **sottotitoli-websocket** | WebSocket + speaker analysis | Render |
| **sottotitoli-learning** | Lesson reports + dictionary | Render |

## Local Setup

1. Clone the repo
2. Copy `js/config.example.js` to `js/config.js` and fill in your values
3. Serve locally:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
4. Open `http://localhost:8000/studio.html`

## Configuration

All config lives in `config.js` (not committed). See `js/config.example.js` for the template.

Key settings:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Supabase project
- `WEBSOCKET_URL` — WebSocket backend URL
- `LEARNING_API_URL` — Learning service URL
- `AUTH_REDIRECT_URL` — Where Google OAuth redirects to

## Deployment

- **Frontend**: Push to `main` → GitHub Pages auto-deploys
- **Backends**: Deployed separately on Render

## Supported Languages

8 languages: English, Italian, French, German, Spanish, Portuguese, Dutch, Polish

## Security

- Never commit real API keys
- Use `.env.example` files for templates
- Supabase anon key is publishable-safe (RLS protects actual data)
