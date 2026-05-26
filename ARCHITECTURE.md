# Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (User)                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │          sottotitoli (GitHub Pages)               │   │
│  │                                                   │   │
│  │  studio.html  live.html  analysis.html  app.html  │   │
│  │                                                   │   │
│  │  Config: config.js   Auth: js/auth.js             │   │
│  └──────┬──────────────┬──────────────┬──────────────┘   │
│         │              │              │                   │
└─────────┼──────────────┼──────────────┼───────────────────┘
          │              │              │
          │ WebSocket    │ REST         │ REST
          ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│  Render         │ │  Render         │ │  Supabase           │
│  WebSocket      │ │  Learning       │ │  ───────────        │
│  Server         │ │  Service        │ │  Auth (Google OAuth)│
│  ──────────     │ │  ──────────     │ │  Database:          │
│  Broadcasts     │ │  /lesson-report │ │  sessions           │
│  captions to    │ │  /dictionary    │ │  transcripts        │
│  overlay pages  │ │  /debug/*       │ │  ai_report_requests │
│  Speaker        │ │                 │ │  session_ai_reports │
│  analysis via   │ │  Vocab banks:   │ │                     │
│  OpenAI Whisper │ │  NGSL, Oxford,  │ │  Edge Functions:    │
│                 │ │  Longman        │ │  process-ai-reports │
└────────┬────────┘ └────────┬────────┘ └─────────────────────┘
         │                   │
         │ OpenAI API        │ Oxford Dictionaries API
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│  OpenAI         │ │  Oxford         │
│  Whisper        │ │  Dictionaries   │
│  (transcription)│ │  (word lookups) │
└─────────────────┘ └─────────────────┘
```
