# Sottotitoli Learning Service

REST service for vocabulary analysis, lesson reports, and dictionary lookups.

## Purpose

- **Lesson reports**: Analyzes transcript lines against NGSL (New General Service List), Oxford 3000, and Longman vocabulary banks
- **Dictionary lookups**: Returns lemma-level data from local banks, optionally enriched via the Oxford Dictionaries API
- **Grammar detection**: Identifies grammar patterns from transcribed speech

## Local Setup

```bash
npm install
cp env-example.txt .env   # fill in your values
npm start                 # listens on PORT (default 4000)
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 4000) |
| `OXFORD_APP_ID` | Oxford Dictionaries API app ID |
| `OXFORD_APP_KEY` | Oxford Dictionaries API app key |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `INTERNAL_API_KEY` | Secret key for protecting internal endpoints |

## Endpoints

### POST `/lesson-report`

Analyzes a transcript and returns vocab/grammar analysis.

**Request body:**
```json
{
  "roomId": "optional-room-id",
  "config": { "vocab": { "sources": ["spoken-ngsl"] } },
  "transcriptLines": ["Hello, how are you?", "I am fine, thanks."]
}
```

### GET `/dictionary/:word`

Returns lexical data for a word from local banks and optionally Oxford.

**Parameters:**
- `useOxford=true` (default: true) — whether to query Oxford API

### GET `/debug/ngsl-forget`

Debug endpoint to verify NGSL lemma mapping.

## Data Sources

The service bundles vocabulary data from:
- **NGSL-Spoken 1.2** — spoken frequency list
- **Oxford 3000** — learner vocabulary
- **Longman Communication 3000** — frequency data
- **EGUI Grammar Units** — grammar patterns
- **Verb Patterns Book** — verb construction patterns

## Deployment

Deployed on Render. The server listens on the provided `PORT` environment variable.

## Security

- All endpoints support optional `x-api-key` header auth when `INTERNAL_API_KEY` is set
- CORS is restricted to `ALLOWED_ORIGINS`
- Oxford API calls are rate-limited (500/day total, 50/day per word)
- Request body limited to 1 MB
