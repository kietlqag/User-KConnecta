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
