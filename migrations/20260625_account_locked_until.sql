ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;
