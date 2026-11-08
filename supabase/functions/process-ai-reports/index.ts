// Supabase Edge Function: Process AI Report Requests
// Uses Deno.serve() built-in — no deno.land import needed
// Supports: queued/pending request processing, test mode for dev page
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getModulePrompt } from './prompts.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Synthesis report — a NEW module id (15). 12 was already taken by "Syntax &
// Complexity". Consumes the request's `context` jsonb + `basis` (sessions | both |
// grammatica) instead of session transcripts.
const SYNTHESIS_MODULE_ID = 15;

// Which modules may receive learner context. An explicit allow-list, at module
// scope so it is visible in review, and asserted against prompt signatures by
// scripts/check-report-catalogue.sh.
//
// It used to be implicit: whether the context reached OpenAI depended on whether
// a prompt's function signature happened to declare a second parameter. Thirteen
// prompts ignored it, two accepted it, and adding `profileCtx?: string` to a
// legacy prompt during an unrelated refactor would have widened the transfer
// with no signal at all.
const PROFILE_CONTEXT_MODULES = new Set<number>([0, 1]);

// Learner free text, by field name. Every one of these is something a learner
// typed or dictated, and every one is a column that `purge_learner_input()`
// nulls — the point being that what the purge can delete and what a prompt may
// carry must be the same set. If they differ, one of them is lying: either we
// delete text we still send, or we promise deletion of text we no longer count
// as private.
const PROSE_KEYS = new Set<string>([
  'goal', 'goal_primary', 'bio_summary', 'native_goals',
  'short_term_goal', 'long_term_goal',
  'intake_transcript', 'longterm_transcript', 'shortterm_transcript',
  'intake_conversation_transcript', 'ai_objectives_conversation_transcript',
  'difficulties_other', 'why_english_other', 'profession_other',
  'native_lang_other', 'spoken_languages_other', 'improve_languages_other',
  'heard_from_other',
]);

// Remove prose keys at any depth.
//
// Recursive on purpose. `onboarding.goal` sits one level down, and a top-level
// check would have walked straight past it — which is precisely the shallow-parse
// mistake that produced a false "mismatch" when this data was audited with SQL.
function stripProse(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;                 // fail closed on absurd nesting
  if (Array.isArray(value)) return value.map((v) => stripProse(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PROSE_KEYS.has(k)) continue;
      out[k] = stripProse(v, depth + 1);
    }
    return out;
  }
  return value;
}

// The single source of learner facts for every prompt that gets personalisation.
//
// Read from the database rather than from the request, so the interpretation is
// the one extract-learner-profile produced — no name, no transcript, no
// quotation — and so a stale or hostile client cannot fabricate the facts a
// report is built on.
//
// Shared deliberately: the profile-context modules and the synthesis report must
// not drift into two different notions of what we know about this learner.
async function loadInterpretedProfile(userId: string): Promise<{
  coverage: string;
  profile: Record<string, unknown>;
  instruction: string;
}> {
  let facts: Record<string, any> = {};
  let coverage = 'none';
  {
    const { data: ext, error: extError } = await supabase
      .from('learner_profile_extractions')
      .select('payload, coverage')
      .eq('user_id', userId)
      .maybeSingle();
    // An unreadable extraction is an absent one, never a guessed one — the report
    // must not invent a goal. But it used to be swallowed by a try/catch that
    // cannot fire, because the client returns errors instead of throwing them, so
    // a failed read was indistinguishable from "this learner has no extraction".
    if (extError) {
      console.error('learner extraction unreadable for ' + userId + ': ' + extError.message +
        ' — treating as no profile');
    }
    const e = (ext || {}) as { payload?: Record<string, unknown>; coverage?: string };
    facts = (e.payload || {}) as Record<string, any>;
    coverage = e.coverage || 'none';
  }

  return {
    coverage,
    profile: {
      coverage,
      goals: facts.goals || { short_term: [], long_term: [] },
      difficulties: facts.difficulties || [],
      contexts: facts.contexts || [],
      motivation: facts.motivation || [],
      cefr_self_assessed: facts.cefr_self_assessed || null,
      constraints: facts.constraints || []
    },
    // Without this, an empty profile reads to a helpful model as a gap to fill,
    // and it invents goals the learner never expressed. The CHECK constraint on
    // learner_profile_extractions guarantees coverage and payload agree, so
    // 'none' really does mean there is nothing here.
    instruction: coverage === 'none'
      ? 'interpreted_profile.coverage is "none": there is no interpreted profile. Do not infer goals or needs from that absence — say instead that there is not enough information yet, and what would help.'
      : 'Base all personalisation on interpreted_profile. Do not add goals, needs or difficulties beyond it.'
  };
}

// ── Payment integrity ────────────────────────────────────────────────────────
//
// The charge is taken by the CLIENT (a `deduct_tokens` call in the browser) and
// only then is the request inserted. So the client is not a trustworthy narrator
// of whether it paid: three of the five enqueue sites in the frontend deducted
// nothing at all, and `ai_report_requests` accepts an INSERT from any signed-in
// user for their own row — for any module, at any price. The worker therefore
// asks the LEDGER, not the request, and refuses to work for free.
//
// Returns the credits actually charged for this request, or 0 when there is no
// charge on record.
async function loadChargedCredits(request: any): Promise<number> {
  const ref = request && request.charge_reference;
  if (!ref) return 0;
  {
    const { data, error } = await supabase
      .from('token_transactions')
      .select('amount')
      .eq('reference', ref)
      .eq('type', 'report_usage')
      .eq('user_id', request.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    // An unreadable ledger is still an unpaid request, never a guessed one — the
    // answer stays 0. What changes is that it is no longer indistinguishable from
    // "nothing was charged": the try/catch this replaced could never fire.
    if (error) {
      console.error('charged-credit lookup failed for reference ' + ref + ': ' + error.message +
        ' — treating the request as unpaid');
      return 0;
    }
    const amount = Number((data as any)?.amount ?? 0);
    return amount < 0 ? Math.abs(amount) : amount;   // charges are stored negative
  }
}

// What this product costs, from the same catalogue the UI prices from. An
// unknown module id falls back to 1 credit rather than 0, so a product somebody
// forgets to add to `report_products` cannot become free by omission.
async function requiredCredits(moduleId: number): Promise<number> {
  {
    const { data, error } = await supabase
      .from('report_products')
      .select('credits')
      .eq('id', moduleId)
      .maybeSingle();
    if (error) {
      console.error('price lookup failed for module ' + moduleId + ': ' + error.message +
        ' — charging the conservative default of 1');
      return 1;
    }
    const c = (data as any)?.credits;
    if (typeof c === 'number') return c;
    // Not an error: the product simply is not in the catalogue. Falls through to
    // 1 so a product nobody added cannot become free by omission.
  }
  return 1;
}

const ALLOWED_ORIGINS = new Set([
  'https://www.sottotitoli.pro',
  'https://sottotitoli.pro',
  'https://buoninglese.github.io',
  'http://localhost:8000',
  'http://localhost:5500',
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.sottotitoli.pro';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-s8t-cron',
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const CH = corsHeaders(req);

  // ── Authenticate: internal caller (cron/server) or a valid user; else reject ──
  //
  // ⚠️ `token === SUPABASE_SERVICE_KEY` can NEVER be true through the gateway.
  // SUPABASE_SERVICE_ROLE_KEY is now an `sb_secret_…` value, and the gateway
  // rejects that as a Bearer, so the matching string cannot be sent down this
  // path at all. The comparison is kept only for a direct (non-gateway) invoke.
  // Internal callers therefore authenticate with the x-s8t-cron header.
  //
  // That path is deliberately FAIL-CLOSED: if CRON_SECRET is unset or empty the
  // header can never match, so a forgotten secret can't silently open the
  // internal branches (testMode spends OpenAI credit; batch is service-only).
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
  const cronHeader = req.headers.get('x-s8t-cron') || '';
  const isService =
    (CRON_SECRET.length > 0 && cronHeader === CRON_SECRET) ||
    (token.length > 0 && token === SUPABASE_SERVICE_KEY);
  let callerId: string | null = null;
  if (!isService) {
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CH });
    const { data: { user } } = await supabase.auth.getUser(token);
    callerId = user?.id ?? null;
    if (!callerId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CH });
  }

  // ── Test Mode: Direct prompt testing — service/admin only, never public ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.testMode) {
        if (!isService) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CH });
        }
        // Direct test: call OpenAI with provided prompts
        const systemPrompt = body.systemPrompt || getModulePrompt(body.moduleId || 1, 'italiano', '').system;
        const userPrompt = body.userPrompt || 'Please analyze this transcript.';
        const transcript = body.transcript || '';

        const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: body.model || 'gpt-6-luna',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: transcript ? userPrompt.replace('{{transcript}}', transcript) : userPrompt }
            ],
            // gpt-6-luna rejects max_tokens and any temperature other than the
            // default, so the request sends neither.
            max_completion_tokens: body.max_tokens || 800
          })        });

        const aiData = await aiResp.json();
        return new Response(JSON.stringify({
          testMode: true,
          model: body.model || 'gpt-6-luna',
          usage: aiData.usage,
          content: aiData.choices?.[0]?.message?.content || '',
          finish_reason: aiData.choices?.[0]?.finish_reason || 'unknown'
        }), { headers: CH });
      }

      // ── Trigger processing immediately (called by frontend after insert) ──
      if (body.requestId) {
        const { data: request, error: requestError } = await supabase
          .from('ai_report_requests')
          .select('*')
          .eq('id', body.requestId)
          .single();

        // A transient failure is not "not found". Answering 404 told the caller
        // the request did not exist, so nothing retried and the report the user
        // paid for was never produced. PGRST116 is PostgREST's "no rows returned"
        // for .single(), which is the ONLY case that genuinely means not found.
        if (requestError && requestError.code !== 'PGRST116') {
          console.error('request lookup failed for ' + String(body.requestId) + ': ' + requestError.message);
          return new Response(JSON.stringify({ error: 'request lookup failed' }), { status: 500, headers: CH });
        }

        if (request) {
          if (!isService && request.user_id !== callerId) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders(req) });
          }
          // A signed-in caller may only KICK OFF a request that has not run yet.
          // Without this, any user could re-POST one of their own completed
          // request ids and have the report regenerated for free, over and over:
          // charging happens at enqueue, never here. Service callers keep the
          // ability to re-run anything, which is what recovery needs.
          if (!isService && request.status !== 'queued' && request.status !== 'pending') {
            return new Response(JSON.stringify({
              error: 'Request is not queued',
              status: request.status,
            }), { status: 409, headers: corsHeaders(req) });
          }
          // Same payment gate as the batch path, for the same reason.
          const price = await requiredCredits(parseInt(request.module_key) || request.module_id || 1);
          if (price > 0 && (await loadChargedCredits(request)) <= 0) {
            return new Response(JSON.stringify({ error: 'Unpaid request' }), { status: 402, headers: corsHeaders(req) });
          }
          const result = await processRequest(request);
          // Update request status
          const { error: completeError } = await supabase.from('ai_report_requests')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', request.id);
          if (completeError) {
            // If this write is lost the row stays queued, and the cron will pick it
            // up and generate a second report for the same request — paying for the
            // model twice. It has to be visible, not assumed away.
            console.error('generated the report but could not mark request ' + request.id +
              ' completed: ' + completeError.message + ' — the cron may regenerate it');
            return new Response(JSON.stringify({ error: 'could not mark request completed', result }), { status: 500, headers: CH });
          }
          return new Response(JSON.stringify({ processed: 1, result }), { headers: CH });
        }
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: CH });
      }
    } catch (e: any) {
      // Not JSON or other error — fall through to batch processing
      console.warn('POST body parse or test mode error:', e.message);
    }
  }

  // ── Batch Processing: internal/cron only ──
  if (!isService) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders(req) });
  }
  try {
    const { data: requests, error: fetchError } = await supabase
      .from('ai_report_requests')
      .select('*')
      .in('status', ['queued', 'pending'])
      .limit(10);

    if (fetchError) throw fetchError;
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending requests' }), {
        headers: CH,
      });
    }

    const results = [];
    for (const request of requests) {
      // Set to what the ledger says was charged, so the catch below refunds the
      // real amount (0 when nothing was ever paid).
      let charged = 0;
      try {
        // ── Payment gate ──────────────────────────────────────────────────────
        // Refuse to generate a report nobody paid for. The row may have been
        // inserted straight from a signed-in user's browser (RLS allows their own
        // row) or enqueued by one of the frontend paths that forgot to deduct, so
        // the ledger is the only place this question can be answered honestly.
        // Free products (credits = 0, e.g. the Snapshot) pass without a charge.
        const pricedModule = parseInt(request.module_key) || request.module_id || 1;
        const price = await requiredCredits(pricedModule);
        charged = await loadChargedCredits(request);
        if (price > 0 && charged <= 0) {
          throw new Error('unpaid_request: module ' + pricedModule + ' costs ' + price +
            ' credits and the ledger has no charge for charge_reference=' +
            String((request && request.charge_reference) ?? '(none)'));
        }
        const result = await processRequest(request);
        results.push(result);
      } catch (error: any) {
        const message = (error && error.message) ? String(error.message) : String(error);
        // Mark it failed rather than leaving it in 'processing'. Nothing re-reads
        // 'processing', so a request that throws would otherwise sit there forever
        // and the user would wait for a report that can never arrive. This became
        // reachable the moment a session could exist without a transcript:
        // processRequest() refuses those with 'No transcript found', which is the
        // correct outcome and now has somewhere to be recorded.
        const { error: markError } = await supabase
          .from('ai_report_requests')
          .update({ status: 'failed', error_message: message.slice(0, 500) })
          .eq('id', request.id);
        if (markError) console.error('could not mark request failed:', markError.message);

        // ── Refund the charge ─────────────────────────────────────────────────
        // The credits were taken at enqueue (deduct_tokens) and no report will
        // now be produced, so give them back IN FULL — no administrative fee.
        // Restoring an internal balance touches no payment processor, so there is
        // no cost to pass on; charging for our own failure would also be an
        // unfair-terms risk (policy agreed 2026-09-27). A processor fee is
        // withheld only on a *money* refund under the 14-day policy.
        //
        // tokens_spent is what the client recorded at enqueue, so it equals the
        // amount charged. The reference is derived from the request id, making
        // this idempotent — a second worker run for the same request cannot
        // double-refund, and neither can a client-side attempt.
        //
        // Only refund when the failure was actually RECORDED. If markError is set
        // the row is still 'processing'/'queued' and may yet succeed, so the money
        // stays put and the retry can still deliver.
        let refunded = false;
        if (!markError) {
          // The amount comes from the LEDGER, never from `request.tokens_spent`.
          // That column is overwritten with a token count on success, so for an
          // already-completed request it holds thousands — and it is a
          // client-supplied value on a row the client inserts, so it could be set
          // to anything.
          const amount = charged;
          // ── The reference must be the one the CHARGE was recorded under ────
          // refund_report_credits is bounded by design: it refunds at most what
          // was charged under the same reference, and at most once. This used to
          // pass 'report_refund:<request id>', which names a reference no charge
          // was ever recorded against — Bound 1 then found nothing, returned
          // 'no matching charge', and the refund silently did nothing. The user
          // kept paying for failed reports while the help text promised they were
          // "credited back in full, automatically". Silent, because a business-rule
          // refusal comes back as a normal response, not an RPC error.
          const refundRef = request.charge_reference;
          if (amount > 0 && refundRef) {
            const { data: refundData, error: refundError } = await supabase.rpc('refund_report_credits', {
              p_user_id: request.user_id,
              p_amount: amount,
              p_reference: refundRef,
            });
            if (refundError) {
              console.error('could not refund report credits:', refundError.message);
            } else {
              refunded = !!(refundData && refundData.success);
              if (!refunded) {
                // A refusal is a normal response, so log it: silence here is how
                // the broken reference went unnoticed.
                console.error('refund refused for request', request.id, JSON.stringify(refundData));
              }
            }
          } else {
            console.warn('nothing to refund for request', request.id,
              '(charged=' + amount + ', reference=' + String(refundRef) + ')');
          }
        }

        results.push({ id: request.id, status: 'error', message, marked: !markError, refunded });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: CH,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: CH,
    });
  }
});

// ═══ Core: Process a single AI report request ═══
async function processRequest(request: any) {
  // Update status to processing
  await supabase
    .from('ai_report_requests')
    .update({ status: 'processing' })
    .eq('id', request.id);

  // Read module_key (text) from request, parse to int for module lookup
  const moduleId = parseInt(request.module_key) || request.module_id || 1;

  // Synthesis (module 15) is profile-driven (context + basis), not transcript-driven.
  if (moduleId === SYNTHESIS_MODULE_ID) {
    return await processSynthesisRequest(request, moduleId);
  }

  // Get session_ids — handle both array and legacy single session_id
  const sessionIds: string[] = request.session_ids || [];
  if (!sessionIds.length && request.session_id) {
    sessionIds.push(request.session_id);
  }
  if (!sessionIds.length) {
    throw new Error('No session_ids in request');
  }

  // Fetch all session transcripts and combine
  const transcripts: string[] = [];
  for (const sid of sessionIds) {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('transcript_text')
      .eq('id', sid)
      .single();
    // PGRST116 (no such row) is a real condition. Anything else is a read failure,
    // and a report built from whichever sessions happened to load would
    // misrepresent the learner — better to fail and let it be retried.
    if (sessionError && sessionError.code !== 'PGRST116') {
      throw new Error('could not read session ' + sid + ': ' + sessionError.message);
    }
    if (session?.transcript_text) {
      transcripts.push(session.transcript_text);
    }
  }
  if (!transcripts.length) {
    throw new Error('No transcript found for session_ids: ' + sessionIds.join(','));
  }
  const combinedTranscript = transcripts.join('\n\n---\n\n');

  // Read user's native language from profile for report language
  let reportLanguage = 'italiano';
  {
    const { data: profile, error: langError } = await supabase
      .from('profiles')
      .select('native_lang')
      .eq('id', request.user_id)
      .maybeSingle();
    // A failed read silently produced an Italian report for a Dutch learner, and
    // the try/catch this replaces could never fire: the client returns errors
    // instead of throwing them.
    if (langError) {
      console.error('native language unreadable for ' + request.user_id + ': ' + langError.message +
        ' — defaulting the report language to italiano');
    }
    if (profile?.native_lang) {
      const langMap: Record<string, string> = {
        it: 'italiano', en: 'inglese', nl: 'olandese', fr: 'francese',
        de: 'tedesco', es: 'spagnolo', pt: 'portoghese', pl: 'polacco',
        ru: 'russo', zh: 'cinese', ja: 'giapponese', ko: 'coreano'
      };
      reportLanguage = langMap[profile.native_lang] || profile.native_lang;
    }
  }

  // ── Learner context for personalisation ────────────────────────────────
  //
  // ⚠️ PRIVACY — read this before adding a column.
  //
  // This object is sent to OpenAI with the report prompt, so it must not
  // identify the learner.
  //
  //   * `full_name` and `location` are deliberately NOT selected. A grammar or
  //     vocabulary analysis does not need to know who the learner is, and a name
  //     sent to a processor outside the EU is personal data this feature does
  //     not justify.
  //   * `bio_summary` is excluded for the same reason: free prose, and the field
  //     most likely to carry a name, employer or address.
  //   * The prompt instructs the model to address the learner as "you" and never
  //     to name them.
  //
  // Every field added here must also be described in privacy.html.
  //
  // ── Also a bug fix ──
  // `learning_profile` is a jsonb ARRAY of difficulty keys, not an object —
  // onboarding.html writes JSON.stringify(difficulties) into it. The previous
  // code read `learning_profile.goal_primary` and friends, so every value came
  // back undefined: the "CONTESTO UTENTE" block was empty apart from the name.
  // The real fields are flat columns on `profiles`, and these are them.
  let profileContext = '';
  try {
    const { data: profile, error: profileReadError } = await supabase
      .from('profiles')
      .select('native_lang, use_cases, domain, focus_preferences, feedback_preference, context_examples_preference, learning_profile')
      .eq('id', request.user_id)
      .maybeSingle();
    // The client returns errors instead of throwing, so without this the catch
    // below could never fire: a failed read would silently flatten every report for
    // this module to "no learner context", with nothing anywhere to show for it.
    if (profileReadError) throw new Error('profile read failed: ' + profileReadError.message);
    if (profile && PROFILE_CONTEXT_MODULES.has(moduleId)) {
      // The learner's own words are NOT read here. `goal_primary` is free text —
      // a learner who typed a name into a goal would have sent it — so goals come
      // from the structured interpretation instead. That interpretation is
      // produced once by extract-learner-profile and can contain no name, no
      // transcript and no quotation.
      const interpreted = await loadInterpretedProfile(request.user_id);
      const difficulties = Array.isArray(profile.learning_profile) ? profile.learning_profile : [];
      const ctx = {
        learner: {
          native_language: profile.native_lang || 'it',
          use_cases: profile.use_cases || [],
          self_reported_difficulties: difficulties,
          sector: profile.domain || null,
          focus_preferences: profile.focus_preferences || [],
          feedback_preference: profile.feedback_preference || null,
          wants_contextual_examples: profile.context_examples_preference || null
        },
        interpreted_profile: interpreted.profile,
        instructions: [
          'Address the learner directly as "you". Never name them and never guess a name.',
          // Without this, an empty profile reads to a helpful model as a gap to
          // fill, and it invents goals the learner never expressed.
          interpreted.instruction,
          'Derived traits are probabilistic; do not overclaim personality or age.'
        ]
      };
      profileContext = JSON.stringify(ctx, null, 2);
    }
  } catch (profileErr: any) {
    // Continuing without profile context still produces a valid report, just a
    // flatter one — but it must not happen invisibly.
    console.error('continuing without profile context for ' + request.user_id + ': ' +
      (profileErr && profileErr.message ? profileErr.message : String(profileErr)));
  }

  // ── Load configs (prompt overrides, global settings) ──
  let promptOverrides: Record<string, any> = {};
  let globalSettings: Record<string, any> = {};
  {
    const { data: configs, error: configsError } = await supabase.from('ai_configs').select('config_key,config_value');
    // These defaults are silent by nature: a failed read means no model override,
    // which the caller cannot see and which changes what the model actually does.
    if (configsError) {
      console.error('ai_configs unreadable: ' + configsError.message + ' — using defaults');
    }
    if (configs) {
      configs.forEach((c: any) => {
        if (c.config_key === 'prompt_overrides') promptOverrides = c.config_value || {};
        if (c.config_key === 'report_settings') globalSettings = c.config_value || {};
      });
    }
  }

  // Build prompt — check for overrides first
  let systemPrompt: string;
  let userPromptFn: (transcript: string) => string;

  const override = promptOverrides[String(moduleId)];
  if (override && override.system && override.user) {
    systemPrompt = override.system + '\n\nScrivi il report in ' + reportLanguage + '.';
    if (profileContext) systemPrompt += '\n\nCONTESTO UTENTE:\n' + profileContext;
    const userTemplate = override.user;
    userPromptFn = (t: string) => userTemplate.replace('{{transcript}}', t) + '\n\nScrivi il report in ' + reportLanguage + '.';
  } else {
    const prompt = getModulePrompt(moduleId, reportLanguage, profileContext);
    systemPrompt = prompt.system;
    userPromptFn = prompt.user;
  }

  const userPrompt = userPromptFn(combinedTranscript);

  // Call OpenAI API
  const model = globalSettings.default_model || 'gpt-6-luna';
  // gpt-6-luna rejects max_tokens and any temperature other than the default.
  const maxTokens = globalSettings.default_max_tokens || 800;

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: maxTokens
    })
  });

  const aiData = await aiResponse.json();
  if (!aiData.choices?.[0]?.message?.content) {
    throw new Error('OpenAI returned no content: ' + JSON.stringify(aiData).slice(0, 200));
  }
  const summaryText = aiData.choices[0].message.content;
  const tokensUsed = aiData.usage?.total_tokens || 0;

  // Insert completed report into session_ai_reports
  const now = new Date().toISOString();
  const { data: report, error: insertError } = await supabase
    .from('session_ai_reports')
    .insert({
      session_id: sessionIds[0],
      user_id: request.user_id,
      // Ties the report to the request that produced it, so the client can poll
      // for ITS report instead of the newest completed one. See migration
      // 20260929180000.
      request_id: request.id,
      module_id: moduleId,
      provider: 'openai',
      model,
      prompt_version: 'v2',
      status: 'completed',
      summary: summaryText,
      summary_text: summaryText,
      raw_json: aiData,
      updated_at: now
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error('Failed to insert session_ai_reports: ' + insertError.message);
  }

  // ── Extract scores from AI response ──
  //
  // sharedRules() asks every module to end with a machine-readable
  // `CONFIDENCE: <0-100>` line. It expresses how sure the model is ABOUT THE
  // ANALYSIS, not a grade for the learner — which is why it does not conflict
  // with the modules that deliberately refuse to assign CEFR band scores.
  const confMatch = summaryText.match(/CONFIDENCE\s*[:=]\s*(\d{1,3})/i);
  const confidenceValue: number | null = confMatch
    ? Math.max(0, Math.min(100, parseInt(confMatch[1], 10)))
    : null;

  let overallScore: number | null = null;

  // Legacy patterns: kept for reports that predate the CONFIDENCE instruction.
  // They never matched in practice (no module ever asked for `fluency: 85`-style
  // output), so they are harmless, and they still provide a fallback.
  const scorePatterns = [
    { regex: /fluency[:\s]*(\d+(?:\.\d+)?)/i, col: 'fluency_score' },
    { regex: /vocabulary[:\s]*(\d+(?:\.\d+)?)/i, col: 'vocabulary_score' },
    { regex: /grammar[:\s]*(\d+(?:\.\d+)?)/i, col: 'grammar_score' },
    { regex: /overall[:\s]*score[:\s]*(\d+(?:\.\d+)?)/i, col: 'quality_score' },
    { regex: /score[:\s]*(\d+(?:\.\d+)?)\s*\/\s*100/i, col: 'quality_score' },
    { regex: /score[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i, col: 'quality_score' },
  ];

  // ⚠️ The confidence value is deliberately NOT copied into
  // sessions.quality_score: that column describes the quality of the SESSION, and
  // filling it with an analysis-confidence figure would misreport it. Giving the
  // dashboard genuine per-skill numbers is option B's job.
  const scoreUpdates: Record<string, any> = { last_ai_metrics_at: new Date().toISOString() };
  scorePatterns.forEach(({ regex, col }) => {
    const match = summaryText.match(regex);
    if (match) {
      const val = parseFloat(match[1]);
      scoreUpdates[col] = val;
      if (col === 'quality_score' && overallScore === null) overallScore = val;
    }
  });

  // Try to find any number that looks like a score
  if (overallScore === null) {
    const anyScore = summaryText.match(/(\d{1,3})\s*\/\s*100/);
    if (anyScore) overallScore = parseFloat(anyScore[1]);
  }

  // Write the score columns back to the report.
  // `confidence` is the value's real home; `overall_score` is set to the same
  // number so every existing consumer of that column keeps working unchanged.
  // They intentionally hold the same value until option B separates them.
  if (report) {
    if (confidenceValue !== null) {
      await supabase
        .from('session_ai_reports')
        .update({ confidence: confidenceValue, overall_score: confidenceValue })
        .eq('id', report.id);
    } else if (overallScore !== null) {
      await supabase
        .from('session_ai_reports')
        .update({ overall_score: overallScore })
        .eq('id', report.id);
    }
  }

  // Write scores back to sessions table
  if (Object.keys(scoreUpdates).length > 1) {
    const { error: scoreError } = await supabase
      .from('sessions')
      .update(scoreUpdates)
      .eq('id', sessionIds[0]);
    if (scoreError) {
      console.error('could not write session scores for ' + sessionIds[0] + ': ' + scoreError.message);
    }
  }

  // ── Grant entitlement (if family_key exists) ──
  if (request.family_key) {
    // This used to be `try { ...insert... } catch (_) { /* entitlement may already
    // exist */ }`. The Supabase client RETURNS errors, it does not throw them, so
    // that catch could never fire: the duplicate it was written for went unseen,
    // and so would every other failure. A guard that cannot trigger is worse than
    // no guard, because it looks handled. 23505 is the duplicate we expect.
    const { error: entitlementError } = await supabase.from('user_ai_entitlements').insert({
      user_id: request.user_id,
      entitlement_key: 'report_' + request.family_key,
      period_type: 'unlimited',
      uses_allowed: 1,
      uses_consumed: 1,
      is_active: true
    });
    if (entitlementError && entitlementError.code !== '23505') {
      console.error('could not grant entitlement for ' + request.user_id + ': ' + entitlementError.message);
    }
  }

  // ── Deduct tokens (if not already deducted by frontend) ──
  // Frontend does the real atomic deduction via RPC. This call passes p_amount 0
  // as a "safety record", and was wrapped in `catch (_) { /* RPC may not exist yet
  // */ }` — which, again, the client can never trigger. It either recorded nothing
  // or failed silently. Now a failure is at least visible.
  const { error: deductError } = await supabase.rpc('deduct_tokens', {
    p_user_id: request.user_id,
    p_amount: 0, // Frontend already deducted — this is just a safety record
    p_reference: 'report_' + request.id
  });
  if (deductError) {
    console.error('deduct_tokens(p_amount=0) failed for request ' + request.id + ': ' + deductError.message);
  }

  // Mark request as completed
  await supabase
    .from('ai_report_requests')
    .update({
      status: 'completed',
      report_markdown: summaryText,
      tokens_spent: tokensUsed,
      input_snapshot: combinedTranscript.slice(0, 2000),
      prompt_key: String(moduleId),
      completed_at: new Date().toISOString()
    })
    .eq('id', request.id);

  return { id: request.id, status: 'success', moduleId, tokensUsed };
}

// ═══ Synthesis report (module 15) — profile-driven, not transcript-driven ═══
// Reads the request's `context` jsonb (learner profile + onboarding + `basis`) and
// optionally the session transcripts, builds a personalised multi-page report, and
// writes it to session_ai_reports exactly like processRequest does. Unlike
// processRequest it does NOT require session_ids/transcripts: a `grammatica` basis
// produces a report from the context alone. The frontend charged credits at
// enqueue; this function records, it does not deduct.
async function processSynthesisRequest(request: any, moduleId: number) {
  // The client assembles this payload, so it is untrusted input to a prompt —
  // not data we control. Two things happen before any of it can reach the model:
  //
  //   1. Learner free text is removed outright. The shipped client no longer
  //      sends `onboarding.goal`, but a cached bundle still does: it is the one
  //      field the old allow-list kept, it is the learner's own written goal, and
  //      a learner who typed their name into it would have sent the name. The
  //      removal is here as well as there because a client must never be able to
  //      put prose into a prompt by being out of date.
  //
  //   2. The structured interpretation is added from the database, not from the
  //      request. Personalisation therefore survives the raw text disappearing,
  //      and cannot be fabricated by whatever the caller chooses to send.
  //
  // Together these mean the synthesis report gets strictly more useful context
  // than before while carrying strictly less of the learner's own words.
  const cleanContext = stripProse(request.context || {}) as Record<string, unknown>;
  const basis = (cleanContext.basis === 'sessions' || cleanContext.basis === 'grammatica')
    ? cleanContext.basis as string
    : 'both';

  const interpreted = await loadInterpretedProfile(request.user_id);
  const context: Record<string, unknown> = {
    ...cleanContext,
    interpreted_profile: interpreted.profile,
    instructions: [
      'Address the learner directly as "you". Never name them and never guess a name.',
      interpreted.instruction
    ]
  };

  // Transcripts are only needed when the basis includes sessions. Tolerate none.
  const sessionIds: string[] = (basis === 'grammatica') ? [] : (request.session_ids || []);
  const transcripts: string[] = [];
  for (const sid of sessionIds) {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('transcript_text')
      .eq('id', sid)
      .single();
    if (sessionError && sessionError.code !== 'PGRST116') {
      throw new Error('could not read session ' + sid + ': ' + sessionError.message);
    }
    if (session?.transcript_text) transcripts.push(session.transcript_text);
  }
  const combinedTranscript = transcripts.join('\n\n---\n\n');

  // Read user's native language from profile for report language.
  let reportLanguage = 'italiano';
  {
    const { data: profile, error: langError } = await supabase
      .from('profiles')
      .select('native_lang')
      .eq('id', request.user_id)
      .maybeSingle();
    if (langError) {
      console.error('native language unreadable for ' + request.user_id + ': ' + langError.message +
        ' — defaulting the report language to italiano');
    }
    if (profile?.native_lang) {
      const langMap: Record<string, string> = {
        it: 'italiano', en: 'inglese', nl: 'olandese', fr: 'francese',
        de: 'tedesco', es: 'spagnolo', pt: 'portoghese', pl: 'polacco',
        ru: 'russo', zh: 'cinese', ja: 'giapponese', ko: 'coreano'
      };
      reportLanguage = langMap[profile.native_lang] || profile.native_lang;
    }
  }

  // Global settings (model/temperature/max_tokens) from ai_configs.report_settings.
  let globalSettings: Record<string, any> = {};
  {
    const { data: configs, error: configsError } = await supabase.from('ai_configs').select('config_key,config_value');
    if (configsError) {
      console.error('ai_configs unreadable: ' + configsError.message + ' — using default model settings');
    }
    if (configs) {
      configs.forEach((c: any) => {
        if (c.config_key === 'report_settings') globalSettings = c.config_value || {};
      });
    }
  }

  // The context JSON (which includes `basis`) is passed as profileCtx.
  const profileCtx = JSON.stringify(context, null, 2);
  const prompt = getModulePrompt(moduleId, reportLanguage, profileCtx);
  const systemPrompt = prompt.system;
  const userPrompt = prompt.user(combinedTranscript);

  const model = globalSettings.default_model || 'gpt-6-luna';
  // The synthesis report is multi-page (six sections + a large context payload),
  // so it needs far more room than the default 800-token session reports. 3000
  // tokens (~2000 words) keeps the full report intact instead of truncating it.
  const maxTokens = globalSettings.synthesis_max_tokens || 3000;

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: maxTokens
    })
  });

  const aiData = await aiResponse.json();
  if (!aiData.choices?.[0]?.message?.content) {
    throw new Error('OpenAI returned no content: ' + JSON.stringify(aiData).slice(0, 200));
  }
  const summaryText = aiData.choices[0].message.content;
  const tokensUsed = aiData.usage?.total_tokens || 0;

  const now = new Date().toISOString();
  const { data: report, error: insertError } = await supabase
    .from('session_ai_reports')
    .insert({
      session_id: sessionIds[0] || null,
      user_id: request.user_id,
      // Same as processRequest: without this the client can only poll for the
      // newest completed report, not the one it asked for.
      request_id: request.id,
      module_id: moduleId,
      provider: 'openai',
      model,
      prompt_version: 'v2',
      status: 'completed',
      summary: summaryText,
      summary_text: summaryText,
      raw_json: aiData,
      updated_at: now
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error('Failed to insert session_ai_reports: ' + insertError.message);
  }

  const confMatch = summaryText.match(/CONFIDENCE\s*[:=]\s*(\d{1,3})/i);
  const confidenceValue: number | null = confMatch
    ? Math.max(0, Math.min(100, parseInt(confMatch[1], 10)))
    : null;

  if (report && confidenceValue !== null) {
    await supabase
      .from('session_ai_reports')
      .update({ confidence: confidenceValue, overall_score: confidenceValue })
      .eq('id', report.id);
  }

  // Mark request as completed. The synthesis input is the context, not the
  // transcript, so that is what gets snapshotted.
  await supabase
    .from('ai_report_requests')
    .update({
      status: 'completed',
      report_markdown: summaryText,
      tokens_spent: tokensUsed,
      // The whole context, stored as jsonb rather than a truncated string. It
      // used to be `profileCtx.slice(0, 2000)`, which is SHORTER than a typical
      // payload — so the record stopped part-way through the client's own data
      // and never contained the server-added `interpreted_profile` or
      // `instructions`. The snapshot exists to answer one question, "what did we
      // actually send?", and it could not answer it. As an object it can also be
      // queried (`input_snapshot ? 'interpreted_profile'`) instead of
      // string-matched, which is how a check of mine was fooled earlier today.
      input_snapshot: context,
      prompt_key: String(moduleId),
      completed_at: new Date().toISOString()
    })
    .eq('id', request.id);

  return { id: request.id, status: 'success', moduleId, tokensUsed, basis };
}
