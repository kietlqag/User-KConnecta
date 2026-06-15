-- Add moderation_fail_reason column to posts table (for REJECTED scheduled posts)
-- Run once against the target database, then switch ddl-auto back to validate.

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS moderation_fail_reason TEXT;
