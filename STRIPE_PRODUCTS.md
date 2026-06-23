# STRIPE SETUP — Sottotitoli · June 2026 Pricing

## Overview

The new pricing model uses **3 one-time payment products**. Each product includes caption minutes, translation minutes, and AI report credits.

## Product Configuration

Create these in **https://dashboard.stripe.com/test/products** (test mode first, then repeat in live mode).

---

### PRODUCT 1: Starter

| Field | Value |
|---|---|
| **Name** | Sottotitoli Starter |
| **Description** | 60 min caption · 30 min traduzione · 2 report AI |
| **Price** | €4.99 EUR (one-off) |
| **Stripe key** | `sottotitoli_starter` |
| **Price ID** | _(create in Stripe, then copy here)_ |
| **Product ID** | _(create in Stripe, then copy here)_ |

**Credits to grant in your Edge Function (NEW MODEL):**
- `tokens`: 60 (universal voice credits)
- `report_tokens`: 2
- **Bonus**: +15 tokens after purchase (25% loyalty bonus)

**How credits convert to minutes:**
- Caption: 0.5 credit/min → 60 credits = 120 caption min
- Traduzione: 1 credit/min → 60 credits = 60 traduzione min

---

### PRODUCT 2: Standard ⭐ (featured)

| Field | Value |
|---|---|
| **Name** | Sottotitoli Standard |
| **Description** | 300 min caption · 150 min traduzione · 10 report AI — AI Reports sbloccato |
| **Price** | €14.99 EUR (one-off) |
| **Stripe key** | `sottotitoli_standard` |
| **Price ID** | _(create in Stripe, then copy here)_ |
| **Product ID** | _(create in Stripe, then copy here)_ |

**Credits to grant:**
- `tokens`: 150 (universal voice credits)
- `report_tokens`: 10
- **Bonus**: +37 tokens after purchase (25% loyalty bonus)

**How credits convert:** Caption 0.5cr/min (300 min) · Traduzione 1cr/min (150 min)

---

### PRODUCT 3: Premium

| Field | Value |
|---|---|
| **Name** | Sottotitoli Premium |
| **Description** | 900 min caption · 450 min traduzione · 40 report AI — Supporto prioritario |
| **Price** | €29.99 EUR (one-off) |
| **Stripe key** | `sottotitoli_premium` |

---

### PRODUCT 4: Solo Crediti (report only, no minutes)

| Field | Value |
|---|---|
| **Name** | Sottotitoli 100 Crediti Report |
| **Description** | 100 crediti per acquistare report AI — nessun minuto incluso |
| **Price** | €9.99 EUR (one-off) |
| **Stripe key** | `sottotitoli_credits` |
| **Price ID** | _(create in Stripe, then copy here)_ |
| **Product ID** | _(create in Stripe, then copy here)_ |

**Credits to grant:**
- `tokens`: 100 (report credits only)
- `credit_seconds`: 0 (no minutes)
| **Price ID** | _(create in Stripe, then copy here)_ |
| **Product ID** | _(create in Stripe, then copy here)_ |

**Credits to grant:**
- `tokens`: 300 (universal voice credits)
- `report_tokens`: 40
- **Bonus**: +75 tokens after purchase (25% loyalty bonus)

**How credits convert:** Caption 0.5cr/min (600 min) · Traduzione 1cr/min (300 min)

---

## Step-by-step: Create Products in Stripe Dashboard

### 1. Go to Stripe Dashboard
```
https://dashboard.stripe.com/test/products
```

### 2. Click "Add product"

### 3. For EACH product:
- **Name**: `Sottotitoli Starter` (then Standard, then Premium)
- **Description**: copy from table above
- **Price type**: One-off
- **Amount**: See table above in EUR
- **Currency**: EUR
- Click **Save product**

### 4. After saving each product:
- Copy the **Price ID** (starts with `price_...`)
- Copy the **Product ID** (starts with `prod_...`)
- Paste them in the table above for reference

### 5. Set Environment Variables in Supabase

Go to: **Supabase Dashboard → Edge Functions → create-checkout-session**

Add these environment variables:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxx    # Your real Stripe secret key
STRIPE_PRICE_STARTER=price_xxxxxxxxxxx   # Price ID for Starter
STRIPE_PRICE_STANDARD=price_xxxxxxxxxxx  # Price ID for Standard
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxx   # Price ID for Premium
STRIPE_PRICE_CREDITS=price_xxxxxxxxxxx   # Price ID for 100 Crediti
```

### 6. Update the Edge Function

In your `create-checkout-session` Supabase Edge Function, add handling for the new product keys:

```typescript
// Map product keys to Stripe Price IDs
const PRICE_MAP: Record<string, string> = {
  'sottotitoli_starter':  Deno.env.get('STRIPE_PRICE_STARTER')!,
  'sottotitoli_standard': Deno.env.get('STRIPE_PRICE_STANDARD')!,
  'sottotitoli_premium':  Deno.env.get('STRIPE_PRICE_PREMIUM')!,
  'sottotitoli_credits':  Deno.env.get('STRIPE_PRICE_CREDITS')!,
  // Legacy (keep for existing users)
  '2hours':  Deno.env.get('STRIPE_PRICE_2HOURS')!,
  '20hours': Deno.env.get('STRIPE_PRICE_20HOURS')!,
  '50hours': Deno.env.get('STRIPE_PRICE_50HOURS')!,
  '90tokens': Deno.env.get('STRIPE_PRICE_90TOKENS')!,
};
```

### 7. Switch to Live Mode

After testing in test mode (use Stripe test card `4242 4242 4242 4242`):
1. Repeat steps 2-5 in the **Live** dashboard
2. Update `config.js` with your **live** publishable key (starts with `pk_live_`)
3. Update Supabase Edge Function env vars with **live** secret key and price IDs

---

## Cost Analysis (for your reference)

| Cost item | Provider | Approx. cost |
|---|---|---|
| Speech recognition | Browser Web Speech API | **Free** |
| Translation | Google Translate / MyMemory | **Free** |
| Speaker diarization | OpenAI Whisper | ~€0.30/hour |
| AI Reports | GPT-4o mini | ~€0.01/report |
| Hosting | GitHub Pages + Supabase | **Free** |
| Payments | Stripe | ~1.5% + €0.25/txn |

**Margins per product:**
- Starter €4.99 → cost ~€0.35 → **~93% margin**
- Standard €14.99 → cost ~€1.70 → **~89% margin**
- Premium €29.99 → cost ~€5.10 → **~83% margin**

Report credits are negligible cost (~€0.01 each). The main cost driver is diarization at ~€0.30/hour of caption time.

---

## Test Cards

Use these in Stripe test mode:
- **Success**: `4242 4242 4242 4242` (any future expiry, any CVC)
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0000 0000 3220`

## Report Rules (implemented in app logic)

- Sessions must be **≥ 5 minutes** to qualify for an AI report
- Sessions must be **≤ 120 minutes** for report eligibility
- Each report consumes **1 credit** from the bundle
- Report credits can also be purchased individually on the AI Reports page

ENVIRONMENT VARIABLES (stripe-webhook):
  STRIPE_WEBHOOK_SECRET = whsec_xxxxxxxx (from Stripe Dashboard → Webhooks)
  SUPABASE_URL = https://qzqmuegbpmvqrjrlfbgk.supabase.co
  SUPABASE_SERVICE_ROLE_KEY = (from Supabase Dashboard → Settings → API)


STRIPE WEBHOOK SETUP:
  1. Go to https://dashboard.stripe.com/test/webhooks
  2. Add endpoint: https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/stripe-webhook
  3. Events to listen for: checkout.session.completed
  4. Copy the signing secret → set as STRIPE_WEBHOOK_SECRET


DEPLOY COMMANDS:
  supabase functions deploy create-checkout-session
  supabase functions deploy stripe-webhook


HOW IT WORKS:
  1. User clicks "Acquista" on start.html
  2. stripe.js → calls create-checkout-session edge function
  3. Edge function → creates Stripe Checkout Session → returns URL
  4. User pays on Stripe's hosted page
  5. Stripe sends webhook to stripe-webhook edge function
  6. Webhook → grants credits + tokens to user's account
  7. app.js checks credit balance before starting session
  8. app.js deducts credits after session ends
