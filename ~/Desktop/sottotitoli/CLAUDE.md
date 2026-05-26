# CLAUDE.md — Sottotitoli

This file provides guidance to AI coding agents when working with this repository.

## Project Overview

Sottotitoli is a live captioning and translation tool for language learners.
It runs as a static frontend on GitHub Pages with Supabase for auth/sessions and two Render-hosted backends.

## Repositories

- **sottotitoli** — Frontend (this repo). Pure static HTML/CSS/JavaScript. No build step.
- **sottotitoli-websocket** — WebSocket server (Express + ws). Handles real-time caption broadcasting and speaker analysis (OpenAI Whisper).
- **sottotitoli-learning** — REST service for lesson reports, vocab analysis, and dictionary lookups.

## Architecture

- **Frontend**: GitHub Pages at `https://buoninglese.github.io/sottotitoli/`
- **Auth**: Supabase (URL + anon key in config.js)
- **WebSocket**: Render service at `wss://sottotitoli-websocket.onrender.com`
- **Learning API**: Render service (for lesson reports, vocab analysis)
- **Speaker Analysis**: POST to WebSocket service `/analyze-speakers` endpoint

## Key Files

- `app.js` — Main application logic (speech recognition, socket, translation, session management)
- `studio.html` — Main workspace with Caption/Translate/Report/Session tabs
- `config.js` — Configuration: websocket URL, Supabase URL, mode definitions
- `js/auth.js` — Supabase auth setup and Google sign-in
- `session-utils.js` — Utility functions (room IDs, word count, clipboard, download)
- `translation-providers.js` — Translation via MyMemory API
- `ws-publisher.js` — WebSocket publisher with reconnection logic
- `overlay.html` — Single-caption overlay
- `overlay-roll.html` — Rolling/scrolling overlay

## Local Development

```bash
# Any simple HTTP server works
python -m http.server 8000
# or
npx serve .
```

## Important Rules

- No build step — this is a static site
- All config in `config.js` and `js/auth.js` 
- Never commit `.env` files or real API keys
- 8 supported languages: en, it, fr, de, es, pt, nl, pl
- Modes defined in `config.js` → `window.SOTTOTITOLI_CONFIG.modes`
