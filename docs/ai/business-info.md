# business-info.md — Business Information

> **Cross-refs:** `brand-voice.md` · `deploy-runbook.md` · `AGENTS.md`

---

## 1. Company Snapshot

| Field | Detail |
|-------|--------|
| **Product** | Sottotitoli (premium: sottotitoli.pro) |
| **Founder** | Sebastian Krauwel |
| **Jurisdiction** | Italy (Bari) |
| **Contact** | studiobuoninglese@gmail.com |
| **Live URL** | https://www.sottotitoli.pro |
| **Status** | Live, freemium, active development |

---

## 2. Business Model

### Freemium + Prepaid Credits

| Tier | What | Cost |
|------|------|------|
| Free | 15 min/week captioning, basic translation | Free |
| 50h Pack | 3000 minutes captioning | Stripe product `prod_UcOPJ8zxdBTvxy` |
| 90 Tokens | 90 AI report tokens | Stripe product `prod_UcORHDDoSul6TS` |

**Key:** No subscription. No auto-renewal. Prepaid one-time packs.

---

## 3. Tech Stack & Costs

| Service | Purpose | Cost |
|---------|---------|------|
| GitHub Pages | Frontend hosting | Free |
| Render | WebSocket + Learning backend | Free/low tier |
| Supabase | Auth, DB, Edge Functions | Free tier |
| Stripe | Payments (test mode) | Per-transaction % |
| MyMemory API | Free translation | Free |
| OpenAI API | STT + AI reports | Per-token |
| Font Awesome 6 | Icons (CDN) | Free |
| Google Fonts | Inter, Manrope, etc. | Free |

---

## 4. Supabase

- **URL:** `https://qzqmuegbpmvqrjrlfbgk.supabase.co`
- **Auth:** Google OAuth only
- **Edge Functions:** `create-checkout-session`, `stripe-webhook`, `process-ai-reports`, `wordnik-proxy`

### Key Tables
`profiles`, `sessions`, `user_vocabulary`, `user_token_ledger`, `token_transactions`, `ai_report_requests`, `session_ai_reports`, `referrals`

---

## 5. Stripe Products (Test Mode)

| Product ID | Name |
|-----------|------|
| `prod_UcOPJ8zxdBTvxy` | 50h Pack (3000 min) |
| `prod_UcORHDDoSul6TS` | 90 AI Report Tokens |

Prices managed in Stripe dashboard. Edge function has `PRICE_MAP`.

---

## 6. Legal

- **Terms:** `termini.html` (effective June 24, 2026)
- **Privacy:** `privacy.html`
- **Law:** Italian, courts of Bari
- **Min age:** 13. One account per person.
- **Refunds:** 14 days, case-by-case. VAT included.

---

## 7. Competition

| Competitor | Difference |
|-----------|------------|
| Otter.ai | English-only, meeting-focused, subscription |
| Google Live Caption | Android-only, no translation or learning |
| Duolingo | Learning, not real-time comprehension |
| DeepL | Translation quality, but no live captions |

**Our position:** Only tool combining real-time captioning + live translation + vocabulary building + grammar feedback + progress tracking in one browser tab.

---

*→ Next: `brand-voice.md` for how we talk about this business*
*→ Related: `deploy-runbook.md` for Stripe and Supabase deployment*
