-- Add GROUP_JOIN_REQUEST to the notifications.type check constraint.
-- Run this once against the shared KConnecta PostgreSQL database.

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'LIKE', 'COMMENT', 'SHARE', 'FRIEND_REQUEST',
        'GROUP_ACTIVITY', 'GROUP_INVITE', 'GROUP_JOIN_REQUEST',
        'MENTION', 'BIRTHDAY', 'EVENT', 'MEMORY', 'SYSTEM'
    ));
