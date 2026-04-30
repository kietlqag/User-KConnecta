-- ============================================================
-- KConnecta User Service - PostgreSQL schema
-- Synced with JPA entities in user_be/src/main/java/.../feature
-- ============================================================

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
    ON public.chat_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_sender_created_at
    ON public.chat_messages(receiver_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created_at
    ON public.chat_messages(conversation_id, created_at DESC);

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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_message_owner_peer
    ON public.chat_pinned_messages(owner_user_id, peer_user_id)
    WHERE peer_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_pin_message_owner_conversation
    ON public.chat_pinned_messages(owner_user_id, conversation_id)
    WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_pin_message_owner_user_id
    ON public.chat_pinned_messages(owner_user_id);

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

CREATE TABLE IF NOT EXISTS public.call_recordings (
    id UUID PRIMARY KEY,
    call_session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    recording_media_type VARCHAR(16) NOT NULL DEFAULT 'audio',
    has_video BOOLEAN NOT NULL DEFAULT FALSE,
    mime_type VARCHAR(120),
    file_size_bytes BIGINT NOT NULL,
    duration_sec INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_session_id ON public.call_recordings(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_owner_user_id ON public.call_recordings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON public.call_recordings(created_at DESC);

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

-- -------------------------
-- Group
-- -------------------------
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cover_photo_url TEXT,
    privacy VARCHAR(10) NOT NULL,
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
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_group_members_group_user UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
