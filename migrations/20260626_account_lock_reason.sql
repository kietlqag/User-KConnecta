ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(255);
