# Security Policy

> Last updated: 2026-08-05
> See also: `docs/ai/security-hardening.md` for the full audit and implementation plan.

## Supported Versions

Current `main` branch is the only supported version.

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public issue.
Contact: studiobuoninglese@gmail.com

---

## Active Security Measures

| Measure | Status | Details |
|---------|--------|---------|
| HTTPS | ✅ Enforced | GitHub Pages enforces HTTPS + HSTS on `.github.io` |
| Content Security Policy | ✅ Implemented | CSP via `<meta>` on index.html, panoramica.html, caption-s8t.html |
| `X-Content-Type-Options` | ✅ Implemented | `nosniff` on all production pages |
| `Referrer-Policy` | ✅ Implemented | `strict-origin-when-cross-origin` |
| `rel="noopener noreferrer"` | ✅ Fixed | All `target="_blank"` links on production pages |
| `robots.txt` | ✅ Hardened | 55+ blocked paths for internal files |
| `serve.py` | ✅ Active | Local dev server blocks internal paths (403) |
| Room ID validation | ✅ Active | `security-utils.js` warns on predictable room IDs |
| Supabase RLS | ✅ Active | Row-Level Security on all tables |
| `config.js` | ✅ Gitignored | Production config not in version control |
| API keys | ✅ Server-side | OpenAI, Stripe, Wordnik keys in Render/Supabase env vars |

## Secrets and API Keys

- Never commit `.env` files, API keys, tokens, or passwords
- Supabase anon keys are publishable-safe (client-side, unavoidable)
- OpenAI, Oxford, Stripe keys in Render/Supabase environment variables only
- Use `.env.example` files as templates (never with real values)
- Rotate keys if ever committed or exposed

## Data Security

- Transcript text in Supabase with Row-Level Security (RLS)
- Audio processed in memory, not persisted
- All endpoints support optional `x-api-key` header authentication

## Dependencies

- npm dependencies checked via Dependabot (weekly)
- Outdated/vulnerable dependencies updated promptly

## Branch Protection

- Direct pushes to `main` avoided
- Pull requests recommended for all changes

---

*For the full security audit, see `docs/ai/security-hardening.md`*
