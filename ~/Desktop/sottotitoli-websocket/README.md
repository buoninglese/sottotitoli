# Sottotitoli WebSocket Server

Real-time caption broadcasting and speaker analysis service for the Sottotitoli platform.

## Purpose

- **WebSocket server**: Broadcasts caption and translation payloads to connected overlay clients in real time
- **Speaker analysis**: Accepts uploaded audio via REST, transcribes with OpenAI Whisper, and returns diarized speaker segments

## Local Setup

```bash
npm install
cp env-example.txt .env   # fill in your values
npm start                 # listens on PORT (default 3000)
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `OPENAI_API_KEY` | OpenAI API key for Whisper transcription |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `INTERNAL_API_KEY` | Secret key for protecting internal endpoints |

## Endpoints

### WebSocket

`ws://localhost:3000?room=YOUR_ROOM_ID`

- **Join room**: Send `{ "join": "roomId" }`
- **Publish caption**: Send `{ "type": "caption", "room": "...", "final": "...", ... }`

### REST

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/analyze-speakers` | POST | Upload audio for diarization (multipart, field `file`) |

## Deployment

Deployed on Render. The server listens on the provided `PORT` environment variable.

## Security

- All endpoints support optional `x-api-key` header auth when `INTERNAL_API_KEY` is set
- CORS is restricted to `ALLOWED_ORIGINS`
- Uploads are limited to 25 MB
