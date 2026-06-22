-- Featured Content / Pin Post — đợt 1 (POST + Pin Type + Priority + Read Status)

CREATE TABLE IF NOT EXISTS public.group_pinned_posts (
    id            UUID PRIMARY KEY,
    group_id      UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    post_id       UUID NOT NULL REFERENCES public.posts(id)       ON DELETE CASCADE,
    pinned_by     UUID NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
    featured_type VARCHAR(20)  NOT NULL DEFAULT 'POST',
    pin_type      VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',
    priority      VARCHAR(10)  NOT NULL DEFAULT 'NORMAL',
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    display_order INT          NOT NULL DEFAULT 0,
    expires_at    TIMESTAMP NULL,
    reason        VARCHAR(255) NULL,
    pinned_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_group_pinned_post UNIQUE (group_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_gpp_group_order
    ON public.group_pinned_posts(group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gpp_expiry
    ON public.group_pinned_posts(expires_at);

CREATE TABLE IF NOT EXISTS public.group_pin_history (
    id         UUID PRIMARY KEY,
    group_id   UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    post_id    UUID NOT NULL,
    action     VARCHAR(20) NOT NULL,            -- PIN | UNPIN | REORDER | SET_EXPIRY | AUTO_UNPIN
    actor_id   UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    reason     VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gph_group_created
    ON public.group_pin_history(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.group_pin_reads (
    id      UUID PRIMARY KEY,
    pin_id  UUID NOT NULL REFERENCES public.group_pinned_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id)             ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_pin_read UNIQUE (pin_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pin_reads_user ON public.group_pin_reads(user_id);
