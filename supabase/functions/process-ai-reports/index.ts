// Supabase Edge Function: Process AI Report Requests
// Deno runtime

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    // Get pending AI report requests
    const { data: requests, error: fetchError } = await supabase
      .from('ai_report_requests')
      .select('*')
      .eq('status', 'pending')
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

        // Get module details
        const { data: module } = await supabase
          .from('ai_report_modules')
          .select('*')
          .eq('id', request.module_id)
          .single();

        // Call OpenAI API
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an expert English language assessor analyzing speaking transcripts.`
              },
              {
                role: 'user',
                content: `Analyze this transcript for ${module?.label}:\n\n${session.transcript_text}\n\nProvide detailed assessment.`
              }
            ],
            temperature: 0.7,
            max_tokens: 800
          })
        });

        const aiData = await aiResponse.json();
        const summaryText = aiData.choices[0].message.content;
        const tokensUsed = aiData.usage.total_tokens;

        // Insert completed report
        await supabase
          .from('session_ai_reports')
          .insert({
            session_id: request.session_ids[0],
            user_id: request.user_id,
            module_id: request.module_id,
            provider: 'openai',
            model: 'gpt-4',
            prompt_version: 'v1.0',
            status: 'done',
            summary_text: summaryText,
            raw_json: aiData,
            tokens_used: tokensUsed
          });

        // Mark request as completed
        await supabase
          .from('ai_report_requests')
          .update({ status: 'completed' })
          .eq('id', request.id);

        results.push({ id: request.id, status: 'success' });
      } catch (error: any) {
        // Mark as error
        await supabase
          .from('ai_report_requests')
          .update({ status: 'error', error_message: error.message })
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
