# deploy-runbook.md — Deployment Procedures

> **Cross-refs:** `architecture.md` · `testing-checklist.md` · `business-info.md`

---

## 1. Frontend (GitHub Pages)

**How:** Push to `main` → auto-deploy. Custom domain via CNAME file.

```bash
cd /Users/sebastiankrauwel/sottotitoli
# Run testing-checklist.md first
git add <files>
git commit -m "type: description"
git push origin main
```

**Verify:** Visit sottotitoli.pro. Allow 1-2 min for CDN.

**Rollback:** `git revert <hash> && git push`

---

## 2. WebSocket Relay (Render)

**Repo:** `sottotitoli-websocket` (separate). **Platform:** Render. **Stack:** Node.js ESM.

1. Push to `main` → Render auto-deploys
2. Monitor Render dashboard logs
3. Health: `wss://sottotitoli-websocket.onrender.com`

**Env vars (Render dashboard):** `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Learning Backend (Render)

**Repo:** `sottotitoli-learning`. **DB:** SQLite `word_cefr_minified.db`.

1. Push to `main` → auto-deploy
2. Verify endpoints respond

**API:** `/api/cefr/word`, `/api/cefr/batch`, `/api/cefr/categories`, `/api/cefr/analyze`

---

## 4. Supabase Edge Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy process-ai-reports
supabase functions deploy wordnik-proxy
```

**Secrets (Supabase Dashboard):**
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `WORDNIK_API_KEY` — Dictionary API key
- `OPENAI_API_KEY` — AI report generation

---

## 5. Database Migrations

Via Supabase SQL Editor or CLI:
```bash
supabase db push
```
Migration files: `supabase/migrations/`

---

## 6. Stripe Configuration

**Dashboard:** https://dashboard.stripe.com (test mode)
**Products:** Configured in Stripe dashboard, mapped in edge function `PRICE_MAP`.
- 50h pack: `prod_UcOPJ8zxdBTvxy`
- 90 tokens: `prod_UcORHDDoSul6TS`

---

## 7. Emergency Rollback

| Service | Action |
|---------|--------|
| Frontend down | `git revert <last-good> && git push` |
| WebSocket down | Restart from Render dashboard |
| Supabase down | Check status.supabase.com |
| Stripe broken | Verify test mode + product IDs + edge function |

---

*→ Next: `testing-checklist.md` — run this before every deploy*
*→ Related: `business-info.md` for Stripe product config*
