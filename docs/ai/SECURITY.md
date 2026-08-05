# Security Policy

> Last updated: 2026-08-06
> Cross-refs: `AGENTS.md` · `deploy-runbook.md` · `coding-procedures.md`

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public issue.
Contact: studiobuoninglese@gmail.com

---

## Active Security Measures

| Measure | Status | Details |
|---------|--------|---------|
| HTTPS | ✅ Enforced | GitHub Pages enforces HTTPS + HSTS on `.github.io` |
| Content Security Policy | ✅ Active | CSP via `<meta>` on index.html, panoramica.html, caption-s8t.html, privacy.html, termini.html |
| `X-Content-Type-Options` | ✅ Active | `nosniff` on all production pages |
| `Referrer-Policy` | ✅ Active | `strict-origin-when-cross-origin` |
| `rel="noopener noreferrer"` | ✅ Active | All `target="_blank"` links |
| `robots.txt` | ✅ Active | Blocks internal files (60+ paths) |
| `serve.py` | ✅ Active | Local dev server blocks internal paths (403) |
| Supabase RLS | ✅ Active | Row-Level Security on all tables |
| `config.js` | ✅ Gitignored | Production config not in version control |
| API keys | ✅ Server-side | OpenAI, Stripe keys in Render/Supabase env vars only |
| Room ID security | ✅ Active | Crypto-random room IDs (`crypto.randomUUID()`) |

---

## Secrets and API Keys

- **Never** commit `.env` files, API keys, tokens, or passwords
- Supabase anon keys are publishable-safe (client-side, unavoidable)
- OpenAI and Stripe keys live in Render/Supabase environment variables only
- Use `config.example.js` as template — never with real values
- Rotate keys immediately if ever committed or exposed

---

## Data Security

- All user data in Supabase PostgreSQL with Row-Level Security (RLS)
- Audio processed in memory via Web Speech API — never persisted
- Transcript text stored with per-user RLS policies
- Auto-deletion: unsaved sessions purged after 30 days
- Users can delete their own data at any time from the app

---

## Git Workflow

- `config.js` and `config.secrets.js` are gitignored — never force-add them
- Always check `git status` before committing to verify no secrets are staged
- Push directly to `main` — GitHub Pages deploys automatically
- No PR workflow needed for this single-developer project

---

## Dependencies

- Frontend: static HTML/CSS/JS — no npm production dependencies
- Dev only: Tailwind CSS (via npm, for building `css/tailwind.min.css`)
- CDN: Supabase SDK, Font Awesome, Google Fonts, compromise.js
- Supabase Edge Functions: Deno runtime, auto-updated
