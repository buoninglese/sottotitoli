-- Add AI/language preference columns to profiles
alter table public.profiles 
  add column if not exists explanation_language text,
  add column if not exists ai_model text,
  add column if not exists ai_provider text;
