// js/stripe.js — Stripe payment integration
// Uses Stripe Checkout (hosted payment page) via Supabase Edge Function
// Configuration in config.js → window.SOTTOTITOLI_CONFIG.stripe

(function(w){
  'use strict';

  var cfg = (w.SOTTOTITOLI_CONFIG && w.SOTTOTITOLI_CONFIG.stripe) || {};

  var STRIPE_PUBLISHABLE_KEY = cfg.publishableKey || 'pk_test_placeholder';
  var CHECKOUT_FUNCTION_URL = cfg.checkoutFunctionUrl || null;
  var PRICES = cfg.prices || {};

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

    // Edge Function (server-side) — the only method we use
    if (CHECKOUT_FUNCTION_URL) {
      try {
        var resp = await fetch(CHECKOUT_FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: productKey,
            userId: userId,
            email: email,
            successUrl: window.location.origin + '/studio.html?payment=success',
            cancelUrl: window.location.origin + '/studio.html?payment=cancelled'
          })
        });
        var data = await resp.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        if (data.error) {
          console.error('Stripe error:', data.error);
          alert('Payment error: ' + data.error);
          return;
        }
      } catch(e) {
        console.error('Stripe Checkout error:', e);
      }
    }

    alert('Payment system is being set up. Please try again or contact support.');
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
