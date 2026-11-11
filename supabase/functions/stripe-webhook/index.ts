// Supabase Edge Function: Stripe Webhook Handler
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Requires secrets: STRIPE_WEBHOOK_SECRET, SB_URL, SB_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SB_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); // service role — bypasses RLS
const stripe = new Stripe(STRIPE_SECRET_KEY);

// ═══ Refund → reverse the grant ═════════════════════════════════════════════
// Listens for refund.created rather than charge.refunded: the object IS the
// refund (its own id, amount and payment_intent), so partial refunds are handled
// individually and idempotency keys cleanly on the refund id.
//
// The checkout session is resolved from the refund's payment_intent using the
// sessions list filter (`payment_intent` is a documented parameter), so nothing
// has to store a charge↔grant mapping and Stripe stays the source of truth.
//
// Ledger reference is `refund:<session>:<refund>` — unique per refund for
// idempotency, AND scoped per session so the cumulative-partials maths can find
// what it already clawed back.
//
// Deliberately NOT reversed:
//   * the signup bonus — not part of what was bought;
//   * referral bonuses (ref_… / ref_referred_…) — a separate reward.
// Only type='purchase' rows against this session are considered.
//
// ⚠️ Clamping at zero means a user who SPENDS the minutes and then refunds keeps
// the usage. That is a small refund-fraud vector, accepted deliberately: refusing
// refunds would be worse. The shortfall is logged so it stays visible.
async function handleRefund(refund: Stripe.Refund): Promise<Response> {
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // Only act on a SETTLED refund. PayPal refunds in particular can arrive as
    // 'pending' and only later become 'succeeded' or 'failed'. Clawing back on a
    // pending refund would take minutes off a user for money they never got back.
    // refund.updated re-fires on the transition, and the ledger reference makes
    // that second attempt idempotent — so waiting costs nothing.
    if (refund.status !== 'succeeded') {
      console.log(`Refund ${refund.id}: status '${refund.status}' — waiting for refund.updated`);
      return respond({ skipped: true, reason: `not settled (${refund.status})` });
    }

    const pi = typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : (refund.payment_intent as Stripe.PaymentIntent | null)?.id;
    if (!pi) {
      console.log(`Refund ${refund.id}: no payment_intent — nothing to reverse`);
      return respond({ skipped: true, reason: 'no payment_intent' });
    }

    // payment_intent → checkout session
    const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
    const session = sessions.data[0];
    if (!session) {
      console.log(`Refund ${refund.id}: no checkout session for ${pi} — nothing to reverse`);
      return respond({ skipped: true, reason: 'no session' });
    }

    const sessionRef = session.id;
    const refundRef = `refund:${sessionRef}:${refund.id}`;

    // Idempotency — Stripe retries deliveries.
    // Checked, because an unreadable answer here previously read as "not yet
    // reversed" and reversed the refund a second time, clawing credits back from
    // a customer who was already made whole.
    const { data: done, error: doneError } = await supabase
      .from('credit_transactions').select('id').eq('reference', refundRef).maybeSingle();
    if (doneError) {
      console.error(`Refund ${refund.id}: idempotency lookup failed: ${doneError.message}`);
      return respond({ error: 'refund idempotency lookup failed' }, 500);
    }
    if (done) {
      console.log(`Refund ${refund.id}: already reversed`);
      return respond({ skipped: true, reason: 'already reversed' });
    }

    // The original grant. Purchases only — see the note above. Do NOT reuse
    // sessionRef as this row's reference: the grant dedupe would treat it as a
    // duplicate and skip it.
    // Checked, because an unreadable answer here read as "no grant" and skipped
    // the reversal entirely — the customer kept the credits after being refunded.
    const { data: grant, error: grantError } = await supabase
      .from('credit_transactions')
      .select('user_id, amount_seconds')
      .eq('reference', sessionRef).eq('type', 'purchase').maybeSingle();
    if (grantError) {
      console.error(`Refund ${refund.id}: grant lookup failed: ${grantError.message}`);
      return respond({ error: 'refund grant lookup failed' }, 500);
    }

    if (!grant || !grant.user_id) {
      // A refund can legitimately arrive for a charge we never granted (a manual
      // charge in the dashboard, a test payment). Log loudly and do not fail the
      // delivery. If this ever fires for a real purchase, it is a bug.
      console.warn(`Refund ${refund.id}: no purchase grant for session ${sessionRef} — skipping`);
      return respond({ skipped: true, reason: 'no grant' });
    }

    const userId = grant.user_id as string;
    const paidSeconds = Number(grant.amount_seconds) || 0;
    const sessionTotal = Number(session.amount_total) || 0;
    if (!paidSeconds || !sessionTotal) {
      console.warn(`Refund ${refund.id}: unusable amounts (paid=${paidSeconds}, total=${sessionTotal})`);
      return respond({ skipped: true, reason: 'no amount' });
    }

    // Cumulative SETTLED amount for this payment — asked of Stripe, not tracked
    // locally, so partials and out-of-order deliveries both come out right.
    // Pending refunds are excluded: we only claw back money actually returned.
    const allRefunds = await stripe.refunds.list({ payment_intent: pi, limit: 100 });
    const refundedAmount = allRefunds.data
      .filter(r => r.status === 'succeeded')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const fraction = Math.min(1, refundedAmount / sessionTotal);

    // The reversal itself lives in ONE SQL function so it is atomic. Doing it here
    // as separate PostgREST calls means a failure halfway leaves minutes deducted
    // but credits not, and no ledger row — a silent drift. The function also owns
    // the cumulative-partial arithmetic (target fraction MINUS what earlier
    // partials already took), so the tested code and the live code are the same.
    const { data: rev, error: revErr } = await supabase.rpc('reverse_purchase', {
      p_session_ref: sessionRef,
      p_refund_id: refund.id,
      p_fraction: fraction,
      p_reason: `Rimborso Stripe ${refund.id}`,
    });

    if (revErr) throw new Error(`reverse_purchase failed: ${revErr.message}`);

    const out = Array.isArray(rev) ? rev[0] : rev;
    if (!out) throw new Error('reverse_purchase returned nothing');

    if (!out.ok) {
      // 'already reversed' / 'at target' / 'no grant' are all legitimate no-ops.
      console.log(`Refund ${refund.id}: not applied — ${out.reason}`);
      return respond({ skipped: true, reason: out.reason });
    }

    if (out.shortfall_minutes || out.shortfall_tokens) {
      // Already spent, so the function clamped at zero. Say so rather than let it
      // pass silently — this is the small refund-fraud vector we accepted.
      console.warn(`Refund ${refund.id}: SHORTFALL — could not claw ${out.shortfall_minutes} min / ${out.shortfall_tokens} credits from ${userId} (already spent)`);
    }

    console.log(`Refund ${refund.id}: reversed ${out.reversed_seconds}s + ${out.reversed_tokens} tokens for ${userId} (${Math.round(fraction * 100)}% of ${sessionRef})`);
    return respond({
      success: true,
      session: sessionRef,
      reversed_seconds: out.reversed_seconds,
      reversed_tokens: out.reversed_tokens,
      shortfall_minutes: out.shortfall_minutes,
      shortfall_tokens: out.shortfall_tokens,
    });
  } catch (err) {
    // 500 so Stripe RETRIES: a transient failure must not leave the ledger
    // claiming a purchase the customer was refunded for. Retries are safe because
    // the whole handler is idempotent on the refund reference.
    console.error(`Refund ${refund.id} handling failed:`, err);
    return respond({ error: 'refund handling failed' }, 500);
  }
}

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    const body = await req.text();

    // Verify webhook signature — rejects forged events.
    //
    // ⚠️ MUST be the ASYNC variant. In Deno, Stripe's SDK uses SubtleCryptoProvider,
    // and the synchronous constructEvent() throws:
    //   "SubtleCryptoProvider cannot be used in a synchronous context"
    // Because that throw was caught and reported as a generic 401, every Stripe
    // delivery failed signature verification silently — so this webhook never
    // credited anyone, and no purchase had ever completed successfully.
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Webhook event:', event.type, event.id);

    // Refunds reverse the original grant. Handled BEFORE the checkout-only guard
    // below, which would otherwise ignore every refund event.
    //
    // ⚠️ BOTH event types, and this is not belt-and-braces — refund.updated is the
    // event that does the work, not a duplicate.
    //
    // A refund commonly arrives as refund.created with status='pending' and only
    // becomes 'succeeded' on refund.updated. handleRefund deliberately WAITS for the
    // settled status, so refund.created alone can never complete a pending refund.
    // Dispatching on refund.created only meant the refund was skipped at creation
    // and then silently ignored on the transition, because the guard below returns
    // {received:true} for anything that is not checkout.session.completed.
    //
    // Verified against real event payloads: refund.created carried status='pending',
    // refund.updated carried status='succeeded', and no clawback happened. Every
    // PayPal refund goes pending -> settled, so this hit all of them.
    //
    // Handling both is safe: idempotency on the ledger reference makes a repeat
    // delivery of the same refund a no-op.
    if (event.type === 'refund.created' || event.type === 'refund.updated') {
      return await handleRefund(event.data.object as Stripe.Refund);
    }

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

    // ── Idempotency, enforced by the database ────────────────────────────────
    // This used to be a bare read-then-write check with no uniqueness behind it,
    // and it failed in two ways. If the SELECT errored, the variable came back
    // null, the guard silently passed and Stripe's retry granted the purchase a
    // second time. And even when it worked, two concurrent deliveries could both
    // read "not processed" before either one wrote.
    //
    // `credit_transactions` and `token_transactions` now carry a partial unique
    // index on (reference) for purchase rows (migration 20261108160000), so each
    // INSERT below is its own lock and a repeat delivery arrives as 23505.
    //
    // There is deliberately no up-front "already processed → return" check any
    // more. One checkout can grant minutes and tokens, so treating a single
    // existing row as proof the whole delivery was applied would strand the other
    // half permanently. Each claim decides for itself.
    //
    // The rule for every step below: if we cannot tell what happened, answer 5xx
    // and let Stripe retry. A non-2xx is an honest "I did not finish"; a 200 we
    // are unsure about is how somebody pays and receives nothing.

    // Grant credits
    if (creditsSeconds > 0) {
      const purchaseMinutes = Math.round(creditsSeconds / 60);
      // Upsert user_credits.
      // ⚠️ The app reads `balance_minutes` everywhere (header, dropdown, quota,
      // deduction). `balance_seconds` is legacy and kept in sync for old readers
      // only. Previously this wrote ONLY balance_seconds, so a paid purchase
      // added minutes to a column nothing reads — buyers received nothing.
      // A failed read here must NOT fall through to the insert branch. That is
      // exactly how a purchase used to disappear: the read errored, `existing`
      // came back null, the INSERT hit a row that already existed and failed, the
      // UPDATE never ran, and the function still answered 200 — so Stripe never
      // retried and nobody ever knew.
      const { data: existing, error: existingError } = await supabase
        .from('user_credits')
        .select('balance_seconds, balance_minutes, lifetime_seconds')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) {
        console.error('credit balance read failed for ' + userId + ': ' + existingError.message);
        return new Response(JSON.stringify({ error: 'credit balance read failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      // Claim first, write second. The claim is the idempotency lock.
      const { error: creditClaimError } = await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount_seconds: creditsSeconds,
        type: 'purchase',
        reference: stripeSessionId,
        balance_after: (existing?.balance_seconds || 1500) + creditsSeconds,
      });

      if (creditClaimError && creditClaimError.code === '23505') {
        console.log('Credits already granted for ' + stripeSessionId + ' — skipping the write');
      } else if (creditClaimError) {
        console.error('credit claim insert failed for ' + stripeSessionId + ': ' + creditClaimError.message);
        return new Response(JSON.stringify({ error: 'credit claim failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      } else {
        const newMinutes = existing
          ? (existing.balance_minutes || 0) + purchaseMinutes
          : 25 + purchaseMinutes; // no row yet — one-time 25 free minutes + the purchase
        const creditWrite = existing
          ? await supabase.from('user_credits').update({
              balance_minutes: newMinutes,
              balance_seconds: newMinutes * 60,
              lifetime_seconds: (existing.lifetime_seconds || 0) + creditsSeconds,
              updated_at: new Date().toISOString()
            }).eq('user_id', userId)
          : await supabase.from('user_credits').insert({
              user_id: userId,
              balance_minutes: newMinutes,
              balance_seconds: newMinutes * 60,
              lifetime_seconds: creditsSeconds,
            });

        if (creditWrite.error) {
          // Release the claim so the retry starts clean, and answer 5xx so a
          // retry actually happens.
          const { error: releaseError } = await supabase.from('credit_transactions')
            .delete().eq('reference', stripeSessionId).eq('type', 'purchase');
          console.error('credit write failed for ' + userId + ': ' + creditWrite.error.message +
            (releaseError
              ? ' — AND the claim could not be released (' + releaseError.message + '), manual fix needed'
              : ' — claim released, Stripe will retry'));
          return new Response(JSON.stringify({ error: 'credit write failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    // Grant tokens
    if (tokens > 0) {
      const { data: existingTok, error: existingTokError } = await supabase
        .from('user_tokens')
        .select('balance, lifetime_tokens')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingTokError) {
        console.error('token balance read failed for ' + userId + ': ' + existingTokError.message);
        return new Response(JSON.stringify({ error: 'token balance read failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      const { error: tokenClaimError } = await supabase.from('token_transactions').insert({
        user_id: userId,
        amount: tokens,
        type: 'purchase',
        reference: stripeSessionId,
        balance_after: (existingTok?.balance || 3) + tokens,
      });

      if (tokenClaimError && tokenClaimError.code === '23505') {
        console.log('Tokens already granted for ' + stripeSessionId + ' — skipping the write');
      } else if (tokenClaimError) {
        console.error('token claim insert failed for ' + stripeSessionId + ': ' + tokenClaimError.message);
        return new Response(JSON.stringify({ error: 'token claim failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      } else {
        const tokenWrite = existingTok
          ? await supabase.from('user_tokens').update({
              balance: existingTok.balance + tokens,
              lifetime_tokens: existingTok.lifetime_tokens + tokens,
              updated_at: new Date().toISOString()
            }).eq('user_id', userId)
          : await supabase.from('user_tokens').insert({
              user_id: userId,
              balance: 3 + tokens, // fallback only: signup creates this row, so 3 is the column DEFAULT
              lifetime_tokens: tokens,
            });

        if (tokenWrite.error) {
          const { error: tokenReleaseError } = await supabase.from('token_transactions')
            .delete().eq('reference', stripeSessionId).eq('type', 'purchase');
          console.error('token write failed for ' + userId + ': ' + tokenWrite.error.message +
            (tokenReleaseError
              ? ' — AND the claim could not be released (' + tokenReleaseError.message + '), manual fix needed'
              : ' — claim released, Stripe will retry'));
          return new Response(JSON.stringify({ error: 'token write failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    console.log(`Credited user ${userId}: +${creditsSeconds}s, +${tokens} tokens (product: ${product})`);

    // ═══ Referral bonus ═══
    // Check if this user was referred — if yes, grant 45 tokens to both parties
    try {
      const { data: referral, error: referralError } = await supabase.from('referrals')
        .select('referrer_id, status')
        .eq('referred_user_id', userId)
        .eq('status', 'signed_up')
        .maybeSingle();

      // Do not treat an unreadable row as "no referral". Throwing is caught below
      // and logged; the purchase above has already landed and is not affected.
      if (referralError) throw new Error('referral lookup failed: ' + referralError.message);

      if (referral?.referrer_id && referral.status === 'signed_up') {
        const REFERRAL_BONUS = 45; // tokens

        // Read-modify-write on a balance. If this read fails, `refBalance` becomes
        // 0 + 45 and the upsert OVERWRITES the referrer's entire balance with 45,
        // so they lose everything they had. The read error has to stop us dead.
        const { data: refTok, error: refTokError } = await supabase.from('user_tokens')
          .select('balance').eq('user_id', referral.referrer_id).maybeSingle();
        if (refTokError) throw new Error('referrer balance read failed: ' + refTokError.message);
        const refBalance = (refTok?.balance || 0) + REFERRAL_BONUS;

        const { error: refWriteError } = await supabase.from('user_tokens').upsert({
          user_id: referral.referrer_id,
          balance: refBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (refWriteError) throw new Error('referrer balance write failed: ' + refWriteError.message);

        const { error: refTxError } = await supabase.from('token_transactions').insert({
          user_id: referral.referrer_id,
          amount: REFERRAL_BONUS,
          type: 'referral_bonus',
          reference: `ref_${stripeSessionId}`,
          description: 'Bonus referral — amico ha acquistato gettoni',
          balance_after: refBalance
        });
        // The balance has already moved, so this cannot be undone here — but it
        // must not pass unnoticed either.
        if (refTxError) console.error('referrer bonus ledger row failed after the balance moved: ' + refTxError.message);

        // Grant bonus to referred user (on top of their purchase)
        const { data: refdTok, error: refdTokError } = await supabase.from('user_tokens')
          .select('balance').eq('user_id', userId).maybeSingle();
        if (refdTokError) throw new Error('referred balance read failed: ' + refdTokError.message);
        const refdBalance = (refdTok?.balance || 0) + REFERRAL_BONUS;

        const { error: refdWriteError } = await supabase.from('user_tokens').update({
          balance: refdBalance,
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
        if (refdWriteError) throw new Error('referred balance write failed: ' + refdWriteError.message);

        const { error: refdTxError } = await supabase.from('token_transactions').insert({
          user_id: userId,
          amount: REFERRAL_BONUS,
          type: 'referral_bonus',
          reference: `ref_referred_${stripeSessionId}`,
          description: 'Bonus referral — hai usato un link invito',
          balance_after: refdBalance
        });
        if (refdTxError) console.error('referred bonus ledger row failed after the balance moved: ' + refdTxError.message);

        // Mark referral as completed
        const { error: refMarkError } = await supabase.from('referrals').update({
          status: 'completed',
          bonus_granted_at: new Date().toISOString(),
          bonus_amount: REFERRAL_BONUS
        }).eq('referred_user_id', userId);
        if (refMarkError) console.error('could not mark referral completed: ' + refMarkError.message);

        console.log(`Referral bonus: +${REFERRAL_BONUS} tokens each for ${referral.referrer_id} and ${userId}`);
      }
    } catch (refErr) {
      console.error('Referral bonus error (non-fatal):', refErr.message);
    }

    return new Response(JSON.stringify({ success: true, creditsSeconds, tokens }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
