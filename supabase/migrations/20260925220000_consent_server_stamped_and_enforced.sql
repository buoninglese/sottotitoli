-- ════════════════════════════════════════════════════════════════════════════
--  Make the consent record an AUDIT TRAIL rather than a client assertion.
-- ════════════════════════════════════════════════════════════════════════════
--  Two problems with the record created by 20260925210000:
--
--  1. `terms_consent_at` was CLIENT-SUPPLIED. The browser sent the timestamp, so
--     the only thing standing behind it was the client's honesty. For an audit
--     artifact that is the wrong way round: the moment of consent is exactly what
--     a regulator would ask to see, and it must not be writable by the party being
--     audited.
--
--  2. Nothing enforced the invariant. `terms_consent = true` with a NULL
--     `terms_version` was permitted, which would produce a record that says
--     "consented" but cannot say to what — the same shape as an unsaved session
--     reference, i.e. a value that looks meaningful and answers nothing.
--
--  Pre-flight before adding the constraint: 2 rows total, 0 with terms_consent
--  true, 0 that would violate. No existing row is affected.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Server-set consent timestamp ────────────────────────────────────────
create or replace function public.tg_stamp_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- OLD is not assigned during INSERT, so the two cases must be handled
  -- separately rather than with a single coalesce over OLD.
  if tg_op = 'INSERT' then
    if coalesce(new.terms_consent, false) then
      new.terms_consent_at := now();
    end if;
  else
    -- Stamp on the TRANSITION into consent, and whenever the timestamp is null.
    -- A later unrelated UPDATE therefore cannot move the recorded moment, while a
    -- forged timestamp sent on first consent is simply overwritten.
    if coalesce(new.terms_consent, false)
       and (old.terms_consent is not true or new.terms_consent_at is null) then
      new.terms_consent_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists stamp_consent on public.onboarding_responses;
create trigger stamp_consent
  before insert or update on public.onboarding_responses
  for each row
  execute function public.tg_stamp_consent();
-- ─── 2. Consent must be complete to be meaningful ───────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'onboarding_responses_consent_complete'
       and conrelid = 'public.onboarding_responses'::regclass
  ) then
    alter table public.onboarding_responses
      add constraint onboarding_responses_consent_complete
      check (
        coalesce(terms_consent, false) = false
        or (terms_version is not null and terms_consent_at is not null)
      );
  end if;
end $$;
comment on constraint onboarding_responses_consent_complete on public.onboarding_responses is
  'Consent is only meaningful together with what was accepted and when. Enforced here rather than trusted to the caller.';
