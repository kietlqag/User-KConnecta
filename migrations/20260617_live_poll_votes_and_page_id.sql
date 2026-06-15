CREATE TABLE IF NOT EXISTS public.live_session_poll_votes (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_session_poll_vote UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_poll_votes_session_id
    ON public.live_session_poll_votes(session_id);

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL;

ALTER TABLE public.live_sessions
    ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_page_id ON public.posts(page_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_page_id ON public.live_sessions(page_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled
    ON public.live_sessions(status, scheduled_at);
