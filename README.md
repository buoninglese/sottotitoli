# Sottotitoli

Real-time AI captioning, transcription, and translation — directly in your browser.

**Live:** [sottotitoli.pro](https://www.sottotitoli.pro) · [buoninglese.github.io/sottotitoli](https://buoninglese.github.io/sottotitoli)

## Quick Start

```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8000
# → http://localhost:8000
```

No build step. Static HTML/CSS/JS served by GitHub Pages.

## Documentation

| For | Read |
|-----|------|
| **AI coding agents** | **[AGENTS.md](AGENTS.md)** — architecture, conventions, key files, pitfalls |
| **Architecture decisions** | **[docs/DECISIONS.md](docs/DECISIONS.md)** — 11 ADRs, why we built it this way |
| **AI agent deep dives** | **[docs/ai/README.md](docs/ai/README.md)** — 28 interlinked reference docs |
| **Business** | **[docs/ai/business-info.md](docs/ai/business-info.md)** — pricing, Stripe, legal |
| **Architecture** | **[docs/ai/architecture.md](docs/ai/architecture.md)** — system diagrams, data flows |
| **WebSocket protocol** | **[docs/ai/websocket-protocol.md](docs/ai/websocket-protocol.md)** — message contract, room lifecycle |
| **Error codes** | **[docs/ERROR-CODES.md](docs/ERROR-CODES.md)** — 18 errors with recovery paths |
| **Privacy** | **[PRIVACY.md](PRIVACY.md)** — privacy policy |

## Stack

- **Frontend:** HTML/CSS/JS (static, no framework)
- **Hosting:** GitHub Pages + custom domain
- **Backend:** Supabase (auth, DB, edge functions) + Render (WebSocket relay)
- **Payments:** Stripe (test mode)
- **UI:** Italian. Code comments: English.
- **Business:** Freemium — 15 min/week free, prepaid credit packs
