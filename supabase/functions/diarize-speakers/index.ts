// Supabase Edge Function: diarize-speakers
// Identifies speakers in transcript using OpenAI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lines } = await req.json();
    
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript lines provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build transcript text with line numbers
    const transcriptText = lines
      .map((line, i) => `[${i}] ${line}`)
      .join("\n");

    const prompt = `You are a speaker diarization system. Given a transcript with numbered lines, identify which speaker said each line. Use context clues like conversation flow, question-answer patterns, topic shifts, and discourse markers.

Return ONLY a JSON array of objects with this exact format:
[{"lineIndex": 0, "speaker": "Speaker A"}, {"lineIndex": 1, "speaker": "Speaker B"}, ...]

Rules:
- Maximum 3 distinct speakers (Speaker A, Speaker B, Speaker C)
- If you're uncertain, make your best guess based on conversation flow
- Do NOT include any explanation or text outside the JSON array
- Every line must have a speaker assigned

Transcript:
${transcriptText}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a precise speaker diarization engine. Return only valid JSON arrays." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from OpenAI response
    let speakerMap;
    try {
      // Try direct parse
      speakerMap = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          speakerMap = JSON.parse(match[0]);
        } catch (e2) {
          return new Response(
            JSON.stringify({ error: "Failed to parse diarization result", raw: content }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to parse diarization result", raw: content }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build result: attach speaker to each line
    const speakerMap_byIndex = {};
    speakerMap.forEach((item) => {
      speakerMap_byIndex[item.lineIndex] = item.speaker;
    });

    const result = lines.map((text, i) => ({
      text,
      speaker: speakerMap_byIndex[i] || "Speaker A",
      speakerIndex: (speakerMap_byIndex[i] || "Speaker A").charCodeAt(8) - 65, // 'A' -> 0, 'B' -> 1
    }));

    return new Response(
      JSON.stringify({ lines: result, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Diarization error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
