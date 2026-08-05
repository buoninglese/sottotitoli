# project-quickstart.md — Sottotitoli Quickstart (One-Pager)

> **For any AI agent starting work on Sottotitoli for the first time.**
> Read this + AGENTS.md and you'll have 90% of what you need.

---

## The Basics

- **What:** Real-time AI captioning + translation web app (Italian UI, freemium)
- **Live:** https://buoninglese.github.io/sottotitoli/ (custom domain: sottotitoli.pro)
- **Stack:** Static HTML/CSS/JS. No build step. GitHub Pages hosting.
- **Backend:** Supabase (auth, DB) + Render (WebSocket relay)

## Local Dev

```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8000
# → http://localhost:8000
```

## Key Files You'll Touch Most

| File | What It Is |
|------|-----------|
| `panoramica.html` | Main dashboard (~biggest file, 114KB+) |
| `caption-s8t.html` | Next-gen caption interface (8K lines) |
| `index.html` | Landing page with parallax slider |
| `studio.html` | Original caption workspace |
| `purchase.html` | Stripe checkout / pricing |
| `onboarding.html` | New user onboarding flow |
| `js/auth.js` | Supabase Google OAuth |
| `config.example.js` | Config template (edit this, NOT config.js) |

## Three Critical Rules

1. **Check syntax after EVERY JS/HTML edit** (`node --check` or `get_errors`)
2. **Never put `data-i18n` on an element with children** — wrap text in `<span>`
3. **Auto-push after every commit** — `git commit && git push`

## Supabase (Quick Reference)

- URL: `https://qzqmuegbpmvqrjrlfbgk.supabase.co`
- Auth: Google OAuth only (`js/auth.js`)
- Key tables: `profiles`, `sessions`, `user_vocabulary`, `token_transactions`
- Column traps: `transcript_text` NOT `transcript`, `wpm` NOT `wpm_avg`, `cefr_level` NOT `cefr`

## Design (Quick Reference)

- Font: Inter (UI), Manrope (headlines), JetBrains Mono (labels)
- Dark: deep blue→blackish. Light: off-white with warm purples.
- Buttons: pill-shaped, purple accent for CTAs.
- Each page has its own `:root` / `[data-theme="dark"]` CSS variables.

## Before You Commit

- [ ] Syntax check passed
- [ ] Tested desktop + mobile (375px)
- [ ] Tested day + night mode
- [ ] No console errors
- [ ] No hardcoded URLs
- [ ] Version bumped (panoramica.html)

---

*Last updated: 2026-08-05*
