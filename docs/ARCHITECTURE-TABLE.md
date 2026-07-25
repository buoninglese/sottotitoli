# Sottotitoli Executive OS — Architecture Reference

**v3.3 · 2026-07-25**

---

## System Topology

| Layer | Technology | Location | Purpose |
|-------|-----------|----------|---------|
| **Frontend** | Static HTML/CSS/JS | GitHub Pages | 5-tab assistant UI, captions, memory viewer |
| **Voice Iframe** | WebSocket client + AudioWorklet | Embedded in frontend | Mic capture, orb UI, audio playback |
| **Backend** | speech-to-speech 0.2.11 | HF Space `cpu-upgrade` | VAD → STT → LLM → TTS pipeline |
| **Memory** | localStorage JSON | Browser | 6 banks: decisions, beliefs, intel, family, violations, psychometrics |
| **Auth/DB** | Supabase `seb-va` project | Cloud | User accounts, credits (future) |

## Pipeline (Voice → Response)

| Stage | Model | Hardware | Latency | Notes |
|-------|-------|----------|---------|-------|
| **VAD** | Silero VAD (PyTorch JIT) | CPU | <1ms | 32ms silence, thresh 0.5, speculative reopen 1s |
| **STT** | Parakeet TDT 0.6B | CPU | ~200-500ms | Progressive transcription every 0.5s |
| **LLM** | Cerebras Gemma 4 31B | Cloud API | ~200ms | Streaming via responses-api |
| **TTS** | Kokoro 82M | CPU | ~500ms-1.5s | Voice: af_heart, 0.85x speed |
| **Total** | — | — | ~1.0-2.5s | Last speech → first audio |

## VAD Settings (Production)

| Parameter | Value | Effect |
|-----------|-------|--------|
| `min_silence_ms` | 32 | One silent frame triggers soft-end |
| `min_speech_ms` | 384 | Minimum active speech to start turn |
| `speculative_reopen_ms` | 1000 | 1s window to reopen a soft-ended turn |
| `thresh` | 0.5 | Speech probability threshold |
| `enable_live_transcription` | ON | Progressive STT while speaking |
| `num_pipelines` | 1 | Single user (was 3, OOM on 8GB) |

## Frontend Tabs

| Tab | Icon | Status | Function |
|-----|------|--------|----------|
| **AI Voice** | 🎤 | ✅ Live | Orb + live captions + session timer |
| **Files** | 📂 | ✅ Upload | Drop PDFs, code, text → AI context |
| **Progetti** | ⚡ | 🚧 UI ready | Automated background jobs |
| **Dashboard** | 📊 | ✅ Live | Executive metrics + Space status |
| **Storico** | 🕐 | ✅ Live | Session history, clickable transcripts |
| **Memoria** | 🧠 | ✅ Live | All 6 memory banks, search, export |

## Memory Banks

| Bank | Stores | Voice Command | Dashboard Card |
|------|--------|---------------|----------------|
| **decisions** | Decisions with expected outcomes, confidence, actual results | `Log decision: X, expected Y, confidence Z` | Decision Forge + Decay Alerts |
| **beliefs** | Personal beliefs about business, life, strategy | `I believe: X` or `Belief: X` | Beliefs count |
| **intel** | Market insights, facts, things to remember | `Intel: X` or `Remember: X` | World Intel count |
| **family** | Family events, kids milestones | `Family: X` or `Kids: X` | Family count |
| **violations** | Anti-goal violations | `Anti-goal: X` or `Violation: X` | Violations count (red) |
| **psychometrics** | Session analysis: scarcity, mood, commitments | Auto-generated after each session | Mood trend |

## Voice Commands

| Command | Example | Action |
|---------|---------|--------|
| `Log decision:` | `Log decision: take consulting gig, expected 6mo renewal, confidence 70` | → Decision Forge |
| `I believe:` | `I believe: direct sales beats marketplaces` | → Beliefs bank |
| `Intel:` / `Remember:` | `Remember: HF launched competing voice model` | → Intel bank |
| `Family:` / `Kids:` | `Family: Mia showed pattern recognition today` | → Family bank |
| `Anti-goal:` / `Violation:` | `Anti-goal: agreed to 9am Monday meeting` | → Violations log |
| `Ask:` / `Query:` / `Recall:` | `Ask: what did I decide about consulting?` | → Search all banks |
| `Outcome:` | `Outcome: client ghosted, lesson learned` | → Close latest open decision |
| `Simula:` | `Simula: tariffa` | → Simulation Chamber |
| `End sim` | `End sim` | → Exit simulation |
| `Backup:` / `Export:` | `Backup: now` | → Download JSON backup |

## Proactive Modules (v3.2–v3.3)

| Module | Trigger | Action |
|--------|---------|--------|
| **Session Auto-Scanner** | Session save | Scans for scarcity, commitments, anti-goal proximity, mood |
| **Prescription Bridge** | After scanner | Offers one-tap action (reframe, promote, log) |
| **Decision Decay** | Dashboard load | Amber (7d) / Red (30d) for unclosed decisions |
| **Strategic Void Detector** | Dashboard load | Flags bank asymmetries (beliefs without actions, etc.) |
| **Simulation Chamber** | `Simula:` command | 5 scenario personalities for high-stakes rehearsal |

## Client Timing

| Constant | Value | Effect |
|----------|-------|--------|
| `AI_SHOW_DELAY_MS` | 1000ms | Text bubble appears ~200ms into audio |
| `AI_MIN_VISIBLE_MS` | 4000ms | Min AI bubble visibility |
| Dashboard refresh | 10s | Space status + memory stats |
| Session auto-save | 5min idle | Flush to localStorage |
| Alert throttle | 1 per session | Max prescription prompts |
| Toast duration | 8-15s | Session intelligence / prescriptions |

## Limitations & Mitigations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| CPU TTS (500ms-1.5s) | Slower than GPU demo | Delayed text reveal, thinking indicator |
| 8GB RAM | Can't run 3 pipelines | Reduced to 1 (single user) |
| localStorage only | Lost on cache clear | Export button, nightly backup command |
| Single Space instance | 1 concurrent user | OK for personal use |
| No persistent backend storage | Files lost on refresh | Future: Supabase Storage |

## Quick Commands

```bash
# Local dev
cd /Users/sebastiankrauwel/sottotitoli && python3 -m http.server 8000

# Check Space
curl -s https://huggingface.co/api/spaces/s8t/Sottotitoli-voice/runtime

# Deploy Space
cd /tmp/sottotitoli-voice-t4 && git push

# Run locally (Apple Silicon)
source .venv/bin/activate && speech-to-speech --local_mac_optimal_settings

# Export memory
# Visit Dashboard → Export, or say "Backup: now"
```
