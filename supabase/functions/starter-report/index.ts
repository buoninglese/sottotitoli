// Supabase Edge Function: starter-report
// Generates a personalized onboarding report using OpenAI.
// Deploy: supabase functions deploy starter-report --no-verify-jwt
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const ALLOWED_ORIGINS = new Set([
  "https://www.sottotitoli.pro",
  "https://sottotitoli.pro",
  "https://buoninglese.github.io",
  "http://localhost:8000",
  "http://localhost:5500",
]);
function corsHeadersFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.sottotitoli.pro";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

const SYSTEM_PROMPT = `Sei un coach linguistico esperto che analizza i dati di onboarding di un nuovo studente di inglese.
Devi generare UNICAMENTE un JSON valido, senza markdown, senza commenti, senza testo prima o dopo.

Il JSON deve avere esattamente questa struttura:
{
  "report_md": "Un report personalizzato in italiano (markdown, 3-4 paragrafi) che dà il benvenuto, analizza il profilo, identifica punti di forza e aree di miglioramento, e motiva lo studente.",
  "objectives": {
    "short_term": "Obiettivo a breve termine (1-3 mesi) formulato in modo SMART, in italiano, massimo 2 frasi",
    "long_term": "Obiettivo a lungo termine (6-12 mesi) formulato in modo SMART, in italiano, massimo 2 frasi"
  },
  "focus_areas": [
    {
      "priority": 1,
      "title": "Titolo breve dell'area di focus (3-6 parole in italiano)",
      "description": "Descrizione pratica e attuabile (1-2 frasi in italiano)"
    }
  ],
  "reliability": "Una valutazione del livello attuale (A1-C2) con una breve spiegazione in italiano (1-2 frasi)",
  "next_step": "La prossima azione concreta consigliata, in italiano (1 frase)"
}

Regole IMPORTANTI:
- Il report_md DEVE essere in italiano, empatico e motivante
- Gli obiettivi DEVONO essere SMART
- Le focus_areas DEVONO essere 3-6, ordinate per priorità
- NON inventare dati — basati solo sulle informazioni fornite
- Se mancano dati, sii onesto e suggerisci di completarli
- Non usare MAI un nome, nemmeno se ne trovi uno nei dati: rivolgiti allo studente con "tu". Il suo nome non viene fornito di proposito.
- Se copertura_dei_dati è "none": dillo apertamente nel report_md — non ci sono ancora abbastanza informazioni — e indica cosa completare. NON inventare obiettivi né aree di focus.
- Se copertura_dei_dati è "thin": usa i fatti presenti, ma dichiara che il quadro è parziale.
- IL JSON DEVE ESSERE VALIDO`;

// The structured selections this function is allowed to forward.
//
// An ALLOWLIST, and a short one. This function previously used a denylist and
// spliced the whole onboarding object — including the spoken transcripts — into
// the prompt, reasoning that the transcripts are the richest signal, which is
// true. extract-learner-profile now carries that signal as structured facts, so
// the prose need not travel and "what may be sent" stops depending on someone
// remembering to add each new private field to a list.
//
// Only values the learner picked from a list, plus fields about their language
// rather than their identity. No free text, no name, no consent bookkeeping.
const FORWARDED_ONBOARDING_FIELDS = [
  'native_lang', 'english_level', 'english_situations', 'why_english',
  'difficulties', 'profession', 'spoken_languages', 'improve_languages',
] as const;

function selectOnboarding(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of FORWARDED_ONBOARDING_FIELDS) {
    const v = src[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    out[key] = v;
  }
  return out;
}

// firstNameFrom() used to live here. It read Google's `user_metadata.full_name`
// and put the learner's first name into the prompt so the report could greet
// them. It was careful — verified session, never the request body, no fallback to
// the email local part — and it was still sending a name to OpenAI to improve an
// opening line. Removed.
//
// If a greeting is wanted back, it belongs in the RESPONSE, composed locally from
// data the server already holds, not in the prompt.

serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Require an authenticated caller — this spends OpenAI credits.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();

    // The learner's prose is deliberately NOT read here. It is interpreted once by
    // extract-learner-profile into structured facts, and this function reasons over
    // those. Two functions reading the same input under two different rules was the
    // incoherence being replaced.
    //
    // Triggered inline rather than relying on the background extraction, because
    // this runs at the end of onboarding, before an async one has necessarily
    // landed. It is idempotent and cheap: an unchanged source hash short-circuits
    // without a model call.
    let extraction: Record<string, unknown> | null = null;
    try {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      await fetch(`${SUPABASE_URL}/functions/v1/extract-learner-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const { data } = await userClient
        .from("learner_profile_extractions")
        .select("payload, coverage, confidence")
        .eq("user_id", user.id)
        .maybeSingle();
      extraction = data as Record<string, unknown> | null;
    } catch (e) {
      console.warn("starter-report: extraction unavailable:", e.message);
    }

    const structured = selectOnboarding(body.onboarding_data);
    const coverage = (extraction?.coverage as string) || "none";
    const facts = extraction?.payload || {
      goals: { short_term: [], long_term: [] }, difficulties: [], contexts: [],
      motivation: [], constraints: [], cefr_self_assessed: null, profession_field: null,
    };

    // Key names only, never values: enough to debug a missing field without putting
    // a user's answers into the function log.
    console.log('starter-report: coverage=' + coverage +
      ' | structured keys: ' + Object.keys(structured).join(',') +
      ' | extraction: ' + (extraction ? 'present' : 'absent'));

    const userPrompt =
      SYSTEM_PROMPT +
      "\n\nFATTI ESTRATTI DAL PROFILO:\n" + JSON.stringify(facts, null, 2) +
      "\n\nRISPOSTE STRUTTURATE (valori scelti dallo studente):\n" + JSON.stringify(structured, null, 2) +
      "\n\ncopertura_dei_dati: " + coverage +
      "\n\nGenera il JSON ora:";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        messages: [{ role: "user", content: userPrompt }],
        // gpt-6-luna rejects max_tokens ("use max_completion_tokens") and rejects
        // any temperature other than the default, so neither is sent.
        max_completion_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${resp.status}`, detail: errText.slice(0, 300) }),
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await resp.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "";

    // Strip markdown code fences
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // Try to find first { and last }
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        try {
          result = JSON.parse(raw.slice(start, end + 1));
        } catch {
          return new Response(
            JSON.stringify({ error: "AI response was not valid JSON", raw: raw.slice(0, 500) }),
            { status: 422, headers: corsHeaders }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "AI response was not valid JSON", raw: raw.slice(0, 500) }),
          { status: 422, headers: corsHeaders }
        );
      }
    }

    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Server error: ${e.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }
});
