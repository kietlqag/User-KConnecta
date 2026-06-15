ALTER TABLE public.live_session_viewers
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

UPDATE public.live_session_viewers
SET last_seen_at = joined_at
WHERE last_seen_at IS NULL;

ALTER TABLE public.live_session_viewers
    ALTER COLUMN last_seen_at SET DEFAULT CURRENT_TIMESTAMP;
