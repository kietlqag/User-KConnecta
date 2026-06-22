-- Album feature tables. Run once against the shared KConnecta PostgreSQL database.

CREATE TABLE IF NOT EXISTS public.albums (
    id              UUID PRIMARY KEY,
    owner_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id        UUID NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NULL,
    album_type      VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
    privacy         VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    cover_media_id  UUID NULL,
    media_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT albums_type_check CHECK (album_type IN ('PERSONAL', 'FAMILY', 'EVENT', 'TRAVEL', 'OTHER')),
    CONSTRAINT albums_privacy_check CHECK (privacy IN ('PUBLIC', 'FRIENDS', 'ONLY_ME')),
    CONSTRAINT albums_status_check CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED'))
);

CREATE INDEX IF NOT EXISTS idx_albums_owner_updated ON public.albums(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_group_id ON public.albums(group_id);

CREATE TABLE IF NOT EXISTS public.album_media (
    id               UUID PRIMARY KEY,
    album_id         UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    uploader_id      UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    media_type       VARCHAR(10) NOT NULL,
    url              VARCHAR(1000) NOT NULL,
    thumbnail_url    VARCHAR(1000) NULL,
    caption          TEXT NULL,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    width            INTEGER NULL,
    height           INTEGER NULL,
    duration_seconds INTEGER NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT album_media_type_check CHECK (media_type IN ('IMAGE', 'VIDEO'))
);

CREATE INDEX IF NOT EXISTS idx_album_media_album_order ON public.album_media(album_id, sort_order ASC);

ALTER TABLE public.albums
    DROP CONSTRAINT IF EXISTS fk_albums_cover_media;

ALTER TABLE public.albums
    ADD CONSTRAINT fk_albums_cover_media
    FOREIGN KEY (cover_media_id) REFERENCES public.album_media(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.album_comments (
    id         UUID PRIMARY KEY,
    album_id   UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    parent_id  UUID NULL REFERENCES public.album_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_album_comments_album ON public.album_comments(album_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.album_media_comments (
    id         UUID PRIMARY KEY,
    media_id   UUID NOT NULL REFERENCES public.album_media(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    parent_id  UUID NULL REFERENCES public.album_media_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_album_media_comments_media ON public.album_media_comments(media_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.album_reactions (
    id             UUID PRIMARY KEY,
    album_id       UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type  VARCHAR(10) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_album_reaction UNIQUE (album_id, user_id),
    CONSTRAINT album_reaction_type_check CHECK (reaction_type IN ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'))
);

CREATE TABLE IF NOT EXISTS public.album_media_reactions (
    id             UUID PRIMARY KEY,
    media_id       UUID NOT NULL REFERENCES public.album_media(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type  VARCHAR(10) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_album_media_reaction UNIQUE (media_id, user_id),
    CONSTRAINT album_media_reaction_type_check CHECK (reaction_type IN ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'))
);

CREATE TABLE IF NOT EXISTS public.album_shares (
    id         UUID PRIMARY KEY,
    album_id   UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message    TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_album_shares_album ON public.album_shares(album_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.album_reports (
    id          UUID PRIMARY KEY,
    album_id    UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason      VARCHAR(50) NOT NULL,
    detail      TEXT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_album_report UNIQUE (album_id, reporter_id),
    CONSTRAINT album_report_status_check CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED'))
);

CREATE TABLE IF NOT EXISTS public.album_view_events (
    id         UUID PRIMARY KEY,
    album_id   UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    viewer_id  UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    viewed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_album_view_events_album ON public.album_view_events(album_id, viewed_at DESC);
