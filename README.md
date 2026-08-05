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
| **AI agent deep dives** | **[docs/ai/README.md](docs/ai/README.md)** — 11 interlinked reference docs |
| **Designers** | **[DESIGN.md](DESIGN.md)** — visual design system, colors, typography |
| **Business** | **[docs/ai/business-info.md](docs/ai/business-info.md)** — pricing, Stripe, legal |
| **Backend** | **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — system diagrams, data flows |

## Stack

- **Frontend:** HTML/CSS/JS (static, no framework)
- **Hosting:** GitHub Pages + custom domain
- **Backend:** Supabase (auth, DB, edge functions) + Render (WebSocket relay)
- **Payments:** Stripe (test mode)
- **UI:** Italian. Code comments: English.
- **Business:** Freemium — 15 min/week free, prepaid credit packs
