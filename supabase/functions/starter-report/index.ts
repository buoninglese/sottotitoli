// Supabase Edge Function: starter-report
// Generates a personalized onboarding report using OpenAI.
// Deploy: supabase functions deploy starter-report --no-verify-jwt
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
- IL JSON DEVE ESSERE VALIDO`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const onboarding_data = body.onboarding_data || {};

    const userPrompt =
      SYSTEM_PROMPT +
      "\n\nDATI ONBOARDING:\n" +
      JSON.stringify(onboarding_data, null, 2) +
      "\n\nGenera il JSON ora:";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.7,
        max_tokens: 4096,
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
