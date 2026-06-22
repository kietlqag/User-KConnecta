CREATE TABLE IF NOT EXISTS public.post_polls (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
    allow_multiple BOOLEAN NOT NULL DEFAULT FALSE,
    allow_add_options BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_polls_post_id ON public.post_polls(post_id);

CREATE TABLE IF NOT EXISTS public.post_poll_options (
    id UUID PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_poll_options_poll_id ON public.post_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS public.post_poll_votes (
    id UUID PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.post_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_post_poll_vote UNIQUE (poll_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_post_poll_votes_poll_id ON public.post_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_post_poll_votes_option_id ON public.post_poll_votes(option_id);
