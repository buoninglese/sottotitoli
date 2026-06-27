// Supabase Edge Function: Create Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout-session
// Requires secrets: STRIPE_SECRET_KEY

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

// Product → Price ID mapping (set in config.js + Stripe Dashboard)
const PRICE_MAP: Record<string, { priceId: string; creditsSeconds: number; tokens: number }> = {
  'sottotitoli_starter':  { priceId: 'price_1TmsOY1gZ1iapxeouZqGzPbQ', creditsSeconds: 3600,  tokens: 5 },
  'sottotitoli_standard': { priceId: 'price_1TmsOb1gZ1iapxeoLTmIW3QV', creditsSeconds: 18000, tokens: 20 },
  'sottotitoli_premium':  { priceId: 'price_1TmsOf1gZ1iapxeoAo9mGSNV', creditsSeconds: 54000, tokens: 60 },
  'sottotitoli_credits':  { priceId: 'price_1TmsOi1gZ1iapxeoRB2FnP5w', creditsSeconds: 0,     tokens: 100 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders() });

    const body = await req.json();
    const { product, userId, email, successUrl, cancelUrl } = body;
    const productConfig = PRICE_MAP[product];

    if (!product || !productConfig?.priceId) {
      return new Response(JSON.stringify({ error: 'Invalid product: ' + product }), { status: 400, headers: corsHeaders() });
    }

    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: (() => {
        const params: Record<string, string> = {
          'line_items[0][price]': productConfig.priceId,
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': successUrl || 'https://buoninglese.github.io/sottotitoli/app.html?payment=success',
          'cancel_url': cancelUrl || 'https://buoninglese.github.io/sottotitoli/studio.html?payment=cancelled',
          'metadata[product]': product,
          'metadata[user_id]': userId || 'anonymous',
          'metadata[credits_seconds]': String(productConfig.creditsSeconds),
          'metadata[tokens]': String(productConfig.tokens),
        };
        if (email) params['customer_email'] = email;
        if (userId) params['client_reference_id'] = userId;
        return new URLSearchParams(params).toString();
      })(),
    });

    const session = await stripeResp.json();
    if (session.error) return new Response(JSON.stringify({ error: session.error.message }), { status: 400, headers: corsHeaders() });
    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders() });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders() });
  }
});

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
