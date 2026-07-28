-- Migration: Add avatar_url column to profiles
-- Run in Supabase SQL Editor
-- Context: panoramica.html Profilo → avatar upload persistence

ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
