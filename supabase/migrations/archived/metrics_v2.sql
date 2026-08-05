-- Migration: metrics v2 — MATTR, sentence_metrics, connectors
-- Run once against the Supabase sessions table.

-- Add metrics_version column (v1 = old raw TTR, v2 = MATTR)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS metrics_version INTEGER DEFAULT 1;

-- Nullify quality_score for all existing rows — it was a placeholder, not a real metric
UPDATE sessions SET quality_score = NULL WHERE metrics_version = 1;

-- Add sentence_metrics column (array of per-sentence objects)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sentence_metrics JSONB;

-- Add connectors column (cohesion markers by type)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS connectors JSONB;

-- Optional: recompute lexical_diversity for recent sessions using MATTR?
-- This is complex to do in SQL alone. Instead, report AI should check metrics_version:
--   v1 → ignore lexical_diversity (raw TTR, unreliable)
--   v2 → use lexical_diversity (MATTR, valid)
-- Existing rows stay at v1; new sessions from updated code write v2.
