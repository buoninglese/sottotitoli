# Sottotitoli AI Voice — Complete Architecture Report

**Date:** 2026-07-25 · **Version:** v2.3  
**Live:** `buoninglese.github.io/sottotitoli/ai-voice-mockup.html`

---

## 1. System Overview

Sottotitoli AI Voice is a real-time voice assistant that combines speech-to-text, a large language model, and text-to-speech in a single pipeline. It's built as a **hybrid architecture**: the heavy AI inference runs in a Hugging Face Docker Space, while the frontend is static HTML/JS served from GitHub Pages.

```
┌─────────────────────────────────────────────────────────┐
│  Browser (your laptop / phone)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ai-voice-mockup.html (GitHub Pages)              │  │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │ Voice   │  │ Files    │  │ Dashboard      │   │  │
│  │  │ tab     │  │ tab      │  │ tab            │   │  │
│  │  │ (orb +  │  │ (uploads)│  │ (live stats)   │   │  │
│  │  │ captions│  │          │  │                │   │  │
│  │  └─────────┘  └──────────┘  └────────────────┘   │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  hugging-voice/index.html (iframe)           │  │  │
│  │  │  • Orb UI + mic capture                      │  │  │
│  │  │  • s2s-ws-client.js → WebSocket              │  │  │
│  │  │  • AudioWorklet (mic in / speaker out)       │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│         │  WebSocket (wss://)                            │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  HF Space: s8t/Sottotitoli-voice (cpu-upgrade)          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  speech-to-speech 0.2.11                          │  │
│  │  ┌──────────┐  ┌────────┐  ┌────────┐  ┌──────┐  │  │
│  │  │ VAD      │→│ STT    │→│ LLM    │→│ TTS  │  │  │
│  │  │ Silero   │  │Parakeet│  │Cerebras│  │Kokoro│  │  │
│  │  │ 32ms     │  │ nano   │  │ Gemma  │  │ 82M  │  │  │
│  │  │ silence  │  │ ~200ms │  │ ~200ms │  │~500ms│  │  │
│  │  └──────────┘  └────────┘  └────────┘  └──────┘  │  │
│  │                                                    │  │
│  │  3 concurrent pipelines (--num_pipelines 3)        │  │
│  │  OpenAI Realtime API protocol (WebSocket)          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Catalog

### 2.1 Frontend (`ai-voice-mockup.html`)

| Component | Tech | Purpose |
|-----------|------|---------|
| **App shell** | CSS Grid, custom properties | Responsive 2-column layout (sidebar + workspace) |
| **Sidebar** | 5 tabs + bottom utilities | Navigation: Voice, Files, Projects, Dashboard, History |
| **Header** | Top-level tabs | Quick-access: Voice, Transcripts, Vocabolario, Grammatica |
| **Caption stage** | Floating bubbles | Live captions during conversation (single per role, instant swap) |
| **Transcript overlay** | Scrollable panel | Full conversation history (stacked, persistent) |
| **File upload** | `<input type="file">` | Accepts PDF, TXT, MD, CSV, JSON, code files |
| **Dashboard** | Live stats cards | Space status (HF API poll), session timer, message/file counts |
| **History** | localStorage | Session storage with clickable rows, transcript replay |
| **Theme toggle** | `data-theme` attribute | Day/night mode with CSS variables |

**Key timing constants:**

| Constant | Value | Effect |
|----------|-------|--------|
| `AI_SHOW_DELAY_MS` | 1000ms | AI bubble appears ~200ms into audio playback |
| `captionEnter` | 500ms | Bubble enter animation (blur-in + float-up) |
| `thinkPulse` | 2.2s | Thinking indicator pulse cycle |
| Dashboard refresh | 10s | Space status + stats poll interval |
| Session auto-save | 5min idle | History flush to localStorage |

### 2.2 Voice Iframe (`hugging-voice/index.html` + `voice-core/`)

| File | Role |
|------|------|
| `index.html` | Orb UI, voice picker, settings, chat panel |
| `main.js` | Connection lifecycle, queue/join flow, event routing |
| `s2s-ws-client.js` | WebSocket client, audio capture/playback, protocol translation |
| `ui/chat.js` | Transcript display, tool results |
| `worklets/mic-capture.js` | AudioWorklet for microphone |
| `worklets/audio-playback.js` | AudioWorklet for speaker output |

**Communication protocol:** OpenAI Realtime API (WebSocket)
- `session.update` → configure voice, instructions
- `input_audio_buffer.append` → mic audio (PCM16, 16kHz, base64)
- `response.output_audio.delta` → TTS audio (PCM16, 16kHz, base64)
- `response.output_audio_transcript.delta` → streaming AI text
- `conversation.item.input_audio_transcription` → user transcript

**Event forwarding to parent:**  
`main.js` posts `transcript-final`, `live-transcript`, and `status` messages to `window.parent` when `__EMBED_MODE__` is active (`?captions=1`).

### 2.3 HF Space Backend (`s8t/Sottotitoli-voice`)

**Dockerfile:** `f9b2fe4`  
**Hardware:** `cpu-upgrade` (2 vCPU, 8GB RAM)  
**Base image:** `python:3.12-slim`

| Pipeline Stage | Model | Latency (CPU) | Notes |
|---------------|-------|---------------|-------|
| **VAD** | Silero VAD (PyTorch JIT) | <1ms | 32ms silence threshold, 0.5 sensitivity |
| **STT** | Parakeet TDT 0.6B | ~200-500ms | Nano-parakeet, progressive transcription every 0.5s |
| **LLM** | Cerebras Gemma 4 31B | ~200ms | Cloud API via `responses-api`, streaming |
| **TTS** | Kokoro 82M | ~500ms-1.5s | Purpose-built for CPU, voice `af_heart`, 0.85x speed |

**Production VAD settings:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `min_silence_ms` | 32 | One silent frame triggers soft-end |
| `min_speech_ms` | 384 | Minimum active speech to start turn |
| `min_speech_continuation_ms` | 192 | Hysteresis for reopening turns |
| `speculative_reopen_ms` | 1000 | Window to reopen a soft-ended turn |
| `thresh` | 0.5 | Speech probability threshold |
| `enable_live_transcription` | ON | Progressive STT while user speaks |

**Total pipeline latency (P50, CPU):** ~1.0–2.5s from last speech to first audio.  
*(GPU equivalent: ~1.13s — the gap is hardware, not configuration.)*

### 2.4 Local Development Environment

| Tool | Status | Notes |
|------|--------|------|
| `speech-to-speech` 0.2.11 | ✅ Installed (`.venv`) | Full pipeline locally |
| Parakeet STT | ✅ MLX GPU | Apple Silicon, ~30ms |
| Kokoro TTS | ✅ CPU | ~500ms-1.5s |
| MLX framework | ✅ | Apple Silicon GPU acceleration |
| WebSocket relay | ❌ Not local | Uses HF Space for inference |

---

## 3. Data Flow — A Complete Conversation

```
1. User taps orb → mic activates → AudioWorklet captures 40ms chunks
                    ↓
2. PCM16 16kHz audio → WebSocket → HF Space
                    ↓
3. VAD detects speech (prob ≥ 0.5) → turn starts
                    ↓
4. Progressive STT every 0.5s → partial transcripts → browser (live captions)
                    ↓
5. User pauses 32ms → VAD soft-ends turn → final STT → full transcript
                    ↓
6. Transcript → LLM (Cerebras) → streaming text response
                    ↓
7. Text deltas → browser (shown as "thinking" bubble)
                    ↓
8. Text → Kokoro TTS → audio chunks → WebSocket → browser
                    ↓
9. AudioWorklet plays audio → after ~1000ms, final text bubble appears
                    ↓
10. AI finishes → status "connected" → ready for next turn
```

---

## 4. Current Capabilities

### ✅ Working Today

| Feature | How |
|---------|-----|
| Real-time voice conversation | Orb → Space → Kokoro voice response |
| Live captions | Progressive Parakeet STT, streaming text |
| Transcript history | Scrollable overlay, all messages persisted |
| File upload | PDF, TXT, MD, CSV, code — stored in browser memory |
| Session history | Auto-saved to localStorage, clickable rows |
| Dashboard | Live Space status, session timer, message count |
| Theme toggle | Day/night with CSS variables |
| Dual caption mode | Single-bubble stage + stacked transcript overlay |

### 🚧 UI Ready, Backend Pending

| Feature | Status |
|---------|--------|
| **Projects** (automated jobs) | Tab + info dot exist; needs scheduler + API routes |
| **Files → AI context** | Files uploaded but not yet injected into LLM context |
| **Dashboard API feeds** | Stats cards exist; needs real data sources |

---

## 5. Usage Suggestions

### 5.1 As a Language Learning Assistant
- **Voice tab:** Practice speaking Italian — AI responds in Italian, corrects your grammar
- **Transcripts tab:** Review your conversation, spot mistakes
- **Vocabolario tab:** (existing) words collected during sessions
- **Files tab:** Upload a textbook PDF, ask the AI to explain concepts from it

### 5.2 As a Personal Assistant
- **Voice tab:** "Riassumi la mia giornata" / "What's on my calendar tomorrow?"
- **Files tab:** Upload meeting notes → AI summarizes
- **Dashboard:** Check Space health, session stats

### 5.3 As an Automated Agent (Future — Projects tab)
- **Morning briefing:** Every day at 7am, scrape calendar + weather + news → summarize via LLM → email you
- **Voice-triggered actions:** Say "send report" → AI generates report from session → emails it
- **API watcher:** Monitor a data source → alert you via voice when something changes
- **Batch processing:** Upload 50 files → AI processes them overnight → results in Dashboard

### 5.4 As a Teaching Tool
- **Grammar tab:** AI explains Italian grammar rules based on mistakes in your transcripts
- **Files tab:** Upload student essays → AI provides feedback
- **History tab:** Track progress over time, see improvement

### 5.5 As a Development Playground
- **Local Parakeet:** Run STT on your Mac with MLX GPU — 30ms latency
- **Swap models:** Change LLM (Cerebras → local Llama), TTS (Kokoro → Qwen3 on GPU)
- **Add tools:** Register function tools → AI calls your APIs
- **Custom workflows:** Chain voice → STT → your code → TTS response

---

## 6. Architecture Strengths

| Strength | Detail |
|----------|--------|
| **Separation of concerns** | Frontend (static) vs inference (Docker) — deploy independently |
| **OpenAI Realtime protocol** | Standard protocol — swap backend without frontend changes |
| **Progressive STT** | Live captions while speaking — no dead air |
| **Speculative turn detection** | 32ms soft-end + 1s reopen — feels instant |
| **Single-bubble UX** | Clean, no clutter — one bubble per role |
| **localStorage persistence** | Sessions survive page reloads, no server needed |
| **CSS variable theming** | Day/night modes work across all tabs |
| **CPU-optimized TTS** | Kokoro 82M runs on free-tier hardware |

---

## 7. Architecture Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| **CPU TTS latency** | 500ms-1.5s per utterance | Perceptual tricks: thinking bubble, delayed text reveal |
| **No GPU** | 2-3× slower than production demo | Accept trade-off or upgrade to T4 (~$0.60/hr) |
| **No persistent backend storage** | Files lost on page refresh | Could add Supabase/S3 |
| **Single Space** | 3 concurrent users max | Add load balancer for scale |
| **Browser-only files** | Uploaded files stay in JS memory | Need backend storage for persistence |
| **No auth on Space** | Anyone can connect via WebSocket | Could add token validation |

---

## 8. Next Steps (Priority Order)

### Immediate (hours)
1. **Files → AI context:** Read uploaded file contents, inject into LLM system prompt via `session.update`
2. **Dashboard API feeds:** Add a configurable data source widget

### Short-term (days)
3. **Projects tab v1:** Simple cron-like scheduler in a Supabase edge function
4. **Persistent file storage:** Upload files to Supabase Storage, serve to AI
5. **History full-text:** Store complete transcripts (not just previews) in localStorage or Supabase

### Medium-term (weeks)
6. **T4 GPU upgrade:** Move Space to GPU for production-speed inference
7. **Multi-user:** Load balancer + session pool for concurrent users
8. **Voice cloning:** Custom Kokoro voice from user recordings

### Long-term (months)
9. **Plugin system:** Third-party API integrations (Notion, Google Calendar, Slack)
10. **Mobile PWA:** Offline-capable, push notifications for project results
11. **Local-first mode:** Run entire pipeline on-device (Apple Silicon MLX)

---

## 9. File Map

```
sottotitoli/
├── ai-voice-mockup.html      ← Main app: sidebar, tabs, captions, dashboard
├── hugging-voice/             ← Voice orb iframe (synced from voice-core/)
│   ├── index.html
│   ├── main.js                ← Connection lifecycle, event routing
│   ├── style.css
│   ├── ui/chat.js             ← Transcript display
│   ├── worklets/              ← AudioWorklet processors
│   └── ws/s2s-ws-client.js    ← WebSocket client
├── voice-core/                ← Source of truth for synced files
│   ├── ws/s2s-ws-client.js
│   ├── main.js
│   ├── ui/
│   └── worklets/
└── docs/
    └── ARCHITECTURE-VOICE.md  ← This document

sottotitoli-voice-t4/          ← HF Space repo (separate)
├── Dockerfile                 ← Pipeline config
├── app.py                     ← (unused, Shiny template)
└── requirements.txt           ← (unused, Shiny template)
```

---

## 10. Quick Reference — Commands

```bash
# Frontend dev server
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8000
# → http://localhost:8000/ai-voice-mockup.html

# Check Space status
curl -s "https://huggingface.co/api/spaces/s8t/Sottotitoli-voice/runtime"

# Deploy Space changes
cd /tmp/sottotitoli-voice-t4
git add Dockerfile && git commit -m "..." && git push

# Run full pipeline locally (Apple Silicon)
source .venv/bin/activate
speech-to-speech --local_mac_optimal_settings

# Run Parakeet STT only
speech-to-speech --stt parakeet-tdt --mode local --tts none
```
