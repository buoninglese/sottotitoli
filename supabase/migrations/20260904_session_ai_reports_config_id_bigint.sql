-- session_ai_reports.config_id references ai_configs.id, which on live is a
-- bigint (key/value store: id, config_key, config_value). The column was
-- created as uuid, so analyze-session's upsert failed with
-- "invalid input syntax for type uuid: \"4\"".
-- uuid → bigint has no cast, so we drop + re-add the column. Table is empty
-- pre-launch (0 rows, no FK on config_id), so this is safe.
-- Also add an FK for provenance.

alter table public.session_ai_reports drop column config_id;
alter table public.session_ai_reports add column config_id bigint;

alter table public.session_ai_reports
  add constraint session_ai_reports_config_id_fkey
  foreign key (config_id) references public.ai_configs(id)
  on delete set null;
