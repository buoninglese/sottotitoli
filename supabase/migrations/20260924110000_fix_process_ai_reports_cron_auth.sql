-- Fix the process-ai-reports cron authentication.
--
-- ── The bug ──────────────────────────────────────────────────────────────────
-- The job called the function with a legacy `service_role` JWT in the
-- Authorization header. The function's internal-caller check was
--     isService = token === SUPABASE_SERVICE_ROLE_KEY
-- and SUPABASE_SERVICE_ROLE_KEY is now an `sb_secret_…` value, so the
-- comparison could never be true. Execution then fell through to
-- auth.getUser(service_role JWT), which resolves no user, and the function
-- returned 401 {"error":"Unauthorized"} — before ever reaching its batch gate.
--
-- It went unnoticed because net.http_post is ASYNCHRONOUS: cron.job_run_details
-- reported `succeeded` / "1 row" every minute while the real HTTP status was
-- only ever recorded in net._http_response, which held a continuous stream of
-- 401s.
--
-- ── The fix ──────────────────────────────────────────────────────────────────
-- Authenticate with a shared secret in the `x-s8t-cron` header instead of a
-- JWT. The value is read from Vault at runtime, so it is never stored in
-- cron.job — and rotating the Vault secret takes effect immediately with no
-- change to this job.
--
-- The Authorization header now carries the PUBLIC publishable key. That is not a
-- secret (it ships in the site's config.js and in every browser); it exists only
-- to satisfy the gateway's verify_jwt gate, which rejects header-less calls. This
-- is why the function does NOT need --no-verify-jwt, and why the gateway's gate
-- stays in place.
--
-- ── Requires ─────────────────────────────────────────────────────────────────
-- A Vault secret named `cron_secret` whose value equals the function secret
-- `CRON_SECRET`:
--     select vault.create_secret('<value>', 'cron_secret', '...');
-- If it is missing this migration raises rather than scheduling a job that would
-- 401 forever — a silent, green-looking failure is exactly what we are fixing.
--
-- ── Note on dollar-quoting ───────────────────────────────────────────────────
-- Two nested dollar-quoted blocks with DIFFERENT tags ($guard$ / $cron$) are
-- required: the cron command body itself contains quoting. Reusing $$ for both
-- makes the file unparseable.

do $guard$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    raise exception 'vault secret "cron_secret" is missing; create it before applying this migration (it must equal the CRON_SECRET function secret)';
  end if;

  -- cron.unschedule raises when the job is absent, so guard the call.
  if exists (select 1 from cron.job where jobname = 'process-ai-reports') then
    perform cron.unschedule('process-ai-reports');
  end if;

  perform cron.schedule(
    'process-ai-reports',
    '* * * * *',
    $cron$
    select net.http_post(
      url := 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7',
        'x-s8t-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
end
$guard$;
-- Verify (run separately — this file's own result is not returned):
--   select status_code, left(content, 60), created
--   from net._http_response order by created desc limit 5;   -- expect 200s
--   select command from cron.job where jobname = 'process-ai-reports';  -- expect no 'eyJ';
