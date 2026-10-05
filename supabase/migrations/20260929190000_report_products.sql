-- ═══════════════════════════════════════════════════════════════════════════
-- report_products — one source of truth for "what reports exist"
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT WAS WRONG
--
-- Five places claimed to know which reports exist, and none of them agreed:
--
--   1. public.ai_report_families     a taxonomy (cambridge/business/academic/
--                                    linguistic_analysis) that no code reads,
--                                    and that the modules contradicted anyway
--   2. public.ai_report_modules      ids, labels, default_rule — read by nothing
--                                    but the FK from session_ai_reports
--   3. ai_configs.preset_pricing     prices + module ids. DEAD: no code reads it.
--                                    It looked authoritative, which is worse than
--                                    being absent
--   4. MODULE_PROMPTS in prompts.ts  what the worker can actually generate
--   5. PRESET_MAP in the frontend    what the UI names and charges
--
-- The result, verified against live:
--   * 9 UI presets collapsed onto 5 prompts; three of the nine (holistic,
--     personalized, growth) were the same prompt
--   * "CEFR Extravaganza" (4cr, promising an A1–C2 lexicon split) delivered the
--     Pronunciation prompt
--   * "Cambridge Speaking" (4cr) delivered Discourse Analysis
--   * module 0 (Snapshot) had a prompt but no catalogue row, so the FK from
--     session_ai_reports meant a finished Snapshot could not be stored
--   * module 11–14 said family 'linguistic' and module 15 said 'synthesis';
--     neither family row existed. `family` was NOT NULL free text with no FK,
--     so nothing could ever catch it
--
-- WHAT THIS DOES
--
-- One table, one row per product, one promise per row: the row names the price,
-- the id the worker uses for its prompt, and whether the product is on. A row
-- cannot drift from itself.
--
-- The price moves here from ai_configs.preset_pricing, which is deleted. The
-- dead family taxonomy is dropped. The id space is deliberately NOT renumbered:
-- session_ai_reports.module_id references it, so historical reports keep their
-- meaning, and newly shipped products take ids 16+.
--
-- User-facing copy still lives in the HTML as Italian with data-i18n keys —
-- that is the i18n architecture and it is not worth breaking. What lives here is
-- the set of products, their price, and their basis: exactly the facts that
-- drifted silently, because nobody can see a wrong price in a UI that
-- calculates it from the same wrong number.
--
-- products that shipped and were sold, by id:
--   1  Comprehensive Report   3cr  sessions   ACTIVE  (was labelled
--                                               "Grammar & Accuracy"; the prompt
--                                               is a full report, so the label
--                                               was simply wrong)
--   2  Vocabulary Range       2cr  sessions   ACTIVE  (label matches the prompt)
--   3  Fluency & Coherence    2cr  sessions   ACTIVE  (exact match)
--   4  Pronunciation          4cr  sessions   ACTIVE  (exact match)
--   11 Discourse Analysis     4cr  sessions   ACTIVE  (exact match)
--   15 Synthesis Report       2cr  both       ACTIVE  (profile-driven)
--
--   0,5,6,7,8,9,10,12,13,14 are catalogued but not sold. They keep their rows and
--   their labels so history renders, and stay valid targets so they can be
--   switched on by flipping one boolean instead of another migration.

-- ── 1. Rename: this table is the product catalogue now ────────────────────
alter table public.ai_report_modules rename to report_products;
-- ── 2. The columns that make it a product, not a taxonomy ────────────────
alter table public.report_products
  add column if not exists product_key text,
  add column if not exists credits     integer not null default 2,
  add column if not exists basis       text    not null default 'sessions',
  add column if not exists is_active   boolean not null default true,
  add column if not exists sort_order  integer not null default 0;
-- ── 3. Backfill: an honest name and a real price for every id ────────────
update public.report_products p
set product_key = v.product_key,
    label       = v.label,
    credits     = v.credits,
    basis       = v.basis,
    is_active   = v.is_active,
    sort_order  = v.sort_order
from (values
  ( 1, 'comprehensive',            'Comprehensive Report',      3, 'sessions', true,  10),
  ( 2, 'vocabulary',               'Vocabulary Range',          2, 'sessions', true,  30),
  ( 3, 'fluency',                  'Fluency & Coherence',       2, 'sessions', true,  20),
  ( 4, 'pronunciation',            'Pronunciation',             4, 'sessions', true,  50),
  (11, 'discourse',                'Discourse Analysis',        4, 'sessions', true,  40),
  (15, 'synthesis',                'Synthesis Report',          2, 'both',     true,  90),
  ( 0, 'snapshot',                 'Snapshot',                  0, 'sessions', false,  5),
  ( 5, 'professional_communication','Professional Communication',3, 'sessions', false, 60),
  ( 6, 'meetings_presentations',   'Meetings & Presentations',  3, 'sessions', false, 61),
  ( 7, 'business_vocabulary',      'Business Vocabulary',       2, 'sessions', false, 62),
  ( 8, 'academic_discourse',       'Academic Discourse',        3, 'sessions', false, 63),
  ( 9, 'research_communication',   'Research Communication',    3, 'sessions', false, 64),
  (10, 'academic_vocabulary',      'Academic Vocabulary',       2, 'sessions', false, 65),
  (12, 'syntax_complexity',        'Syntax & Complexity',       2, 'sessions', false, 66),
  (13, 'lexical_analysis',         'Lexical Analysis',          2, 'sessions', false, 67),
  (14, 'filler_analysis',          'Filler Analysis',           2, 'sessions', false, 68)
) as v(id, product_key, label, credits, basis, is_active, sort_order)
where p.id = v.id;
-- ── 4. Drop the second axis ─────────────────────────────────────────────
-- `family` was NOT NULL free text with no FK, and its values did not even match
-- the family rows. No code reads it. The taxonomy is gone; a product's identity
-- is its own row.
--
-- Done before inserting id 0 below, because `family` is NOT NULL and the
-- Snapshot has no family. (It is also why the first attempt at this migration
-- rolled back: order matters.)
alter table public.report_products drop column if exists family;
drop table if exists public.ai_report_families;
-- ── 5. Module 0: the free Snapshot had a prompt and no row ────────────────
-- session_ai_reports.module_id references this table, so without a row a
-- completed Snapshot could never be stored — the model would run, burn tokens,
-- and the insert would fail on the FK.
--
-- is_active = false on purpose: the prompt promises "free, 1/day" and no rate
-- limit exists yet. A free product with no cap is an open tab on the OpenAI
-- bill. Flip this to true once the cap is enforced.
insert into public.report_products (id, label, description, default_rule,
                                    product_key, credits, basis, is_active, sort_order)
values (0, 'Snapshot',
        'Free, brief per-session read-out.',
        'Two to four concrete observations on grammar, vocabulary and fluency, each citing an example from the transcript, ending in one actionable next step.',
        'snapshot', 0, 'sessions', false, 5)
on conflict (id) do nothing;
-- ── 6. Constraints: the invariants that were missing ─────────────────────
update public.report_products set product_key = 'product_' || id where product_key is null;
alter table public.report_products
  alter column product_key set not null;
create unique index if not exists report_products_product_key_key
  on public.report_products (product_key);
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'report_products_credits_check'
                   and conrelid = 'public.report_products'::regclass) then
    alter table public.report_products
      add constraint report_products_credits_check check (credits >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'report_products_basis_check'
                   and conrelid = 'public.report_products'::regclass) then
    alter table public.report_products
      add constraint report_products_basis_check
      check (basis in ('sessions', 'both', 'grammatica'));
  end if;
end $$;
-- Keep the id sequence ahead of the highest id so the next product gets 16+.
select setval(
  pg_get_serial_sequence('public.report_products', 'id'),
  greatest((select coalesce(max(id), 1) from public.report_products), 1)
);
-- ── 7. Remove the dead price source ───────────────────────────────────────
-- ai_configs.preset_pricing was read by no code, yet it was the file the
-- frontend comment told developers to keep in sync. Two sources of truth where
-- one was decorative. Deleted; prices live in report_products.credits.
--
-- Recoverable content, for the record:
--   {"cefr":{"credits":4,"module_id":4},   "drills":{"credits":2,"module_id":2},
--    "growth":{"credits":3,"module_id":1}, "speech":{"credits":4,"module_id":4},
--    "explorer":{"credits":2,"module_id":3},"holistic":{"credits":3,"module_id":1},
--    "homework":{"credits":2,"module_id":3},"cambridge":{"credits":4,"module_id":11},
--    "synthesis":{"credits":2,"module_id":15},"personalized":{"credits":3,"module_id":1}}
delete from public.ai_configs where config_key = 'preset_pricing';
comment on table public.report_products is
  'The catalogue of report products. One row = one promise = one prompt id = one price. The id is the MODULE_PROMPTS key in process-ai-reports/prompts.ts.';
comment on column public.report_products.product_key is
  'Stable slug used by the frontend to bind a card to a product. Never renumber: reusing an id with a new meaning silently rewrites what historical reports were.';
comment on column public.report_products.credits is
  'Price in AI report credits (token_transactions/user_tokens — NOT transcription minutes). Set here and nowhere else.';
comment on column public.report_products.basis is
  'Which evidence the report may draw on: sessions (transcripts), grammatica (the intake profile), both.';
comment on column public.report_products.is_active is
  'Whether the product is offered in the UI. Inactive rows stay valid so they can be re-enabled with a boolean rather than a migration.';
