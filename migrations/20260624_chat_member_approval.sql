ALTER TABLE public.chat_conversations
    ADD COLUMN IF NOT EXISTS member_approval_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.chat_conversation_members
    ADD COLUMN IF NOT EXISTS member_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
