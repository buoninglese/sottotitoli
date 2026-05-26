# Contributing to Sottotitoli

Thanks for contributing! This project has three repositories working together.

## Repositories

- **sottotitoli** — Frontend (static HTML/CSS/JS on GitHub Pages)
- **sottotitoli-websocket** — WebSocket server + speaker analysis (Node.js on Render)
- **sottotitoli-learning** — Lesson reports + dictionary lookups (Node.js on Render)

## Getting Started

1. Clone the relevant repo
2. Copy `.env.example` to `.env` and fill in values (where applicable)
3. For frontend: `python -m http.server 8000` or `npx serve .`
4. For backends: `npm install && npm start`

## Before Submitting

- Check that no real API keys or secrets are committed
- Update `.env.example` if you added new environment variables
- Update README if you changed setup steps or endpoints
- Test that existing functionality still works

## Code Style

- Frontend: ES5-compatible JavaScript (no build step)
- Backend: ES modules (websocket) / CommonJS (learning service)
- No linter is configured yet — keep formatting consistent with surrounding code

## Pull Request Checklist

- [ ] No secrets committed
- [ ] `.env.example` updated if needed
- [ ] README updated if needed
- [ ] Related issues referenced
