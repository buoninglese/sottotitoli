# business-info.md — Sottotitoli Business Information

> **For any AI agent working on business strategy, pricing, legal, or operational questions.**
> Everything about how Sottotitoli operates as a business.

---

## 1. Company Snapshot

| Field | Detail |
|-------|--------|
| **Product Name** | Sottotitoli (www.sottotitoli.pro) |
| **Founder/Operator** | Sebastian Krauwel |
| **Legal Jurisdiction** | Italy (Bari) |
| **Contact Email** | studiobuoninglese@gmail.com |
| **Live URL** | https://buoninglese.github.io/sottotitoli/ |
| **Custom Domain** | https://www.sottotitoli.pro (CNAME → GitHub Pages) |
| **Status** | Live, freemium, in active development |

---

## 2. Business Model


### Key Business Rules
- **No subscription.** All paid products are one-time prepaid packs.
- **No auto-renewal.** Users buy credits when they run out.
- **Minutes are the primary unit** for captioning and translation. Credits for AI reports.
- **15 min/week free** is the acquisition hook. It resets weekly.

---

## 3. Tech Stack & Costs

| Service | Purpose | Cost |
|---------|---------|------|
| **GitHub Pages** | Frontend hosting | Free |
| **Render** | WebSocket relay (`sottotitoli-websocket`) + Learning backend (`sottotitoli-learning`) | Free tier / low cost |
| **Supabase** | Auth (Google OAuth), Database, Edge Functions, Realtime | Free tier |
| **Stripe** | Payment processing (test mode) | Per-transaction % |
| **MyMemory API** | Free translation backend | Free |
| **Google Web Speech API** | Browser-based STT | Free (browser-native) |
| **OpenAI API** | AI reports, transcription (via WebSocket relay) | Per-token cost |
| **Font Awesome 6** | Icons (CDN, free tier) | Free |
| **Google Fonts** | Inter, Manrope, JetBrains Mono, Cormorant Garamond | Free |

---

## 4. Revenue Model

### Current Revenue Streams
1. **Caption minute packs** — Packs via Stripe
2. **AI Report tokens** — Packs via Stripe

### Future Potential
- Mobile app (iOS/Android) with in-app purchases
- Enterprise/education plans (bulk minutes, admin dashboard)
- API access for developers
- Affiliate/referral program (already has referral tracking in DB)

---

## 5. Key Metrics (to track)

| Metric | Where | Status |
|--------|-------|--------|
| **Weekly Active Users** | Supabase sessions table | Needs dashboard |
| **Free → Paid Conversion** | Stripe + Supabase | Not yet tracked |
| **Avg Session Duration** | `sessions.duration_seconds` | Available |
| **Sessions per User** | Supabase query | Available |
| **Churn / Inactive Users** | Last session date | Needs implementation |
| **Revenue (MRR equivalent)** | Stripe dashboard | Test mode only |

---

## 6. Legal & Compliance

### Documents
- **Terms of Service:** `termini.html` — in effect from June 24, 2026
- **Privacy Policy:** `privacy.html`
- **Jurisdiction:** Italian law, courts of Bari

### Key Legal Points
- Minimum age: 13
- One account per person
- No automated/abusive use
- Users own their transcription data
- Refunds evaluated case-by-case within 14 days
- Prices include VAT where applicable

---

## 7. Database (Supabase)

### Project
- **URL:** `https://qzqmuegbpmvqrjrlfbgk.supabase.co`
- **Project ID:** `qzqmuegbpmvqrjrlfbgk`
- **Anon Key:** `sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7` (publishable)

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to auth.users) |
| `sessions` | Recording sessions with metrics |
| `user_vocabulary` | Saved words with CEFR levels |
| `user_token_ledger` | Credit transactions |
| `token_transactions` | Token purchase records |
| `ai_report_requests` | AI report generation queue |
| `session_ai_reports` | Generated AI reports |
| `user_ai_entitlements` | AI report token balances |
| `referrals` | User referral tracking |
| `newsletter_subscribers` | Email subscribers |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Stripe checkout creation |
| `stripe-webhook` | Stripe event handler |
| `process-ai-reports` | AI report generation |
| `wordnik-proxy` | Dictionary API proxy |

---

## 8. Stripe Configuration

### Key Stripe Notes
- Prices managed in Stripe dashboard, NOT in code
- Edge function `create-checkout-session` has `PRICE_MAP` mapping product IDs
- Webhook secret set in Supabase dashboard as `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY` set in Supabase dashboard secrets

---

## 9. Competition & Positioning

### Direct Competitors

### Indirect Competitors
- **Duolingo** — Language learning, not real-time comprehension
- **Google Translate** — Translation, not captioning or learning
- **DeepL** — Superior translation quality, but no real-time captions

### Our Position
> The only tool that combines real-time captioning, live translation, vocabulary building, grammar feedback, and progress tracking — in one browser tab.

---

## 10. Roadmap & Vision

### Short-term
- CEFR integration (word-level difficulty scoring)
- Mobile-responsive design improvements
- Fix known bugs (session duration, account persistence)

### Medium-term
- Mobile PWA / app store deployment
- Additional language pairs
- Enterprise/education plans

### Long-term
- API for third-party integration
- Offline mode
- Hardware integration (conference room systems)

---

*Last updated: 2026-08-05*
