-- Tạm cấm bình luận khi vi phạm nhiều lần (từ cấm hoặc AI UNSAFE) trong cửa sổ thời gian.

-- Mốc hết hạn cấm bình luận của user (null = không bị cấm).
ALTER TABLE users ADD COLUMN IF NOT EXISTS comment_banned_until TIMESTAMP;

-- Nhật ký vi phạm để đếm theo cửa sổ thời gian.
CREATE TABLE IF NOT EXISTS comment_violations (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,
    created_at  TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comment_violation_user_created
    ON comment_violations(user_id, created_at);
