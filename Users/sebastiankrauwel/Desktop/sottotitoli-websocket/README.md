# sottotitoli-websocket

WebSocket relay server for Sottotitoli. Handles real-time caption broadcasting between capture pages and display overlays, plus OpenAI speaker diarization.

## Features

- **WebSocket rooms** — clients join rooms by ID to send/receive captions
- **Speaker diarization** — POST `/analyze-speakers` with an audio file to get speaker-segmented transcripts via OpenAI
- **Health check** — GET `/health` shows room count and config status

## Quick Start

```bash
cp .env.example .env
# Edit .env with your OPENAI_API_KEY (required for speaker analysis)

npm install
npm start
```

Runs on port `8080` by default (override with `PORT` env var).

## API

### WebSocket `ws://host:PORT?room=ROOM_ID`

| Message | Description |
|---------|-------------|
| `{"final": "text", "id": 1, "label": "Speaker"}` | Broadcasts final caption to room |
| `{"interm": "partial", "id": 1}` | Broadcasts interim (partial) text |
| `{"join": "ROOM_ID"}` | Switch to a different room |

### REST Endpoints

**`GET /health`** — Returns server status and room list.

**`POST /analyze-speakers`** — Upload audio for speaker diarization.
- Accepts `multipart/form-data` with field `file`
- Uses OpenAI `gpt-4o-transcribe-diarize` model
- Returns diarized transcript with per-speaker analytics

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | HTTP/WS server port |
| `OPENAI_API_KEY` | For speaker analysis | — | OpenAI API key for `/analyze-speakers` |

## Deployment

Deployed on [Render](https://render.com) as a Web Service.
