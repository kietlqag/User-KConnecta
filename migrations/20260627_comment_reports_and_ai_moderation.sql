-- Report-driven AI moderation for comments.

-- Theo dõi kết quả AI gần nhất, tách khỏi updated_at (vốn bị nhiều hành động khác chạm vào).
ALTER TABLE post_comments
    ADD COLUMN IF NOT EXISTS ai_moderation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_CHECKED',
    ADD COLUMN IF NOT EXISTS last_moderated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS comment_reports (
    id           UUID PRIMARY KEY,
    comment_id   UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason       TEXT,
    category     VARCHAR(30),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ai_analysis  TEXT,
    ai_severity  VARCHAR(20),
    created_at   TIMESTAMP NOT NULL,
    CONSTRAINT uk_comment_report_comment_reporter UNIQUE (comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_report_comment ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_report_reporter ON comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_report_created_at ON comment_reports(created_at);
