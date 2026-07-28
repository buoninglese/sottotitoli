/**
 * generate-grammar-report — Full grammar report pipeline.
 *
 * Pipeline:
 * 1. Fetch all transcript segments for a session
 * 2. Call grammar-segment for each line
 * 3. Aggregate errors by category
 * 4. Cross-reference user profile + previous reports
 * 5. Generate personalized advice
 * 6. Save to grammar_reports table
 *
 * Trigger: POST { sessionId, contentLanguage, explanationLanguage }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAMMAR_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/grammar-segment`;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.sottotitoli.pro',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Error category mapping from LanguageTool-style rule names
function categorizeError(explanation: string): string {
  const lower = explanation.toLowerCase();
  if (/verb|tense|conjugat|agreement|past|present|future|modal|auxiliary/i.test(lower)) return 'verb_form';
  if (/article|a\s|an\s|the\s/i.test(lower)) return 'article';
  if (/preposition|in\s|on\s|at\s|to\s|for\s|with\s/i.test(lower)) return 'preposition';
  if (/subject.verb|agreement|singular|plural/i.test(lower)) return 'subject_verb';
  if (/word.order|position|placement/i.test(lower)) return 'word_order';
  if (/spelling|capitalization|punctuation|apostrophe/i.test(lower)) return 'mechanics';
  if (/pronoun|possessive|reflexive/i.test(lower)) return 'pronoun';
  return 'other';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { sessionId, contentLanguage = 'en', explanationLanguage = 'en' } = await req.json();
    if (!sessionId) throw new Error('sessionId required');

    // 1. Create report row (processing)
    const { data: report, error: insertErr } = await supabase
      .from('grammar_reports')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        status: 'processing',
        content_language: contentLanguage,
        explanation_language: explanationLanguage,
      })
      .select('id')
      .single();
    if (insertErr || !report) throw new Error('Failed to create report: ' + (insertErr?.message || 'unknown'));

    // 2. Fetch transcript segments
    const { data: segments, error: segErr } = await supabase
      .from('transcript_segments')
      .select('id, source_text, source_language')
      .eq('session_id', sessionId)
      .order('sequence', { ascending: true });
    if (segErr) throw new Error('Failed to fetch segments: ' + segErr.message);
    if (!segments || segments.length === 0) {
      await supabase.from('grammar_reports').update({ status: 'complete', total_lines: 0 }).eq('id', report.id);
      return json({ reportId: report.id, status: 'complete', totalLines: 0 });
    }

    // 3. Call grammar-segment for each line (sequential to avoid rate limits)
    const results: Array<{ original: string; corrected: string; explanations: string[]; categories: string[] }> = [];
    for (const seg of segments) {
      try {
        const resp = await fetch(GRAMMAR_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            segmentId: seg.id,
            content_language: contentLanguage,
            explanation_language: explanationLanguage,
            provider: 'llama31',
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.grammar && data.grammar.corrected_text !== data.grammar.original_text) {
            const explanations = data.explanation ? data.explanation.split('\n').filter(Boolean) : [];
            const categories = explanations.map((e: string) => categorizeError(e));
            results.push({
              original: data.grammar.original_text,
              corrected: data.grammar.corrected_text,
              explanations,
              categories,
            });
          }
        }
      } catch (e) {
        console.warn('Grammar check failed for segment', seg.id, e);
      }
    }

    // 4. Aggregate errors
    const categoryCounts: Record<string, number> = {};
    const errorMap: Record<string, { error: string; count: number; category: string }> = {};
    for (const r of results) {
      for (let i = 0; i < r.explanations.length; i++) {
        const cat = r.categories[i] || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        const key = `${r.original} → ${r.corrected}`.substring(0, 80);
        if (errorMap[key]) {
          errorMap[key].count++;
        } else {
          errorMap[key] = { error: key, count: 1, category: cat };
        }
      }
    }

    // Top errors sorted by count
    const topErrors = Object.values(errorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const linesWithErrors = results.length;
    const totalErrors = results.reduce((sum, r) => sum + r.explanations.length, 0);

    // 5. Cross-reference user profile for personalized advice
    let personalizedAdvice = '';
    try {
      const { data: profile } = await supabase.from('profiles').select('native_lang,learning_profile,goal_primary').eq('id', user.id).single();
      const { data: prefs } = await supabase.from('user_preferences').select('native_lang').eq('user_id', user.id).maybeSingle();
      const nativeLang = profile?.native_lang || prefs?.native_lang || 'en';

      // Find previous report
      const { data: prevReport } = await supabase
        .from('grammar_reports')
        .select('id, error_categories, top_errors, created_at')
        .eq('user_id', user.id)
        .neq('id', report.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build advice based on profile + errors + history
      const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      advice += `Il tuo errore più frequente è nella categoria "${topCategory?.[0] || 'generica'}". `;

      if (profile?.goal_primary) {
        advice += `Considerando il tuo obiettivo "${profile.goal_primary}", `;
      }

      if (prevReport) {
        // Compare with previous
        const prevCats = prevReport.error_categories || {};
        const improved = Object.entries(categoryCounts).filter(([cat, count]) => (prevCats[cat] || 0) > count);
        const worsened = Object.entries(categoryCounts).filter(([cat, count]) => count > (prevCats[cat] || 0));
        if (improved.length) advice += `Sei migliorato in: ${improved.map(([c]) => c).join(', ')}. `;
        if (worsened.length) advice += `Attenzione a: ${worsened.map(([c]) => c).join(', ')}. `;
      }

      personalizedAdvice = advice;
    } catch (e) {
      console.warn('Could not generate personalized advice:', e);
    }

    // 6. Update report
    const correctedTranscript = segments.map((seg, i) => {
      const r = results.find(r => r.original === seg.source_text);
      return r ? r.corrected : seg.source_text;
    }).join('\n');

    await supabase.from('grammar_reports').update({
      status: 'complete',
      total_lines: segments.length,
      lines_with_errors: linesWithErrors,
      error_count: totalErrors,
      error_categories: categoryCounts,
      top_errors: topErrors,
      personalized_advice: personalizedAdvice || null,
      corrected_transcript: correctedTranscript,
      model_used: 'llama31',
      previous_report_id: prevReport?.id || null,
    }).eq('id', report.id);

    return json({
      reportId: report.id,
      status: 'complete',
      totalLines: segments.length,
      linesWithErrors,
      errorCount: totalErrors,
      topErrors,
      personalizedAdvice,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
