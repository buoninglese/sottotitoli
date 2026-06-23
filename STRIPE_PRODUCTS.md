# STRIPE SETUP — Sottotitoli · June 2026 Pricing

## ✅ Products created (Test Mode)

| # | Name | Product ID | Price ID | Key |
|---|---|---|---|---|
| 1 | Sottotitoli Starter | `prod_Ul2FGrf3kMOzfw` | `price_1TlWBS1xvn5NIk3eNfBumbXG` | `sottotitoli_starter` |
| 2 | Sottotitoli Standard | `prod_Ul2GLKFm7Qg7Iw` | `price_1TlWC31xvn5NIk3eGfXkRcKe` | `sottotitoli_standard` |
| 3 | Sottotitoli Premium | `prod_Ul2HACgCKd7bg3` | `price_1TlWCS1xvn5NIk3exyT6rY7P` | `sottotitoli_premium` |
| 4 | Sottotitoli 100 Crediti Report | `prod_Ul2HAuNPgcoZya` | `price_1TlWD31xvn5NIk3eUugsHSJO` | `sottotitoli_credits` |

All: one-off payment, EUR, tax behavior = inclusive (IVA già inclusa).

### Legacy (keep for existing users)

| # | Name | Price ID | Key |
|---|---|---|---|
| 5 | 120-minutes (old) | `price_1Tcwmm1xvn5NIk3eiKIus3c5` | `2hours` |

---

## Credits to grant on successful payment

| Product | `balance_minutes` | `tokens` | Bonus (25%) |
|---|---|---|---|
| Starter | +60 | +5 | +15 min |
| Standard | +300 | +20 | +75 min |
| Premium | +900 | +60 | +225 min |
| 100 Crediti | 0 | +100 | — |

**How minutes work:**
- Caption: 0.5× (1 min reale = 0.5 min scalato dal saldo)
- Translation: 1× (1 min reale = 1 min scalato)

---

## Supabase Edge Function — Env vars

Go to **Supabase → Edge Functions → `create-checkout-session`** and set:

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxx
STRIPE_PRICE_STARTER=price_1TlWBS1xvn5NIk3eNfBumbXG
STRIPE_PRICE_STANDARD=price_1TlWC31xvn5NIk3eGfXkRcKe
STRIPE_PRICE_PREMIUM=price_1TlWCS1xvn5NIk3exyT6rY7P
STRIPE_PRICE_CREDITS=price_1TlWD31xvn5NIk3eUugsHSJO
```

## Edge function PRICE_MAP (update in code)

```typescript
const PRICE_MAP: Record<string, string> = {
  'sottotitoli_starter':  Deno.env.get('STRIPE_PRICE_STARTER')!,
  'sottotitoli_standard': Deno.env.get('STRIPE_PRICE_STANDARD')!,
  'sottotitoli_premium':  Deno.env.get('STRIPE_PRICE_PREMIUM')!,
  'sottotitoli_credits':  Deno.env.get('STRIPE_PRICE_CREDITS')!,
  '2hours':  Deno.env.get('STRIPE_PRICE_2HOURS')!,
};
```

## Test cards

- **Success**: `4242 4242 4242 4242` (any future expiry, any 3-digit CVC)
- **Decline**: `4000 0000 0000 0002`

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
