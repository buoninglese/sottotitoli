-- Move every model reference to gpt-6-luna.
--
-- On 2026-10-14 OpenAI announced the GPT-4 series retirement for **2027-01-14**:
--   gpt-4o (2024-08-06, 2024-11-20) → gpt-6-luna
--   gpt-4o-mini (2024-07-18)        → gpt-6-luna
--   gpt-4.1 / gpt-4.1-mini          → gpt-6-luna
--
-- The code side (4 functions, 7 hardcoded ids) is in the same commit. This is the
-- half that lives in the database.
--
-- Two rows matter:
--
--   report_settings — default_model drove every AI report. available_models is
--   what the UI offers the learner, and it still listed **gpt-4-turbo**, which
--   OpenAI shut down on 2026-10-23. Selecting it produced model_not_found, the
--   report failed, and the credits were refunded — a 16-day-old live bug.
--
--   session_analysis — the model analyze-session calls. Also gpt-4o.
--
-- gpt-6-luna is cheaper than gpt-4o-mini ($0.10/$0.50 per 1M vs $0.15/$0.60) and
-- ~25x cheaper than gpt-4o ($2.50/$10.00), so this reduces running cost.
--
-- Rollback is one row: set report_settings->>default_model back to 'gpt-4o'.

update public.ai_configs
   set config_value = jsonb_set(config_value, '{default_model}', '"gpt-6-luna"'::jsonb)
 where config_key = 'report_settings';

-- Only models that still exist. gpt-4-turbo is removed deliberately.
update public.ai_configs
   set config_value = jsonb_set(config_value, '{available_models}', '["gpt-6-luna"]'::jsonb)
 where config_key = 'report_settings';

update public.ai_configs
   set config_value = jsonb_set(config_value, '{model}', '"gpt-6-luna"'::jsonb)
 where config_key = 'session_analysis';

-- Verification: no configured model may be one OpenAI has retired.
select config_key,
       config_value ->> 'default_model' as default_model,
       config_value -> 'available_models' as available_models,
       config_value ->> 'model' as model
  from public.ai_configs
 where config_value::text like '%gpt-%'
 order by config_key;
