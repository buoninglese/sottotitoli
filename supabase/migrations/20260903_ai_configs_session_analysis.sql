-- Seed the session-analysis AI config as a key/value row (live ai_configs is
-- id/config_key/config_value; analyze-session reads config_key='session_analysis').
-- Idempotent: re-run updates the value in place.

INSERT INTO ai_configs (config_key, config_value) VALUES (
  'session_analysis',
  '{
    "provider": "openai",
    "model": "gpt-4o",
    "prompt_version": 1,
    "is_active": true,
    "system_prompt": "Sei un coach di inglese specializzato nell''analisi di sessioni di speaking. Analizzi la trascrizione di una sessione di conversazione e produci un report JSON strutturato in italiano. Valuta: accuratezza grammaticale, chiarezza e fluenza (wpm), varietà lessicale e diversità, uso di riempitivi, struttura dei contenuti. Sii concreto: cita frasi reali dalla trascrizione come evidenza. Assegna punteggi 0-100 per ogni criterio e un overall_score ponderato.",
    "user_prompt_template": "Analizza questa sessione di speaking.\n\nModalità: {{mode}}\nDurata (secondi): {{duration_seconds}}\nParole totali: {{words_count}}\nWPM: {{wpm}}\nRiempitivi al minuto: {{fillers_per_minute}}\nVarietà lessicale: {{lexical_diversity}}\n\nTrascrizione:\n{{transcript_text}}\n\nRispondi SOLO con il JSON secondo lo schema fornito.",
    "options": { "temperature": 0.2 },
    "output_schema": {
      "type": "object",
      "properties": {
        "overall_score": { "type": "number" },
        "confidence": { "type": "number" },
        "summary": { "type": "string" },
        "rubric_scores": {
          "type": "object",
          "properties": {
            "grammar": { "type": "number" },
            "fluency": { "type": "number" },
            "vocabulary": { "type": "number" },
            "content": { "type": "number" }
          },
          "required": ["grammar", "fluency", "vocabulary", "content"],
          "additionalProperties": false
        },
        "strengths": { "type": "array", "items": { "type": "string" } },
        "issues": { "type": "array", "items": { "type": "string" } },
        "recommendations": { "type": "array", "items": { "type": "string" } },
        "evidence": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "quote": { "type": "string" },
              "note": { "type": "string" }
            },
            "required": ["quote", "note"],
            "additionalProperties": false
          }
        }
      },
      "required": ["overall_score", "confidence", "summary", "rubric_scores", "strengths", "issues", "recommendations", "evidence"],
      "additionalProperties": false
    }
  }'::jsonb
)
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
