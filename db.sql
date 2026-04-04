CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    privacy VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    location_text VARCHAR(255),
    background_style VARCHAR(100),
    is_promoted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);

CREATE TABLE IF NOT EXISTS public.post_audience_exclusions (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    excluded_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT uk_post_exclusion UNIQUE (post_id, excluded_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_audience_exclusions_post_id
    ON public.post_audience_exclusions(post_id);

CREATE TABLE IF NOT EXISTS public.post_mentions (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    tagged_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT uk_post_mention UNIQUE (post_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON public.post_mentions(post_id);

CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_post_reaction UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON public.post_comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS public.post_shares (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shared_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);
