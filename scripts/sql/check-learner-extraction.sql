-- Live check: the coverage/payload invariant, plus the constraint that enforces it.
--
-- Runs against the LINKED project (needs credentials + network), so unlike
-- check-report-catalogue.sh this is not an offline check and is not run by it.
-- Invoke via scripts/check-learner-extraction.sh.
--
-- Every case is written to a plpgsql VARIABLE and inserted into the result table
-- AFTER its subtransaction closes. A row inserted inside the subtransaction would
-- be rolled back along with the update it was testing, and the case would vanish
-- from the output entirely — a test reporting success by saying nothing.
create temp table t (res text);

do $$
declare
  n int;
  case3 text := 'CASE3 NOT RUN';
begin
  -- CASE 1: the constraint exists at all.
  begin
    insert into t (res) values ('CASE0 okcheck');
    if not exists (
      select 1 from pg_constraint
      where conname = 'learner_profile_extractions_coverage_payload_check'
    ) then
      insert into t (res) values ('CASE0 FAILED: constraint is missing — the invariant is unenforced');
    end if;
  exception when others then null;
  end;

  -- CASE 2: a claim of "no data" while the payload carries facts must be rejected.
  begin
    update public.learner_profile_extractions set coverage = 'none' where coverage = 'thin';
    get diagnostics n = row_count;
    insert into t (res) values (
      case when n = 0 then 'CASE1 INCONCLUSIVE: no thin row to test with'
           else 'CASE1 FAILED: coverage=none accepted with a non-empty payload' end);
  exception when check_violation then
    insert into t (res) values ('CASE1 ok: rejected a non-empty payload labelled none');
  end;

  -- CASE 3: real data while the payload is empty must be rejected.
  begin
    update public.learner_profile_extractions set coverage = 'substantial' where coverage = 'none';
    get diagnostics n = row_count;
    insert into t (res) values (
      case when n = 0 then 'CASE2 INCONCLUSIVE: no none row to test with'
           else 'CASE2 FAILED: substantial accepted with an empty payload' end);
  exception when check_violation then
    insert into t (res) values ('CASE2 ok: rejected an empty payload labelled substantial');
  end;

  -- CASE 4 (positive control): 'thin' -> 'substantial' keeps label and payload
  -- agreeing and must be ALLOWED. Without this, a constraint that rejected
  -- everything would still pass cases 2 and 3.
  begin
    update public.learner_profile_extractions set coverage = 'substantial' where coverage = 'thin';
    get diagnostics n = row_count;
    case3 := case when n = 0 then 'CASE3 INCONCLUSIVE: no thin row to test with'
                  else 'CASE3 ok: consistent relabel accepted (rows=' || n || ')' end;
    raise exception 'undo-control' using errcode = 'P0001';
  exception
    when sqlstate 'P0001' then null;   -- sentinel: expected, subtransaction undone
    when others then case3 := 'CASE3 FAILED: consistent relabel rejected: ' || sqlerrm;
  end;
  insert into t (res) values (case3);

  -- CASE 5: prove the sentinel undid CASE 4, rather than assuming it did.
  insert into t (res) values (
    'CASE4 ' || case when (select count(*) from public.learner_profile_extractions
                          where coverage = 'thin') = 1
                     then 'ok: data unchanged, thin row still thin'
                     else 'FAILED: CASE3 leaked a write into the table' end);

  -- CASE 6: the live table itself must satisfy the invariant. Catches rows that
  -- predate the constraint (which was validated on creation, but a restored dump
  -- or a manual disable would not be).
  insert into t (res) values (
    'CASE5 ' || case when not exists (
                        select 1 from public.learner_profile_extractions
                        where (coverage = 'none') <> public.learner_payload_is_empty(payload))
                     then 'ok: every live row agrees with the invariant'
                     else 'FAILED: live rows disagree with the invariant' end);
end $$;

select res from t order by res;
