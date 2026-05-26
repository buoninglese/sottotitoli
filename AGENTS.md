# AGENTS.md — AI Agent Handoff File

This file helps future AI coding agents understand the project and avoid common mistakes.

## Repositories

| Name | URL | Language | Purpose |
|------|-----|----------|---------|
| `sottotitoli` | github.com/buoninglese/sottotitoli | Static JS/HTML/CSS | Frontend on GitHub Pages |
| `sottotitoli-websocket` | github.com/buoninglese/sottotitoli-websocket | Node.js (ESM) | WebSocket relay + OpenAI Whisper |
| `sottotitoli-learning` | github.com/buoninglese/sottotitoli-learning | Node.js (CJS) | Lesson reports + Oxford dictionary |

## Key Rules

1. **Never commit real API keys** — use `.env` files and `.env.example` templates
2. **Frontend has no build step** — pure static files served by GitHub Pages
3. **Supabase anon key is publishable-safe** but keep it in `config.js` (gitignored)
4. **All three repos are deployed separately** — Render for backends, GitHub Pages for frontend
5. **CLAUDE.md** in each repo has project-specific guidance — read it first

## Common Mistakes to Avoid

- Copying Caption.Ninja branding back in (already replaced with Sottotitoli)
- Hardcoding URLs that should come from config
- Editing files in `Users/` directory (it's a stale copy inside the workspace)
- Writing to `~/Desktop/...` paths from the workspace — these don't resolve to the real Desktop

## What was done recently

- issues1.csv: Cleaned up gitignore, env examples, READMEs, CORS, auth redirects, branding, CI/CD
- issues2.csv (in progress): Security policy, contributing guide, changelog, issue/PR templates, privacy notes
