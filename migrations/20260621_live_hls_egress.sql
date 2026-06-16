ALTER TABLE public.live_sessions
    ADD COLUMN IF NOT EXISTS hls_playback_url VARCHAR(500);

ALTER TABLE public.live_sessions
    ADD COLUMN IF NOT EXISTS egress_id VARCHAR(120);
