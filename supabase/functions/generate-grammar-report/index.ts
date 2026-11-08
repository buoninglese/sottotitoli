/**
 * generate-grammar-report — Full grammar report pipeline.
 *
 * Pipeline:
 * 1. Fetch the session transcript (sessions.transcript_text) + verify ownership
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

    // 2. Fetch the session transcript + verify ownership.
    //    The session's text is in sessions.transcript_text — NOT transcript_segments
    //    (that table belongs to the Translation-rooms feature and has no session_id).
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('user_id, transcript_text, language_pair')
      .eq('id', sessionId)
      .single();
    if (sessErr || !session) throw new Error('Session not found');
    if (session.user_id !== user.id) throw new Error('Not authorized for this session');

    const sessionLang = String(session.language_pair || '').split('-')[0].toLowerCase();
    const effectiveContentLang = sessionLang || contentLanguage || 'en';
    await supabase.from('grammar_reports').update({ content_language: effectiveContentLang }).eq('id', report.id);

    // Split the transcript into analysable lines (strip any [MM:SS] timestamp prefixes)
    const lines: string[] = String(session.transcript_text || '')
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      await supabase.from('grammar_reports').update({ status: 'complete', total_lines: 0 }).eq('id', report.id);
      return json({ reportId: report.id, status: 'complete', totalLines: 0 });
    }

    // 3. Call grammar-segment for each line (pass the text directly — no segmentId)
    const results: Array<{ original: string; corrected: string; explanations: string[]; categories: string[] }> = [];
    for (const line of lines) {
      try {
        const resp = await fetch(GRAMMAR_FUNCTION_URL, {
          method: 'POST',
          headers: {
            // Forward the caller's user JWT. The service-role key is the new
            // sb_secret_ key, which the functions gateway rejects as a Bearer.
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: line,
            content_language: effectiveContentLang,
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
        console.warn('Grammar check failed for line', line, e);
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
    let prevReportId: string | null = null;
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('native_lang,learning_profile,goal_primary').eq('id', user.id).single();
      const { data: prefs, error: prefsError } = await supabase.from('user_preferences').select('native_lang').eq('user_id', user.id).maybeSingle();
      // The client returns errors instead of throwing, so the catch around this
      // block cannot see them: a failed read silently produced an English report
      // for an Italian learner. PGRST116 (no row) is a real condition; the rest are
      // failures.
      if (profileError && profileError.code !== 'PGRST116') throw new Error('profile read failed: ' + profileError.message);
      if (prefsError) throw new Error('preferences read failed: ' + prefsError.message);
      const nativeLang = profile?.native_lang || prefs?.native_lang || 'en';

      // Find previous report
      const { data: prevReport, error: prevError } = await supabase
        .from('grammar_reports')
        .select('id, error_categories, top_errors, created_at')
        .eq('user_id', user.id)
        .neq('id', report.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevError) throw new Error('previous report read failed: ' + prevError.message);
      prevReportId = prevReport?.id ?? null;

      // Build advice based on profile + errors + history
      let advice = '';
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
    const correctedTranscript = lines.map((line) => {
      const r = results.find(r => r.original === line);
      return r ? r.corrected : line;
    }).join('\n');

    await supabase.from('grammar_reports').update({
      status: 'complete',
      total_lines: lines.length,
      lines_with_errors: linesWithErrors,
      error_count: totalErrors,
      error_categories: categoryCounts,
      top_errors: topErrors,
      personalized_advice: personalizedAdvice || null,
      corrected_transcript: correctedTranscript,
      model_used: 'llama31',
      previous_report_id: prevReportId,
    }).eq('id', report.id);

    return json({
      reportId: report.id,
      status: 'complete',
      totalLines: lines.length,
      linesWithErrors,
      errorCount: totalErrors,
      topErrors,
      personalizedAdvice,
    });
  } catch (error) {
    return json({ error: (error as Error).message || 'unknown_error' }, 500);
  }
});
