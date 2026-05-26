# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sottotitoli is a free browser-based captioning, transcription, and real-time translation tool for live streams, presentations, and language learning. It runs entirely client-side with no build process - pure static HTML/CSS/JavaScript.

## Development

**No build, test, or lint commands** - this is a static web project. Serve files directly via any HTTP server or open HTML files in a browser.

For local development:
```bash
# Any simple HTTP server works
python -m http.server 8000
# or
npx serve .
```

## Architecture

### Communication Pattern

All pages communicate via WebSocket (`wss://sottotitoli-websocket.onrender.com`) using room IDs:

1. **Capture pages** (input): Capture speech/text and broadcast to a room
2. **Overlay/display pages** (output): Subscribe to a room and display/translate captions
3. **Room ID**: Stored in localStorage and passed via URL parameters

Message format:
- Final: `{"msg": true, "final": "text", "id": counter, "label": label}`
- Interim: `{"msg": true, "interm": "partial", "id": counter}`

### Supabase Integration

- Auth: Google OAuth via Supabase (`js/auth.js`)
- Database: Sessions, transcripts, user data, AI report requests
- Edge Functions: AI report processing (`supabase/functions/process-ai-reports/`)

### Translation

- MyMemory API for live translation
- Language pairs configured in `config.js`

### Key Files

**Main Pages:**
- `index.html` - Landing page
- `studio.html` - Main studio/recording interface
- `live.html` - Live captioning page
- `analysis.html` - Session analysis dashboard
- `account.html` - User account/profile page
- `goals.html` - Learning goals tracking
- `training.html` - Training/practice mode
- `app.html` - Application shell
- `tools.html` - Utilities and tools
- `capture-pro.html` - Enhanced capture mode
- `manual.html` - Manual text entry

**JavaScript:**
- `app.js` - Main application logic
- `config.js` - Configuration (WebSocket URL, translation providers, modes)
- `js/auth.js` - Supabase authentication
- `audio-recorder.js` - Audio recording module
- `lesson-report.js` - Lesson report generation
- `translation-providers.js` - Translation backend integrations
- `session-utils.js` - Session management utilities
- `security-utils.js` - Security utilities
- `speaker-analytics.js` - Speaker analysis
- `text-rules.js` - Text processing rules
- `ws-publisher.js` - WebSocket publishing

**Backend Services (separate repos):**
- `sottotitoli-websocket` - WebSocket relay server (Node.js)
- `sottotitoli-learning` - Learning/vocab analysis service (Node.js)

## Configuration

All key configuration is in `config.js`:
- `websocketUrl` - WebSocket server endpoint
- `translation` - Translation provider settings
- `analysis` - Analysis endpoint
- `modes` - Language/translation mode definitions

## External Dependencies

- Google Cloud Speech-to-Text (via browser)
- MyMemory Translation API
- Supabase (auth + database)
- OpenAI API (transcription, AI reports)
- WebSocket server (self-hosted on Render)

## Deployment

Hosted on GitHub Pages at `buoninglese.github.io/sottotitoli`.
Supabase for backend data.
Render for WebSocket server.
