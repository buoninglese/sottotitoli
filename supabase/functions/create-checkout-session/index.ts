// Supabase Edge Function: Create Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout-session
// Requires secrets: STRIPE_SECRET_KEY
//
// SECURITY: the caller's Supabase user is derived from the verified JWT, never
// from the request body, so a client cannot create a checkout that credits
// another account.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_ORIGINS = new Set([
  'https://www.sottotitoli.pro',
  'https://sottotitoli.pro',
  'https://buoninglese.github.io',
  'http://localhost:8000',
  'http://localhost:5500',
]);

// Product → Price ID mapping.
// The price id is read from a secret (STRIPE_PRICE_*) so that switching between
// Stripe TEST and LIVE mode is a settings change rather than a code change plus a
// redeploy. The literal is only a fallback for an unset secret — NOTE it points at
// a LIVE price, so the secrets must be set to the intended mode's prices.
const PRICE_MAP: Record<string, { priceId: string; creditsSeconds: number; tokens: number }> = {
  'sottotitoli_starter':  { priceId: Deno.env.get('STRIPE_PRICE_STARTER')  || 'price_1TmsOY1gZ1iapxeouZqGzPbQ', creditsSeconds: 3600,  tokens: 5 },
  'sottotitoli_standard': { priceId: Deno.env.get('STRIPE_PRICE_STANDARD') || 'price_1TmsOb1gZ1iapxeoLTmIW3QV', creditsSeconds: 18000, tokens: 20 },
  'sottotitoli_premium':  { priceId: Deno.env.get('STRIPE_PRICE_PREMIUM')  || 'price_1TmsOf1gZ1iapxeoAo9mGSNV', creditsSeconds: 54000, tokens: 60 },
  'sottotitoli_credits':  { priceId: Deno.env.get('STRIPE_PRICE_CREDITS')  || 'price_1TmsOi1gZ1iapxeoRB2FnP5w', creditsSeconds: 0,     tokens: 100 },
};

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.sottotitoli.pro';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders(req) });

    // ── Verify the caller and derive identity from the JWT (never trust the body) ──
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(req) });
    }

    const body = await req.json().catch(() => ({}));
    const { product, successUrl, cancelUrl } = body;
    const productConfig = PRICE_MAP[product];

    if (!product || !productConfig?.priceId) {
      return new Response(JSON.stringify({ error: 'Invalid product' }), { status: 400, headers: corsHeaders(req) });
    }

    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: (() => {
        const params: Record<string, string> = {
          'line_items[0][price]': productConfig.priceId,
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': successUrl || 'https://www.sottotitoli.pro/panoramica.html?payment=success',
          'cancel_url': cancelUrl || 'https://www.sottotitoli.pro/purchase.html?payment=cancelled',
          'metadata[product]': product,
          'metadata[user_id]': user.id,
          'metadata[credits_seconds]': String(productConfig.creditsSeconds),
          'metadata[tokens]': String(productConfig.tokens),
          'client_reference_id': user.id,
        };
        if (user.email) params['customer_email'] = user.email;
        return new URLSearchParams(params).toString();
      })(),
    });

    const session = await stripeResp.json();
    if (session.error) {
      console.error('Stripe error:', session.error.message);
      return new Response(JSON.stringify({ error: 'Checkout failed' }), { status: 400, headers: corsHeaders(req) });
    }
    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders(req) });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: corsHeaders(req) });
  }
});
