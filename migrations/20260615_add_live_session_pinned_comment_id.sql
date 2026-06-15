-- Live session: pin a comment during an active stream
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
