-- 202607180005_word_bank_catalog_seed.sql
-- Seeds the 10 fixed bank definitions (4 pinned + 4 smart + 2 yours starters)

begin;

insert into public.review_bank_definitions
(key, title, group_key, bank_type, is_system, is_pinned, is_smart, is_user_creatable,
 description, subtitle_template, empty_state_text, sort_mode, filter, config)
values
-- ── Pinned (4 operational banks) ──
('review_due_now', 'Review Due Now', 'pinned', 'queue', true, true, false, false,
 'Words due now or overdue for spaced repetition.',
 'Words ready for review right now',
 'All caught up for now.',
 'due_mastery',
 '{}'::jsonb,
 '{}'::jsonb),

('new_from_sessions', 'New From Recent Sessions', 'pinned', 'queue', true, true, false, false,
 'Recently captured words not yet stabilized.',
 'New words from your recent sessions',
 'No new captured words right now.',
 'recent_first',
 '{}'::jsonb,
 '{"window_days":7}'::jsonb),

('saved_from_sessions', 'Saved From Sessions', 'pinned', 'collection-queue', true, true, false, false,
 'Words you explicitly saved during live sessions — high intent.',
 'Saved words from live use',
 'You haven''t saved any session words yet.',
 'due_then_saved',
 '{}'::jsonb,
 '{}'::jsonb),

('fragile_words', 'Fragile Words', 'pinned', 'rescue-queue', true, true, false, false,
 'Weak or unstable words at risk of being forgotten.',
 'Words that need reinforcement',
 'No fragile words at the moment.',
 'weakest_first',
 '{}'::jsonb,
 '{"mastery_lt":40,"lapses_gte":2}'::jsonb),

-- ── Smart (4 recommendation banks) ──
('goal_next_step', 'Next Step For Your Goal', 'smart', 'recommendation', true, false, true, false,
 'Goal-aligned vocabulary suggestions based on your profile.',
 'Suggested for your current goal',
 'No goal-based suggestions yet. Complete your profile to get started.',
 'rank_desc',
 '{}'::jsonb,
 '{}'::jsonb),

('build_from_known', 'Build From What You Know', 'smart', 'recommendation', true, false, true, false,
 'Lexical progression: words derived from what you already know.',
 'Follow-on words from your existing vocabulary',
 'No follow-on vocabulary yet.',
 'rank_desc',
 '{}'::jsonb,
 '{}'::jsonb),

('activate_recognized', 'Activate What You Already Recognize', 'smart', 'recommendation', true, false, true, false,
 'Words you understand but rarely use actively — turn recognition into production.',
 'Suggested from your recognition-production gap',
 'No recognition-to-usage candidates right now.',
 'gap_desc',
 '{}'::jsonb,
 '{"recognition_gte":50,"production_lt":45}'::jsonb),

('upcoming_useful_vocab', 'Upcoming Useful Vocabulary', 'smart', 'recommendation', true, false, true, false,
 'Words likely useful for your next roadmap stage.',
 'Suggested for what comes next',
 'No upcoming vocabulary queued yet.',
 'rank_desc',
 '{}'::jsonb,
 '{}'::jsonb),

-- ── Yours (2 starter collections) ──
('new_words', 'New Words', 'yours', 'user-collection', true, false, false, false,
 'Your personal staging area for new words.',
 'Words you chose to keep',
 'No words here yet. Add words from Smart suggestions or sessions.',
 'manual',
 '{}'::jsonb,
 '{}'::jsonb),

('saved_for_later', 'Saved For Later', 'yours', 'user-collection', true, false, false, false,
 'Your personal parking area for words you want to revisit.',
 'Words you parked for later',
 'Nothing saved for later yet.',
 'manual',
 '{}'::jsonb,
 '{}'::jsonb)
on conflict (key) do update
set
  title = excluded.title,
  group_key = excluded.group_key,
  bank_type = excluded.bank_type,
  is_system = excluded.is_system,
  is_pinned = excluded.is_pinned,
  is_smart = excluded.is_smart,
  is_user_creatable = excluded.is_user_creatable,
  description = excluded.description,
  subtitle_template = excluded.subtitle_template,
  empty_state_text = excluded.empty_state_text,
  sort_mode = excluded.sort_mode,
  filter = excluded.filter,
  config = excluded.config,
  updated_at = now();

commit;
