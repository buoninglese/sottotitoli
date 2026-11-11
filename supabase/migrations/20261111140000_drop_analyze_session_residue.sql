-- ═══════════════════════════════════════════════════════════════════════════
--  Remove the analyze-session residue.
--
--  Why
--  ---
--  `analyze-session` was a second, competing producer of session AI reports.
--  It never ran once: `sessions.ai_status` has DEFAULT 'pending' and all four
--  sessions still read 'pending'. `process-ai-reports` is the pipeline that
--  actually produces them (4 rows in session_ai_reports, all gpt-4o), so this
--  function and its config row are dead weight that makes the schema look like a
--  feature exists when it does not.
--
--  Verified 2026-11-11 before dropping: no policy, no view, and no SQL function
--  references ai_status or ai_last_error; no client code references either
--  (one comment in js/passive-signals.js explains that it is NOT that state).
--
--  ⚠️ `last_ai_metrics_at` is deliberately KEPT. It looks like part of the same
--  trio, and an early draft of this migration dropped it — but
--  process-ai-reports/index.ts writes it on every processed report. Dropping it
--  would have broken the live pipeline.
-- ═══════════════════════════════════════════════════════════════════════════

delete from public.ai_configs where config_key = 'session_analysis';

alter table public.sessions drop column if exists ai_status;
alter table public.sessions drop column if exists ai_last_error;

comment on column public.sessions.last_ai_metrics_at is
  'Written by process-ai-reports. KEPT deliberately when the analyze-session residue was removed.';
