-- Give the anonymous metrics a deletion key, so the derived data dies with its session.
--
-- ══ THE GAP THIS CLOSES ═══════════════════════════════════════════════════════
-- `session_metrics_anonymous` was deliberately written with no user id and no foreign
-- key, which made it unlinkable — and, for exactly the same reason, unremovable. So:
--
--   * deleting a session removed its AI reports (FK cascade) but left its metrics row;
--   * the 30-day cleanup removed sessions and left their metrics rows;
--   * deleting an account removed everything except these rows;
--   * and an erasure request could not be honoured for them at all.
--
-- That is a real GDPR gap, not just an untidy one: pseudonymised data is still personal
-- data, so erasure has to be able to reach it. The honest description of the old table
-- was "de-identified", which sounds better than it was — the rows were beyond reach.
--
-- ══ THE FIX: A KEY THAT IDENTIFIES NOTHING BUT CAN BE MATCHED ═════════════════
-- Each row now carries `session_key` = HMAC-SHA256(session id, salt), where the salt is
-- random per project and lives in Vault. Consequences, stated plainly:
--
--   * the row STILL carries no user id, no transcript, no room, no topic and no precise
--     timestamp — nothing that names or describes a person;
--   * the key is not the session id, so the table cannot be joined to `sessions` by
--     inspection, and a UUID cannot be guessed to test against it;
--   * but someone holding BOTH the database and the salt can recompute it.
--
-- So this is PSEUDONYMISED, NOT ANONYMOUS, and the copy must say exactly that. In
-- exchange the row is deletable, which is what makes "delete your session" and "delete
-- your account" truthful again.
--
-- ══ WHY HMAC AND NOT THE BARE SESSION ID ══════════════════════════════════════
-- A plain `session_id` column would work identically for deletion and would be a direct
-- join back to a person for anyone reading the table or an export. The hash keeps the
-- deletion capability and drops the casual link.
--
-- ══ WHAT NOW CASCADES, AND HOW ════════════════════════════════════════════════
-- One AFTER DELETE trigger on `public.sessions` covers every path, because they all end
-- in a row delete on that table:
--   * a user deleting one session in the app;
--   * `cleanup_unsaved_sessions()` expiring unstarred sessions after 30 days;
--   * account deletion, where `auth.users` cascades into `sessions`.
-- Cascading deletes fire row triggers, so the third path works without enumerating
-- anyone's session ids.
--
-- The 24-month `cleanup_anonymous_metrics()` job stays as the outer bound: it catches
-- anything a missing key ever caused us to skip.

-- ── The salt ─────────────────────────────────────────────────────────────────
-- Created once, random, never in the repository. A DO block because there is no
-- `if not exists` for secrets.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'session_key_salt') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'session_key_salt',
      'Deletion-key salt for public.session_metrics_anonymous. Changing or losing it breaks the cascade: existing rows become unmatchable and are only bounded by the 24-month retention job.'
    );
  end if;
end $$;
-- ── The key column ───────────────────────────────────────────────────────────
-- The table is empty at the time of writing (the iOS fallback that writes it has never
-- engaged), so NOT NULL can be applied outright. If this ever fails, rows exist and they
-- need deciding on rather than silently backfilling.
alter table public.session_metrics_anonymous
  add column if not exists session_key text not null;
comment on column public.session_metrics_anonymous.session_key is
  'HMAC-SHA256(session id, vault salt). A deletion key, not an identity: it cannot be joined to sessions by inspection, and it exists so the row can be removed when its session is. Pseudonymous, not anonymous.';
create unique index if not exists session_metrics_anonymous_key_idx
  on public.session_metrics_anonymous (session_key);
comment on table public.session_metrics_anonymous is
  'Pseudonymous per-session speech measurements, written only when the session owner has anonymous_sharing = true. No user identifier, no transcript content, no precise timestamp. Each row carries an HMAC deletion key so it is removed when its session is deleted.';
-- ── Capture, now writing the key ─────────────────────────────────────────────
create or replace function public.capture_anonymous_session_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opt_in boolean;
  v_band   text;
  v_salt   text;
begin
  -- Opt-in is checked HERE rather than in the trigger's WHEN clause, so the gate lives
  -- next to the write it protects and stays visible to anyone reading this.
  select coalesce(anonymous_sharing, false) into v_opt_in
    from public.user_preferences
   where user_id = new.user_id;

  if v_opt_in is not true then
    return new;
  end if;

  if coalesce(new.duration_seconds, 0) <= 0 then
    return new;
  end if;

  -- Without the salt there is no deletion key, and a row that cannot be deleted is worse
  -- than no row. Skip and say so rather than writing an unremovable record.
  select decrypted_secret into v_salt
    from vault.decrypted_secrets
   where name = 'session_key_salt';

  if v_salt is null or length(v_salt) = 0 then
    raise warning 'capture_anonymous_session_metrics: session_key_salt missing, skipped session %', new.id;
    return new;
  end if;

  v_band := (
    select t.b
      from (values
        ('A1', coalesce(new.cefr_a1_count, 0)),
        ('A2', coalesce(new.cefr_a2_count, 0)),
        ('B1', coalesce(new.cefr_b1_count, 0)),
        ('B2', coalesce(new.cefr_b2_count, 0)),
        ('C1', coalesce(new.cefr_c1_count, 0)),
        ('C2', coalesce(new.cefr_c2_count, 0))
      ) as t(b, c)
     where t.c > 0
     order by t.c desc
     limit 1
  );

  insert into public.session_metrics_anonymous (
    session_key, recorded_week, duration_seconds, words_count, unique_words_count, wpm,
    lexical_diversity, vocabulary_score, grammar_score, fluency_score,
    cefr_band, language_pair, session_type
  ) values (
    encode(extensions.hmac(new.id::text, v_salt, 'sha256'), 'hex'),
    date_trunc('week', new.ended_at)::date,
    new.duration_seconds,
    new.words_count,
    new.unique_words_count,
    new.wpm,
    new.lexical_diversity,
    new.vocabulary_score,
    new.grammar_score,
    new.fluency_score,
    v_band,
    new.language_pair,
    new.session_type
  )
  -- The trigger fires once per session, so this is belt and braces: a repeat write must
  -- not create a second row that the cascade would then have to find twice.
  on conflict (session_key) do nothing;

  return new;

exception
  when others then
    -- Never break the session-ending transaction; billing shares it.
    raise warning 'capture_anonymous_session_metrics skipped session %: %', new.id, sqlerrm;
    return new;
end;
$$;
revoke all on function public.capture_anonymous_session_metrics() from anon, authenticated, public;
-- ── Cascade: the row dies with its session ───────────────────────────────────
create or replace function public.drop_anonymous_metrics_for_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salt text;
begin
  select decrypted_secret into v_salt
    from vault.decrypted_secrets
   where name = 'session_key_salt';

  if v_salt is null or length(v_salt) = 0 then
    -- Nothing to match with. Swallowed rather than raised: this runs as part of a delete
    -- that must succeed, and the 24-month job still bounds the row.
    raise warning 'drop_anonymous_metrics_for_session: salt missing, left row for session %', old.id;
    return old;
  end if;

  delete from public.session_metrics_anonymous
   where session_key = encode(extensions.hmac(old.id::text, v_salt, 'sha256'), 'hex');

  return old;

exception
  when others then
    raise warning 'drop_anonymous_metrics_for_session skipped %: %', old.id, sqlerrm;
    return old;
end;
$$;
revoke all on function public.drop_anonymous_metrics_for_session() from anon, authenticated, public;
drop trigger if exists drop_anonymous_metrics_on_session_delete on public.sessions;
create trigger drop_anonymous_metrics_on_session_delete
  after delete on public.sessions
  for each row
  execute function public.drop_anonymous_metrics_for_session();
-- Verify after applying:
--   select count(*) from pg_trigger
--    where tgrelid = 'public.sessions'::regclass and not tgisinternal;      -- 6
--   select has_function_privilege('authenticated',
--          'public.drop_anonymous_metrics_for_session()', 'EXECUTE');       -- false
--   select (session_key is not null) from public.session_metrics_anonymous limit 1;
--
-- Does the cascade work? In a rolled-back transaction, with anonymous_sharing = true:
--   insert a session, set ended_at (row is captured), delete the session,
--   and the metrics count must return to where it started.
select 'deletion-key migration applied' as status;
