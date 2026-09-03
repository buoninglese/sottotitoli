import { createClient } from "jsr:@supabase/supabase-js@2";

type SessionRow = {
  id: string;
  user_id: string;
  mode: string | null;
  duration_seconds: number | null;
  words_count: number | null;
  wpm: number | null;
  fillers_per_minute: number | null;
  lexical_diversity: number | null;
  transcript_text: string | null;
};

type AIConfigRow = {
  id: string;
  provider: string;
  model: string;
  prompt_version: string;
  system_prompt: string;
  user_prompt_template: string;
  output_schema: any;
  options: Record<string, any> | null;
};

function corsHeaders(origin: string | null = "*") {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

function fillTemplate(template: string, session: SessionRow) {
  return template
    .replaceAll("{{mode}}", String(session.mode ?? ""))
    .replaceAll("{{duration_seconds}}", String(session.duration_seconds ?? ""))
    .replaceAll("{{words_count}}", String(session.words_count ?? ""))
    .replaceAll("{{wpm}}", String(session.wpm ?? ""))
    .replaceAll("{{fillers_per_minute}}", String(session.fillers_per_minute ?? ""))
    .replaceAll("{{lexical_diversity}}", String(session.lexical_diversity ?? ""))
    .replaceAll("{{transcript_text}}", String(session.transcript_text ?? ""));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    // Service-role client: DB requests must run with RLS bypassed because this
    // function analyzes arbitrary sessions by id. Do NOT forward the caller's
    // Authorization token into the client — that scopes every query to the
    // caller's role (anon) and RLS would hide other users' sessions.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Optional caller identity for ownership enforcement: a user token may only
    // trigger analysis on that user's own session. Server/cron callers (service
    // role bearer, or no token) may analyze any session.
    const authHeader = req.headers.get("Authorization");
    const bearer = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
    const isTrustedServer = !!bearer && bearer === serviceRoleKey;
    let callerId: string | null = null;
    if (!isTrustedServer && bearer) {
      const { data: { user } } = await admin.auth.getUser(bearer);
      callerId = user?.id ?? null;
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ ok: false, error: "session_id is required" }), {
        status: 400,
        headers: corsHeaders(origin)
      });
    }

    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("id, user_id, mode, duration_seconds, words_count, wpm, fillers_per_minute, lexical_diversity, transcript_text")
      .eq("id", session_id)
      .single<SessionRow>();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ ok: false, error: "Session not found" }), {
        status: 404,
        headers: corsHeaders(origin)
      });
    }

    // Ownership guard: a resolved user token may only analyze that user's session.
    if (callerId && session.user_id !== callerId) {
      return new Response(JSON.stringify({ ok: false, error: "Not authorized for this session" }), {
        status: 403,
        headers: corsHeaders(origin)
      });
    }

    if (!session.transcript_text || !session.transcript_text.trim()) {
      await admin
        .from("sessions")
        .update({ ai_status: "failed", ai_last_error: "Missing transcript_text" })
        .eq("id", session_id);

      return new Response(JSON.stringify({ ok: false, error: "No transcript_text available" }), {
        status: 400,
        headers: corsHeaders(origin)
      });
    }

    await admin
      .from("sessions")
      .update({ ai_status: "processing", ai_last_error: null })
      .eq("id", session_id);

    // Live ai_configs is a key/value store (id, config_key, config_value) — the
    // same pattern process-ai-reports uses. The columnar session-analysis config
    // lives JSON-serialized under config_key='session_analysis'.
    let config: AIConfigRow | null = null;
    try {
      const { data: cfgRow, error: cfgError } = await admin
        .from("ai_configs")
        .select("id, config_value")
        .eq("config_key", "session_analysis")
        .maybeSingle<{ id: string; config_value: unknown }>();

      if (!cfgError && cfgRow) {
        const parsed = typeof cfgRow.config_value === "string"
          ? JSON.parse(cfgRow.config_value)
          : cfgRow.config_value;
        if (parsed && parsed.is_active !== false && parsed.system_prompt && parsed.model) {
          config = { id: cfgRow.id, ...(parsed as Omit<AIConfigRow, "id">) };
        }
      }
    } catch (_) {
      config = null;
    }

    if (!config) {
      await admin
        .from("sessions")
        .update({ ai_status: "failed", ai_last_error: "No active AI config found" })
        .eq("id", session_id);

      return new Response(JSON.stringify({ ok: false, error: "No active AI config found" }), {
        status: 500,
        headers: corsHeaders(origin)
      });
    }

    const userPrompt = fillTemplate(config.user_prompt_template, session);
    const temperature = Number(config.options?.temperature ?? 0.2);

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: config.system_prompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "session_analysis",
            schema: config.output_schema,
            strict: true
          }
        },
        temperature
      })
    });

    const aiJson = await aiResponse.json();

    if (!aiResponse.ok) {
      const errMsg = aiJson?.error?.message || "AI request failed";
      await admin
        .from("sessions")
        .update({ ai_status: "failed", ai_last_error: errMsg })
        .eq("id", session_id);

      return new Response(JSON.stringify({ ok: false, error: errMsg, raw: aiJson }), {
        status: 500,
        headers: corsHeaders(origin)
      });
    }

    const rawText = aiJson?.output?.[0]?.content?.[0]?.text;
    if (!rawText) {
      await admin
        .from("sessions")
        .update({ ai_status: "failed", ai_last_error: "No structured output returned" })
        .eq("id", session_id);

      return new Response(JSON.stringify({ ok: false, error: "No structured output returned", raw: aiJson }), {
        status: 500,
        headers: corsHeaders(origin)
      });
    }

    const result = JSON.parse(rawText);

    const { error: upsertError } = await admin
      .from("session_ai_reports")
      .upsert({
        session_id: session.id,
        user_id: session.user_id,
        config_id: config.id,
        provider: config.provider,
        model: config.model,
        prompt_version: config.prompt_version,
        status: "completed",
        overall_score: result.overall_score ?? null,
        confidence: result.confidence ?? null,
        summary: result.summary ?? null,
        rubric_scores: result.rubric_scores ?? {},
        strengths: result.strengths ?? [],
        issues: result.issues ?? [],
        recommendations: result.recommendations ?? [],
        evidence: result.evidence ?? [],
        raw_json: result,
        updated_at: new Date().toISOString()
      }, { onConflict: "session_id" });

    if (upsertError) {
      await admin
        .from("sessions")
        .update({ ai_status: "failed", ai_last_error: upsertError.message })
        .eq("id", session_id);

      return new Response(JSON.stringify({ ok: false, error: upsertError.message }), {
        status: 500,
        headers: corsHeaders(origin)
      });
    }

    await admin
      .from("sessions")
      .update({ ai_status: "completed", ai_last_error: null })
      .eq("id", session_id);

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: corsHeaders(origin)
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: corsHeaders(origin)
    });
  }
});
