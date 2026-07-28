-- Add starter_report_md column to onboarding_responses for AI-generated report
ALTER TABLE IF EXISTS onboarding_responses ADD COLUMN IF NOT EXISTS starter_report_md TEXT;
