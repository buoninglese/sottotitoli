-- Make Stripe's "did I already do this?" question answerable by the database.
--
-- stripe-webhook claimed to be idempotent and was not. The check was
-- `select id from credit_transactions where reference = <session>` followed by a
-- write, with no uniqueness behind it. Two failure modes followed directly:
--
--   1. If that SELECT returned an error, `existingTx` came back null, the guard
--      silently passed, and Stripe's retry granted the purchase a second time.
--      Nothing anywhere recorded that the check had failed.
--   2. Even when it worked, two concurrent deliveries could both read "not
--      processed" before either wrote, and both grant.
--
-- A read-then-write check is a race, not a guarantee. These partial unique
-- indexes make the INSERT the lock, so a duplicate arrives as 23505 — a fact the
-- function can branch on — instead of a second grant.
--
-- Partial, on `type = 'purchase'` only: refunds and referral bonuses write their
-- own references into the same columns and must not collide with a checkout id.
--
-- Checked before creating: 2 purchase rows in each table, 0 duplicate references.

create unique index if not exists credit_transactions_purchase_ref_uniq
  on public.credit_transactions (reference)
  where reference is not null and type = 'purchase';

create unique index if not exists token_transactions_purchase_ref_uniq
  on public.token_transactions (reference)
  where reference is not null and type = 'purchase';
