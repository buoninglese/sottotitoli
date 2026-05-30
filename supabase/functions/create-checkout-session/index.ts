// Supabase Edge Function: Create Stripe Checkout Session
// Deploy: supabase functions deploy create-checkout-session
// Requires secrets: STRIPE_SECRET_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

// Map product keys to Stripe Price IDs — set these in your Stripe Dashboard
// Go to: https://dashboard.stripe.com/products
const PRICE_MAP: Record<string, string> = {
  '5hours':   Deno.env.get('STRIPE_PRICE_5HOURS')   || '',
  '20hours':  Deno.env.get('STRIPE_PRICE_20HOURS')  || '',
  '50hours':  Deno.env.get('STRIPE_PRICE_50HOURS')  || '',
  '90tokens': Deno.env.get('STRIPE_PRICE_90TOKENS') || '',
  'studente': Deno.env.get('STRIPE_PRICE_BUNDLE_STUDENTE') || '',
  'professionale': Deno.env.get('STRIPE_PRICE_BUNDLE_PROFESSIONALE') || '',
  'completo': Deno.env.get('STRIPE_PRICE_BUNDLE_COMPLETO') || '',
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.json();
    const { product, userId, email, successUrl, cancelUrl } = body;

    if (!product || !PRICE_MAP[product]) {
      return new Response(
        JSON.stringify({ error: 'Invalid product key: ' + product }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const priceId = PRICE_MAP[product];

    // Create Stripe Checkout Session
    const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': successUrl || 'https://buoninglese.github.io/sottotitoli/app.html?payment=success',
        'cancel_url': cancelUrl || 'https://buoninglese.github.io/sottotitoli/studio.html?payment=cancelled',
        'customer_email': email || '',
        'client_reference_id': userId || '',
        'metadata[product]': product,
        'metadata[user_id]': userId || 'anonymous',
      }).toString(),
    });

    const session = await stripeResp.json();

    if (session.error) {
      return new Response(
        JSON.stringify({ error: session.error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
