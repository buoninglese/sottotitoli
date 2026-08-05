-- Fix: add duration_minutes column needed by session trigger
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC(5,1);
