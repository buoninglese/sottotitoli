# Deployment Checklist

Use this checklist before every production deploy.

## Frontend (sottotitoli — GitHub Pages)

- [ ] `config.js` has correct production URLs (not localhost)
- [ ] `js/auth.js` redirects point to production start.html
- [ ] All API endpoints in `config.js` point to production Render services
- [ ] No `.env` files or real secrets in committed code
- [ ] Tested locally with `python -m http.server 8000`
- [ ] Push to `main` — GitHub Pages auto-deploys

## WebSocket Backend (sottotitoli-websocket — Render)

- [ ] `INTERNAL_API_KEY` set in Render environment variables
- [ ] `ALLOWED_ORIGINS` includes production frontend URL
- [ ] `OPENAI_API_KEY` set and valid
- [ ] CORS origins match production frontend domain
- [ ] Health endpoint returns `{ ok: true, uptime: ... }`
- [ ] Deploy via Render dashboard or git push

## Learning Service (sottotitoli-learning — Render)

- [ ] `INTERNAL_API_KEY` set in Render environment variables
- [ ] `ALLOWED_ORIGINS` includes production frontend URL
- [ ] `OXFORD_APP_ID` and `OXFORD_APP_KEY` set if Oxford lookups are active
- [ ] Vocabulary banks loaded correctly (check /debug/ngsl-forget)
- [ ] Deploy via Render dashboard or git push

## Post-Deploy

- [ ] Frontend loads without console errors
- [ ] WebSocket connects (check browser console)
- [ ] Captioning works end-to-end
- [ ] Speaker analysis works (if applicable)
- [ ] Dictionary lookups work (if applicable)
- [ ] Auth (Google sign-in) works
