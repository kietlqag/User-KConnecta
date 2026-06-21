-- Thiết kế lại vi phạm comment theo hướng multi-row, multi-column.
-- Làm giàu comment_violations + thêm user_restrictions (thay flag users.comment_banned_until).

-- == comment_violations: làm giàu thành multi-column ==
ALTER TABLE public.comment_violations
    ADD COLUMN IF NOT EXISTS source             VARCHAR(20),
    ADD COLUMN IF NOT EXISTS action             VARCHAR(25) NOT NULL DEFAULT 'WARNING',
    ADD COLUMN IF NOT EXISTS comment_id          UUID,
    ADD COLUMN IF NOT EXISTS report_id           UUID,
    ADD COLUMN IF NOT EXISTS matched_keyword_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS matched_keyword     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS content_snapshot    TEXT,
    ADD COLUMN IF NOT EXISTS detail              TEXT;

-- Backfill source từ type cũ (BLOCKED_KEYWORD -> BLACKLIST)
UPDATE public.comment_violations
SET source = CASE WHEN type = 'BLOCKED_KEYWORD' THEN 'BLACKLIST' ELSE type END
WHERE source IS NULL;

ALTER TABLE public.comment_violations
    ALTER COLUMN source SET NOT NULL,
    DROP COLUMN IF EXISTS type;

ALTER TABLE public.comment_violations
    DROP CONSTRAINT IF EXISTS comment_violations_source_check,
    DROP CONSTRAINT IF EXISTS comment_violations_action_check,
    ADD CONSTRAINT comment_violations_source_check CHECK (source IN ('BLACKLIST','AI_UNSAFE')),
    ADD CONSTRAINT comment_violations_action_check CHECK (action IN ('WARNING','COMMENT_LOCK_TEMP','COMMENT_LOCK_PERMANENT'));

ALTER TABLE public.comment_violations
    DROP CONSTRAINT IF EXISTS fk_comment_violation_comment,
    DROP CONSTRAINT IF EXISTS fk_comment_violation_report,
    DROP CONSTRAINT IF EXISTS fk_comment_violation_keyword,
    ADD CONSTRAINT fk_comment_violation_comment FOREIGN KEY (comment_id)         REFERENCES public.post_comments(id)  ON DELETE SET NULL,
    ADD CONSTRAINT fk_comment_violation_report  FOREIGN KEY (report_id)          REFERENCES public.comment_reports(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_comment_violation_keyword FOREIGN KEY (matched_keyword_id) REFERENCES public.policy_keywords(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comment_violation_comment ON public.comment_violations(comment_id);

-- Chống double-count: không ghi 2 dòng AI_UNSAFE cho cùng 1 comment.
CREATE UNIQUE INDEX IF NOT EXISTS uk_comment_violation_ai_comment
    ON public.comment_violations(comment_id)
    WHERE source = 'AI_UNSAFE' AND comment_id IS NOT NULL;

-- == user_restrictions: nguồn duy nhất cho trạng thái khóa comment ==
CREATE TABLE IF NOT EXISTS public.user_restrictions (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type                VARCHAR(20) NOT NULL DEFAULT 'COMMENT_LOCK',
    status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    reason              VARCHAR(255),
    source_violation_id UUID REFERENCES public.comment_violations(id) ON DELETE SET NULL,
    starts_at           TIMESTAMP NOT NULL,
    expires_at          TIMESTAMP,
    revoked_at          TIMESTAMP,
    revoked_by          UUID REFERENCES public.users(id),
    created_at          TIMESTAMP NOT NULL,
    CONSTRAINT user_restrictions_type_check   CHECK (type IN ('COMMENT_LOCK')),
    CONSTRAINT user_restrictions_status_check CHECK (status IN ('ACTIVE','EXPIRED','REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_user_restriction_lookup  ON public.user_restrictions(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_user_restriction_expires ON public.user_restrictions(expires_at);

-- Mỗi user chỉ có tối đa 1 khóa ACTIVE / loại.
CREATE UNIQUE INDEX IF NOT EXISTS uk_user_restriction_one_active
    ON public.user_restrictions(user_id, type) WHERE status = 'ACTIVE';

-- Backfill từ flag cũ (nếu còn user đang bị cấm).
INSERT INTO public.user_restrictions (id, user_id, type, status, reason, starts_at, expires_at, created_at)
SELECT gen_random_uuid(), id, 'COMMENT_LOCK', 'ACTIVE', 'migrated from comment_banned_until', now(), comment_banned_until, now()
FROM public.users
WHERE comment_banned_until IS NOT NULL AND comment_banned_until > now();

ALTER TABLE public.users DROP COLUMN IF EXISTS comment_banned_until;
