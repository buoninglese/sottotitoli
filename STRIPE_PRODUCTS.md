STRIPE PRODUCT LIST — Sottotitoli
=====================================
Create these in https://dashboard.stripe.com/test/products

For each product, create ONE price (one-off payment, EUR).


PRODUCT 1: "2 hours"
  Description: 120 minutes of Sottotitoli captioning + 5 free tokens
  Price: €10.00 EUR (one-off)
  Price ID: price_1Tcwmm1xvn5NIk3eiKIus3c5 ✅ EXISTS
  Product ID: prod_UcB9nEU31aiSzq ✅ EXISTS
  Credits: 7200 seconds
  Tokens: 5
  Stripe key: 2hours

PRODUCT 2: "20 hours"  
  Description: 1200 minutes of Sottotitoli captioning + 50 free tokens
  Price: €50.00 EUR (one-off)
  Price ID: price_1TcwoX1xvn5NIk3eJuqF8V1j ✅ EXISTS
  Product ID: prod_UcBAcPEnicprOK ✅ EXISTS
  Credits: 72000 seconds
  Tokens: 50
  Stripe key: 20hours

PRODUCT 3: "50 hours" (CREATE NEW)
  Description: 3000 minutes of Sottotitoli captioning + 150 free tokens
  Price: €100.00 EUR (one-off)
  Price ID: (create in Stripe)
  Product ID: (create in Stripe)
  Credits: 180000 seconds
  Tokens: 150
  Stripe key: 50hours

PRODUCT 4: "90 Tokens" (CREATE NEW)
  Description: 90 tokens for AI report purchases — no caption time included
  Price: €10.00 EUR (one-off)
  Price ID: (create in Stripe)
  Product ID: (create in Stripe)
  Credits: 0 seconds
  Tokens: 90
  Stripe key: 90tokens


ENVIRONMENT VARIABLES (set in Supabase Dashboard → Edge Functions → create-checkout-session):
  STRIPE_SECRET_KEY = sk_test_xxxxxxxx
  STRIPE_PRICE_2HOURS = price_1Tcwmm1xvn5NIk3eiKIus3c5
  STRIPE_PRICE_20HOURS = price_1TcwoX1xvn5NIk3eJuqF8V1j
  STRIPE_PRICE_50HOURS = (after creating product 3)
  STRIPE_PRICE_90TOKENS = (after creating product 4)

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
  1. User clicks "Acquista" on studio.html
  2. stripe.js → calls create-checkout-session edge function
  3. Edge function → creates Stripe Checkout Session → returns URL
  4. User pays on Stripe's hosted page
  5. Stripe sends webhook to stripe-webhook edge function
  6. Webhook → grants credits + tokens to user's account
  7. app.js checks credit balance before starting session
  8. app.js deducts credits after session ends
