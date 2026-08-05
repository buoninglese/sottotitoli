# deploy-runbook.md — Deployment Procedures

> **For any AI agent deploying Sottotitoli or its backend services.**
> Step-by-step instructions for each deployment surface.

---

## 1. Frontend (GitHub Pages)

### How It Works
- Push to `main` branch → GitHub Pages auto-deploys
- Serves from root of repo
- Custom domain: `sottotitoli.pro` (CNAME file in repo)

### Deploy Steps
```bash
cd /Users/sebastiankrauwel/sottotitoli

# 1. Make your changes
# 2. Run testing checklist
# 3. Commit and push
git add <files>
git commit -m "type: description of changes"
git push origin main
```

### Verify
- Visit https://buoninglese.github.io/sottotitoli/
- Visit https://www.sottotitoli.pro
- Check that changes are live (may take 1-2 minutes for GitHub Pages CDN)
- If not appearing, check GitHub Actions tab in repo for build status

### Rollback
```bash
git revert <commit-hash>
git push origin main
```

---

## 2. WebSocket Relay (Render)

### Repository
- **Repo:** `sottotitoli-websocket` (separate from frontend)
- **Platform:** Render (render.com)
- **Stack:** Node.js ESM
- **Service Type:** Web Service

### Deploy Steps
1. Push to `main` branch of `sottotitoli-websocket` repo
2. Render auto-deploys (connected to GitHub)
3. Monitor deploy logs in Render dashboard
4. Health check: `wss://sottotitoli-websocket.onrender.com` should accept connections

### Environment Variables (Set in Render Dashboard)
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI for transcription |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side) |

### Verify
- Open `caption-s8t.html` or `duo-s8t.html`
- Start a session
- Check that captions appear

---

## 3. Learning Backend (Render)

### Repository
- **Repo:** `sottotitoli-learning` (separate from frontend)
- **Platform:** Render
- **Stack:** Node.js CJS
- **DB:** SQLite via `better-sqlite3` (word_cefr_minified.db)

### Deploy Steps
1. Push to `main` branch of `sottotitoli-learning` repo
2. Render auto-deploys
3. Verify API endpoints respond

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cefr/word?w=happy` | Single word CEFR lookup |
| POST | `/api/cefr/batch` | Batch word lookup |
| GET | `/api/cefr/categories` | List all categories |
| GET | `/api/cefr/category/:id` | Words in a topic |
| GET | `/api/cefr/word-family?lemma=happy` | Word family lookup |
| POST | `/api/cefr/analyze` | Full text analysis |

---

## 4. Supabase Edge Functions

### Prerequisites
```bash
# Install Supabase CLI if not already
npm install -g supabase
supabase login
```

### Deploy Steps
```bash
cd /Users/sebastiankrauwel/sottotitoli

# Deploy a specific function
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy process-ai-reports

# Deploy all functions
supabase functions deploy
```

### Set Secrets (Supabase Dashboard or CLI)
```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (for AI reports)
supabase secrets set OPENAI_API_KEY=sk-...
```

### Verify
- `create-checkout-session`: Go to `purchase.html`, click a product → should redirect to Stripe Checkout
- `stripe-webhook`: Check Stripe dashboard → Webhooks → recent deliveries
- `process-ai-reports`: Trigger an AI report from panoramica → check `ai_report_requests` table
- `grammar-segment`: Use caption-s8t grammar check → verify response

---

## 5. Database Migrations (Supabase)

### Apply Migration
```bash
# Via Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor:
# 1. Go to https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk
# 2. SQL Editor
# 3. Paste migration SQL
# 4. Run
```

### Migration Files
Located in `supabase/migrations/`:
- `ensure_profiles_table.sql` — Creates profiles table + columns + trigger + RLS
- `20260803_*.sql` — Recent migrations (4 files)
- `archived/` — 43 historical migrations applied to production
### Verify
```sql
-- Check if migration applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

---

## 6. Stripe Configuration

### Where to Configure
- **Stripe Dashboard:** https://dashboard.stripe.com (test mode)
- Products, prices, webhook endpoints configured in dashboard
- NOT in code (except product ID mapping in edge function)

### Product ID Mapping
In `supabase/functions/create-checkout-session/index.ts`:
```typescript
const PRICE_MAP = {
  "prod_UcOPJ8zxdBTvxy": "price_...",   // 50h pack
  "prod_UcORHDDoSul6TS": "price_..."    // 90 tokens
};
```

### Webhook Events to Listen For
- `checkout.session.completed` → Credit user's account
- `payment_intent.succeeded` → Confirm payment
- `payment_intent.payment_failed` → Handle failure

---

## 7. DNS / Domain

### Configuration
- **Domain:** `sottotitoli.pro`
- **DNS Provider:** (check registrar)
- **CNAME Record:** `www` → `buoninglese.github.io`
- **GitHub Pages:** Custom domain set in repo Settings → Pages

### Verify
```bash
dig www.sottotitoli.pro
# Should return GitHub Pages IPs
```

---

## 8. Emergency Procedures

### Frontend is Down
1. Check GitHub Pages status: https://www.githubstatus.com
2. Check repo Settings → Pages — is custom domain still configured?
3. Check CNAME file exists in repo root
4. Check recent commits for breaking changes
5. Rollback: `git revert <last-good-commit> && git push`

### WebSocket is Down
1. Check Render dashboard → `sottotitoli-websocket` service status
2. Check Render logs for errors
3. Check if OpenAI API key is still valid
4. Restart service from Render dashboard

### Supabase is Down
1. Check https://status.supabase.com
2. Check Supabase dashboard → project status
3. Verify anon key hasn't been rotated

### Stripe Checkout Broken
1. Check Stripe dashboard → test mode is ON
2. Verify product IDs match between `config.js`, edge function, and Stripe dashboard
3. Check edge function logs in Supabase dashboard
4. Verify `STRIPE_SECRET_KEY` is set

---

*Last updated: 2026-08-05*
