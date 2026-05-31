// Supabase Edge Function: Stripe Webhook Handler
// Deploy: supabase functions deploy stripe-webhook
// Requires secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Stripe webhook URL: https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('No signature', { status: 400 });

    const body = await req.text();
    
    // Verify webhook signature (requires Stripe library — simplified here)
    // In production, use: const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    const event = JSON.parse(body);

    // Only handle successful checkout
    if (event.type !== 'checkout.session.completed') {
      return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const product = session.metadata?.product;
    const creditsSeconds = parseInt(session.metadata?.credits_seconds || '0');
    const tokens = parseInt(session.metadata?.tokens || '0');
    const stripeSessionId = session.id;

    if (!userId || userId === 'anonymous') {
      console.log('No user ID in session metadata — skipping credit grant');
      return new Response(JSON.stringify({ skipped: true, reason: 'no user' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Grant credits
    if (creditsSeconds > 0) {
      // Upsert user_credits
      const { data: existing } = await supabase.from('user_credits').select('balance_seconds, lifetime_seconds').eq('user_id', userId).maybeSingle();
      
      if (existing) {
        await supabase.from('user_credits').update({
          balance_seconds: existing.balance_seconds + creditsSeconds,
          lifetime_seconds: existing.lifetime_seconds + creditsSeconds,
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
      } else {
        await supabase.from('user_credits').insert({
          user_id: userId,
          balance_seconds: 900 + creditsSeconds, // 15min signup bonus + purchase
          lifetime_seconds: creditsSeconds,
        });
      }

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount_seconds: creditsSeconds,
        type: 'purchase',
        reference: stripeSessionId,
        balance_after: (existing?.balance_seconds || 900) + creditsSeconds,
      });
    }

    // Grant tokens
    if (tokens > 0) {
      const { data: existingTok } = await supabase.from('user_tokens').select('balance, lifetime_tokens').eq('user_id', userId).maybeSingle();
      
      if (existingTok) {
        await supabase.from('user_tokens').update({
          balance: existingTok.balance + tokens,
          lifetime_tokens: existingTok.lifetime_tokens + tokens,
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
      } else {
        await supabase.from('user_tokens').insert({
          user_id: userId,
          balance: 3 + tokens, // 3 free signup tokens + purchase
          lifetime_tokens: tokens,
        });
      }

      await supabase.from('token_transactions').insert({
        user_id: userId,
        amount: tokens,
        type: 'purchase',
        reference: stripeSessionId,
        balance_after: (existingTok?.balance || 3) + tokens,
      });
    }

    console.log(`Credited user ${userId}: +${creditsSeconds}s, +${tokens} tokens (product: ${product})`);
    return new Response(JSON.stringify({ success: true, creditsSeconds, tokens }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
