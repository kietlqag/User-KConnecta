-- Birthday module schema for KConnecta

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

-- Extend notification types if constraint exists
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (type IN (
        'LIKE', 'COMMENT', 'SHARE',
        'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FRIEND_REMOVED',
        'GROUP_ACTIVITY', 'GROUP_INVITE', 'GROUP_JOIN_REQUEST', 'GROUP_POST_PINNED',
        'MENTION', 'BIRTHDAY', 'BIRTHDAY_WISH', 'EVENT', 'MEMORY', 'SYSTEM'
    ));
