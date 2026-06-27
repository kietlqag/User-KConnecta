-- ============================================================
-- KConnecta User Service - PostgreSQL schema
-- Synced with JPA entities in user_be/src/main/java/.../feature
-- ============================================================

-- -------------------------
-- Extensions
-- -------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

-- -------------------------
-- Auth + User
-- -------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.accounts
    DROP CONSTRAINT IF EXISTS accounts_status_check;

UPDATE public.accounts
SET status = 'BLOCKED'
WHERE status = 'LOCKED';

ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_status_check
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED'));

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    bio VARCHAR(200),
    gender VARCHAR(10),
    location VARCHAR(120),
    hometown VARCHAR(120),
    relationship_status VARCHAR(50),
    school VARCHAR(150),
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id),
    date_of_birth DATE,
    avatar_url TEXT,
    cover_photo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------
-- Friend
-- -------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_friendships_requester_addressee UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- -------------------------
-- Chat + Call
-- -------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.chat_conversation_members (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_chat_conversation_members_conversation_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_members_conversation_id
    ON public.chat_conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_members_user_id
    ON public.chat_conversation_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at TIMESTAMP,
    seen_at TIMESTAMP,
    seen BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
    ALTER COLUMN receiver_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver_created_at
    ON public.chat_messages(sender_id, receiver_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_sender_created_at
    ON public.chat_messages(receiver_id, sender_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created_at
    ON public.chat_messages(conversation_id, created_at DESC, id DESC);

-- -------------------------
-- Live
-- -------------------------
CREATE TABLE IF NOT EXISTS public.live_schedules (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_mode VARCHAR(20) NOT NULL,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_schedules_user_updated
    ON public.live_schedules(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.live_pinned_comment_settings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    comment_text VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_pinned_comment_user_updated
    ON public.live_pinned_comment_settings(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY,
    host_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID,
    page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL,
    post_id UUID,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(5000),
    privacy VARCHAR(20) NOT NULL,
    start_mode VARCHAR(20) NOT NULL,
    scheduled_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    stream_key VARCHAR(120) NOT NULL UNIQUE,
    room_name VARCHAR(120) NOT NULL UNIQUE,
    playback_url VARCHAR(500),
    hls_playback_url VARCHAR(500),
    egress_id VARCHAR(120),
    thumbnail_url VARCHAR(500),
    recording_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
    recording_duration_sec INTEGER,
    recording_mime_type VARCHAR(120),
    recording_file_size_bytes BIGINT,
    recording_error VARCHAR(500),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    viewer_count INTEGER NOT NULL DEFAULT 0,
    peak_viewer_count INTEGER NOT NULL DEFAULT 0,
    total_reaction_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_status_created
    ON public.live_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host_created
    ON public.live_sessions(host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_post_id
    ON public.live_sessions(post_id);

CREATE TABLE IF NOT EXISTS public.live_session_viewers (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_session_viewer UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_viewers_session_id
    ON public.live_session_viewers(session_id);

CREATE TABLE IF NOT EXISTS public.live_session_reactions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_session_reaction UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_reactions_session_id
    ON public.live_session_reactions(session_id);

CREATE TABLE IF NOT EXISTS public.chat_pinned_conversations (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    peer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_owner_peer
    ON public.chat_pinned_conversations(owner_user_id, peer_user_id)
    WHERE peer_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_owner_conversation
    ON public.chat_pinned_conversations(owner_user_id, conversation_id)
    WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_pin_owner_user_id
    ON public.chat_pinned_conversations(owner_user_id);

CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    peer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    pinned_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.chat_pinned_messages
    ADD COLUMN IF NOT EXISTS pinned_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
DROP INDEX IF EXISTS public.uk_chat_pin_message_owner_peer;
DROP INDEX IF EXISTS public.uk_chat_pin_message_owner_conversation;
CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_message_owner_peer_message
    ON public.chat_pinned_messages(owner_user_id, peer_user_id, message_id)
    WHERE peer_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_message_owner_conversation_message
    ON public.chat_pinned_messages(owner_user_id, conversation_id, message_id)
    WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_pin_message_owner_user_id
    ON public.chat_pinned_messages(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_pin_message_message_id
    ON public.chat_pinned_messages(message_id);

ALTER TABLE public.chat_conversations
    ADD COLUMN IF NOT EXISTS theme_color VARCHAR(32);

ALTER TABLE public.chat_conversation_members
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(120);

CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY,
    call_id UUID NOT NULL UNIQUE,
    caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_sec INTEGER,
    status VARCHAR(32) NOT NULL,
    last_signal_type VARCHAR(32),
    call_media_type VARCHAR(16) NOT NULL DEFAULT 'audio',
    call_log_sent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_id ON public.call_sessions(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON public.call_sessions(status);

CREATE TABLE IF NOT EXISTS public.group_call_sessions (
    id UUID PRIMARY KEY,
    call_id UUID NOT NULL UNIQUE,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_sec INTEGER,
    status VARCHAR(32) NOT NULL,
    last_signal_type VARCHAR(32),
    call_media_type VARCHAR(16) NOT NULL DEFAULT 'audio',
    call_log_sent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_group_call_sessions_conversation_id ON public.group_call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_call_sessions_caller_id ON public.group_call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_group_call_sessions_status ON public.group_call_sessions(status);

CREATE TABLE IF NOT EXISTS public.call_signal_events (
    id UUID PRIMARY KEY,
    call_session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    signal_type VARCHAR(32) NOT NULL,
    sdp TEXT,
    candidate TEXT,
    sdp_mid VARCHAR(255),
    sdp_mline_index INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_signal_events_call_session_id ON public.call_signal_events(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_signal_events_from_user_id ON public.call_signal_events(from_user_id);
CREATE INDEX IF NOT EXISTS idx_call_signal_events_to_user_id ON public.call_signal_events(to_user_id);
CREATE INDEX IF NOT EXISTS idx_call_signal_events_created_at ON public.call_signal_events(created_at DESC);

-- -------------------------
-- Post
-- -------------------------
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT post_media_media_type_check CHECK (media_type IN ('IMAGE', 'VIDEO', 'DOCUMENT'))
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
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON public.post_comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS public.live_session_tool_states (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    poll_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    poll_question VARCHAR(500),
    poll_options VARCHAR(2000),
    featured_link_title VARCHAR(255),
    featured_link_url VARCHAR(1000),
    host_notice VARCHAR(1000),
    pinned_comment_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.live_session_tool_states
    ADD COLUMN IF NOT EXISTS pinned_comment_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_live_session_tool_states_pinned_comment'
    ) THEN
        ALTER TABLE public.live_session_tool_states
            ADD CONSTRAINT fk_live_session_tool_states_pinned_comment
            FOREIGN KEY (pinned_comment_id) REFERENCES public.post_comments(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.post_shares (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shared_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);

-- -------------------------
-- Group
-- -------------------------
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cover_photo_url TEXT,
    privacy VARCHAR(10) NOT NULL,
    member_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_groups_created_by ON public.user_groups(created_by);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_group_members_group_user UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Featured Content / Pin Post
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
CREATE INDEX IF NOT EXISTS idx_gpp_group_order ON public.group_pinned_posts(group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gpp_expiry ON public.group_pinned_posts(expires_at);

CREATE TABLE IF NOT EXISTS public.group_pin_history (
    id         UUID PRIMARY KEY,
    group_id   UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    post_id    UUID NOT NULL,
    action     VARCHAR(20) NOT NULL,
    actor_id   UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    reason     VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gph_group_created ON public.group_pin_history(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.group_pin_reads (
    id      UUID PRIMARY KEY,
    pin_id  UUID NOT NULL REFERENCES public.group_pinned_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id)             ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_pin_read UNIQUE (pin_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pin_reads_user ON public.group_pin_reads(user_id);

-- -------------------------
-- Notification
-- -------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_actioned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT notifications_type_check CHECK (type IN (
        'LIKE', 'COMMENT', 'SHARE',
        'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FRIEND_REMOVED',
        'GROUP_ACTIVITY', 'GROUP_INVITE', 'GROUP_JOIN_REQUEST', 'GROUP_POST_PINNED',
        'MENTION', 'BIRTHDAY', 'BIRTHDAY_WISH', 'EVENT', 'MEMORY', 'SYSTEM'
    ))
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- -------------------------
-- Birthday
-- -------------------------
CREATE TABLE IF NOT EXISTS public.birthday_wishes (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_birthday_wishes_recipient_created
    ON public.birthday_wishes(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_sender_created
    ON public.birthday_wishes(sender_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.birthday_notification_logs (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    birthday_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_birthday_notification_daily UNIQUE (recipient_id, birthday_user_id, notification_date)
);

CREATE INDEX IF NOT EXISTS idx_birthday_notification_logs_date
    ON public.birthday_notification_logs(notification_date);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);

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

CREATE TABLE IF NOT EXISTS public.live_event_subscriptions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    live_started_notified_at TIMESTAMP,
    CONSTRAINT uk_live_event_subscription UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_event_subs_session_id
    ON public.live_event_subscriptions(session_id);

CREATE INDEX IF NOT EXISTS idx_live_event_subs_user_id
    ON public.live_event_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled
    ON public.live_sessions(status, scheduled_at);

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_page_id ON public.posts(page_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_page_id ON public.live_sessions(page_id);

-- -------------------------
-- Albums
-- -------------------------
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

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS shared_album_id UUID NULL REFERENCES public.albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_shared_album_id ON public.posts(shared_album_id);

-- -------------------------
-- Support / help requests (người dùng gửi cho admin; Admin app đọc chung DB)
-- -------------------------
CREATE TABLE IF NOT EXISTS public.support_requests (
    id            UUID PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contact_email VARCHAR(255) NULL,
    category      VARCHAR(30) NOT NULL,
    subject       VARCHAR(150) NOT NULL,
    message       TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user ON public.support_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status, created_at DESC);
