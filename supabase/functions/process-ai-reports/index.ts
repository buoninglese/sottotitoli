// Supabase Edge Function: Process AI Report Requests
// Uses Deno.serve() built-in — no deno.land import needed
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getModulePrompt } from './prompts.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  try {
    // Get pending AI report requests
    const { data: requests, error: fetchError } = await supabase
      .from('ai_report_requests')
      .select('*')
      .eq('status', 'queued')
      .limit(10);

    if (fetchError) throw fetchError;
    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending requests' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const request of requests) {
      try {
        // Update status to processing
        await supabase
          .from('ai_report_requests')
          .update({ status: 'processing' })
          .eq('id', request.id);

        // Fetch session transcript
        const { data: session } = await supabase
          .from('sessions')
          .select('transcript_text')
          .eq('id', request.session_ids[0])
          .single();

        if (!session?.transcript_text) {
          throw new Error('No transcript found');
        }

        // Read module_key (text) from request, parse to int for module lookup
        const moduleId = parseInt(request.module_key) || 1;

        // Call OpenAI API
        const prompt = getModulePrompt(moduleId, session.transcript_text);
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user }
            ],
            temperature: 0.7,
            max_tokens: 800
          })
        });

        const aiData = await aiResponse.json();
        const summaryText = aiData.choices[0].message.content;
        const tokensUsed = aiData.usage.total_tokens;

        // Insert completed report
        const { data: report } = await supabase
          .from('session_ai_reports')
          .insert({
            session_id: request.session_ids[0],
            user_id: request.user_id,
            module_id: moduleId,
            provider: 'openai',
            model: 'gpt-4o',
            status: 'completed',
            summary_text: summaryText
          })
          .select('id')
          .single();

        // ── Extract scores from AI response ──
        let overallScore = null;
        const scorePatterns = [
          { regex: /fluency[:\s]*(\d+(?:\.\d+)?)/i, col: 'fluency_score' },
          { regex: /vocabulary[:\s]*(\d+(?:\.\d+)?)/i, col: 'vocabulary_score' },
          { regex: /grammar[:\s]*(\d+(?:\.\d+)?)/i, col: 'grammar_score' },
          { regex: /overall[:\s]*score[:\s]*(\d+(?:\.\d+)?)/i, col: 'quality_score' },
          { regex: /score[:\s]*(\d+(?:\.\d+)?)\s*\/\s*100/i, col: 'quality_score' },
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
            .eq('id', request.session_ids[0]);
        }

        // ── Grant entitlement ──
        await supabase.from('user_ai_entitlements').insert({
          user_id: request.user_id,
          entitlement_key: 'report_' + request.family_key,
          period_type: 'unlimited',
          uses_allowed: 1,
          uses_consumed: 1,
          is_active: true
        });

        // Mark request as completed
        await supabase
          .from('ai_report_requests')
          .update({ status: 'completed' })
          .eq('id', request.id);

        results.push({ id: request.id, status: 'success' });
      } catch (error: any) {
        // Mark as failed
        await supabase
          .from('ai_report_requests')
          .update({ status: 'failed' })
          .eq('id', request.id);

        results.push({ id: request.id, status: 'error', message: error.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
