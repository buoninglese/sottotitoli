// Supabase Edge Function: Process AI Report Requests
// Uses Deno.serve() built-in — no deno.land import needed
// Supports: queued/pending request processing, test mode for dev page
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getModulePrompt } from './prompts.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Test Mode: Direct prompt testing (from dev.html) ──
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.testMode) {
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
            model: body.model || 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: transcript ? userPrompt.replace('{{transcript}}', transcript) : userPrompt }
            ],
            temperature: body.temperature || 0.7,
            max_tokens: body.max_tokens || 800
          })
        });

        const aiData = await aiResp.json();
        return new Response(JSON.stringify({
          testMode: true,
          model: body.model || 'gpt-4o',
          usage: aiData.usage,
          content: aiData.choices?.[0]?.message?.content || '',
          finish_reason: aiData.choices?.[0]?.finish_reason || 'unknown'
        }), { headers: corsHeaders });
      }

      // ── Trigger processing immediately (called by frontend after insert) ──
      if (body.requestId) {
        const { data: request } = await supabase
          .from('ai_report_requests')
          .select('*')
          .eq('id', body.requestId)
          .single();

        if (request) {
          const result = await processRequest(request);
          // Update request status
          await supabase.from('ai_report_requests')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', request.id);
          return new Response(JSON.stringify({ processed: 1, result }), { headers: corsHeaders });
        }
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      // Not JSON or other error — fall through to batch processing
      console.warn('POST body parse or test mode error:', e.message);
    }
  }

  // ── Batch Processing: Process all queued (and pending) requests ──
  try {
    const { data: requests, error: fetchError } = await supabase
      .from('ai_report_requests')
      .select('*')
      .in('status', ['queued', 'pending'])
      .limit(10);

    if (fetchError) throw fetchError;
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending requests' }), {
        headers: corsHeaders,
      });
    }

    const results = [];
    for (const request of requests) {
      try {
        const result = await processRequest(request);
        results.push(result);
      } catch (error: any) {
        results.push({ id: request.id, status: 'error', message: error.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: corsHeaders,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
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
    const { data: session } = await supabase
      .from('sessions')
      .select('transcript_text')
      .eq('id', sid)
      .single();
    if (session?.transcript_text) {
      transcripts.push(session.transcript_text);
    }
  }
  if (!transcripts.length) {
    throw new Error('No transcript found for session_ids: ' + sessionIds.join(','));
  }
  const combinedTranscript = transcripts.join('\n\n---\n\n');

  // Read module_key (text) from request, parse to int for module lookup
  const moduleId = parseInt(request.module_key) || request.module_id || 1;

  // Read user's native language from profile for report language
  let reportLanguage = 'italiano';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('native_lang')
      .eq('id', request.user_id)
      .maybeSingle();
    if (profile?.native_lang) {
      const langMap: Record<string, string> = {
        it: 'italiano', en: 'inglese', nl: 'olandese', fr: 'francese',
        de: 'tedesco', es: 'spagnolo', pt: 'portoghese', pl: 'polacco',
        ru: 'russo', zh: 'cinese', ja: 'giapponese', ko: 'coreano'
      };
      reportLanguage = langMap[profile.native_lang] || profile.native_lang;
    }
  } catch (_) { /* keep default italiano */ }

  // Build user profile context for AI personalization
  let profileContext = '';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, native_lang, location, learning_profile')
      .eq('id', request.user_id)
      .maybeSingle();
    if (profile) {
      const lp = profile.learning_profile || {};
      const ctx = {
        identity: {
          name: profile.full_name || '',
          native_language: profile.native_lang || 'it',
          location: profile.location || ''
        },
        learning: {
          primary_target_language: 'en',
          goal_primary: lp.goal_primary || null,
          usage_contexts: lp.use_cases || [],
          short_term_goal: lp.short_term_goal || '',
          self_assessed_level: lp.self_assessed_level || null
        },
        personalization: {
          sector: lp.domain || null,
          feedback_focus: lp.feedback_focus || [],
          feedback_tone: lp.feedback_tone || 'balanced',
          preferred_register: lp.preferred_register || null,
          wants_contextual_examples: lp.wants_contextual_examples || null
        },
        derived_context: {
          bio_summary: lp.bio || '',
          likely_needs: [] as string[],
          confidence_notes: [
            'Derived traits are probabilistic',
            'Do not overclaim personality or age'
          ]
        }
      };
      if (ctx.personalization.feedback_focus.indexOf('precision') !== -1 || ctx.personalization.sector === 'engineering') {
        ctx.derived_context.likely_needs.push('terminology accuracy');
      }
      if (ctx.personalization.preferred_register === 'professional') {
        ctx.derived_context.likely_needs.push('concise professional phrasing');
      }
      profileContext = JSON.stringify(ctx, null, 2);
    }
  } catch (_) { /* continue without profile context */ }

  // ── Load configs (prompt overrides, global settings) ──
  let promptOverrides: Record<string, any> = {};
  let globalSettings: Record<string, any> = {};
  try {
    const { data: configs } = await supabase.from('ai_configs').select('config_key,config_value');
    if (configs) {
      configs.forEach((c: any) => {
        if (c.config_key === 'prompt_overrides') promptOverrides = c.config_value || {};
        if (c.config_key === 'report_settings') globalSettings = c.config_value || {};
      });
    }
  } catch (_) { /* use defaults */ }

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
  const model = globalSettings.default_model || 'gpt-4o';
  const temperature = globalSettings.default_temperature || 0.7;
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
      temperature,
      max_tokens: maxTokens
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
  let overallScore: number | null = null;
  const scorePatterns = [
    { regex: /fluency[:\s]*(\d+(?:\.\d+)?)/i, col: 'fluency_score' },
    { regex: /vocabulary[:\s]*(\d+(?:\.\d+)?)/i, col: 'vocabulary_score' },
    { regex: /grammar[:\s]*(\d+(?:\.\d+)?)/i, col: 'grammar_score' },
    { regex: /overall[:\s]*score[:\s]*(\d+(?:\.\d+)?)/i, col: 'quality_score' },
    { regex: /score[:\s]*(\d+(?:\.\d+)?)\s*\/\s*100/i, col: 'quality_score' },
    { regex: /score[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i, col: 'quality_score' },
  ];

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

  // Write overall_score back to the report
  if (overallScore !== null && report) {
    await supabase
      .from('session_ai_reports')
      .update({ overall_score: overallScore })
      .eq('id', report.id);
  }

  // Write scores back to sessions table
  if (Object.keys(scoreUpdates).length > 1) {
    await supabase
      .from('sessions')
      .update(scoreUpdates)
      .eq('id', sessionIds[0]);
  }

  // ── Grant entitlement (if family_key exists) ──
  if (request.family_key) {
    try {
      await supabase.from('user_ai_entitlements').insert({
        user_id: request.user_id,
        entitlement_key: 'report_' + request.family_key,
        period_type: 'unlimited',
        uses_allowed: 1,
        uses_consumed: 1,
        is_active: true
      });
    } catch (_) { /* entitlement may already exist */ }
  }

  // ── Deduct tokens (if not already deducted by frontend) ──
  // Frontend now does atomic deduction via RPC, but we also try here as safety net
  try {
    await supabase.rpc('deduct_tokens', {
      p_user_id: request.user_id,
      p_amount: 0, // Frontend already deducted — this is just a safety record
      p_reference: 'report_' + request.id
    });
  } catch (_) { /* RPC may not exist yet */ }

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
