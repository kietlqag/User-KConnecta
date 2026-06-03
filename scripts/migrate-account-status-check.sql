-- Update the accounts.status check constraint after renaming LOCKED to BLOCKED.
-- Run this once against the shared KConnecta PostgreSQL database.

ALTER TABLE public.accounts
    DROP CONSTRAINT IF EXISTS accounts_status_check;

UPDATE public.accounts
SET status = 'BLOCKED'
WHERE status = 'LOCKED';

ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED'));
