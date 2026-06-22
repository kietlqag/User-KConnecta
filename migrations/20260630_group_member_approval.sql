ALTER TABLE public.user_groups
    ADD COLUMN IF NOT EXISTS member_approval_required BOOLEAN NOT NULL DEFAULT TRUE;
