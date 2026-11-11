-- ═══════════════════════════════════════════════════════════════════════════
--  Drop tables that duplicate a live implementation.
--
--  Why these and only these
--  ────────────────────────
--  Every table here was verified on 2026-11-11 to be:
--    • 0 rows,
--    • referenced by no code (no client, no edge function, no SQL function body),
--    • the duplicate of a table that IS live and populated,
--    • the target of no view or dependent object.
--
--  What replaced each one:
--    vocabulary_entries, wordbank   → user_vocabulary / user_wordbanks / user_wordbank_words
--    grammar_reports                → session_ai_reports (written by process-ai-reports)
--    review_ai_queues,
--    review_custom_queues,
--    review_suggestion_feedback     → review_words / review_bank_words (the shipped path)
--    room_counters                  → the WebSocket relay's own ordering
--
--  NOT dropped on purpose: the review_attempts / review_sessions /
--  review_word_relations cluster, segment_*, rooms / room_members /
--  room_invites, client_errors, referrals, user_ai_entitlements and
--  organisation_members. Those encode features that were designed but never
--  built — they are dormant, not duplicate.
--
--  Full DDL for everything involved is archived at
--    ~/Desktop/sottotitoli-dead-schema-2026-11-11.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- The only dependent object: allocate_room_sequence() writes room_counters.
-- It has no call site anywhere in the repo (0 rpc() calls, no edge function).
drop function if exists public.allocate_room_sequence(uuid);

drop table if exists public.room_counters;
drop table if exists public.vocabulary_entries;
drop table if exists public.wordbank;
drop table if exists public.review_ai_queues;
drop table if exists public.review_custom_queues;
drop table if exists public.review_suggestion_feedback;
drop table if exists public.grammar_reports;
