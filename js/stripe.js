// js/stripe.js — Stripe payment integration
// Uses Stripe Checkout (hosted payment page) via Supabase Edge Function

(function(w){
  'use strict';

  // Your Stripe publishable key — replace with your own from https://dashboard.stripe.com/apikeys
  // This is safe to expose in client-side code
  var STRIPE_PUBLISHABLE_KEY = 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx';
  // For testing, use: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx'

  // Price IDs from your Stripe Dashboard (Products → select product → Pricing)
  // Format: price_xxxxxxxxxxxxxxxxxxxxxxxxx
  var PRICES = {
    '5hours':   null, // ~5 €  — 5 hours + 10 tokens
    '20hours':  null, // ~15 € — 20 hours + 50 tokens
    '50hours':  null, // ~30 € — 50 hours + 150 tokens
    '90tokens': null  // ~10 € — 90 tokens only
  };

  // Supabase Edge Function URL that creates Stripe Checkout Sessions
  // Deploy: supabase/functions/create-checkout-session/
  var CHECKOUT_FUNCTION_URL = null; // Set to your Supabase Edge Function URL

  var stripePromise = null;

  function getStripe() {
    if (!stripePromise && window.Stripe) {
      stripePromise = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    }
    return stripePromise;
  }

  // Redirect to Stripe Checkout for a given product
  async function buyProduct(productKey) {
    var userId = null;
    var email = null;

    // Get user info if logged in
    if (w.sottotitoliSupabase) {
      try {
        var session = await w.sottotitoliSupabase.auth.getSession();
        if (session && session.data && session.data.session) {
          userId = session.data.session.user.id;
          email = session.data.session.user.email;
        }
      } catch(e) {}
    }

    // Option A: Use Supabase Edge Function to create Checkout Session
    if (CHECKOUT_FUNCTION_URL) {
      try {
        var resp = await fetch(CHECKOUT_FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: productKey,
            userId: userId,
            email: email,
            successUrl: window.location.origin + '/app.html?payment=success',
            cancelUrl: window.location.origin + '/studio.html?payment=cancelled'
          })
        });
        var data = await resp.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch(e) {
        console.error('Stripe Checkout error:', e);
      }
    }

    // Option B: Direct Stripe.js redirect (if you set up price IDs above)
    var priceId = PRICES[productKey];
    if (priceId) {
      var stripe = await getStripe();
      if (stripe) {
        var result = await stripe.redirectToCheckout({
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: 'payment',
          successUrl: window.location.origin + '/app.html?payment=success',
          cancelUrl: window.location.origin + '/studio.html?payment=cancelled',
          customerEmail: email || undefined,
          clientReferenceId: userId || undefined
        });
        if (result.error) {
          alert('Payment error: ' + result.error.message);
        }
        return;
      }
    }

    alert('Payment system is being set up. Please check back soon or contact support.');
  }

  // Wire up all buy buttons
  function wireButtons() {
    document.querySelectorAll('[data-stripe-product]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var product = btn.dataset.stripeProduct;
        btn.disabled = true;
        btn.textContent = 'Redirecting to Stripe…';
        buyProduct(product).finally(function(){
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || 'Acquista →';
        });
      });
      btn.dataset.originalText = btn.textContent;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  w.SottotitoliStripe = { buyProduct: buyProduct, PRICES: PRICES };
})(window);
