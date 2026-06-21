package project.kconnecta.user.backend.feature.post.entity;

/** Kết quả AI kiểm duyệt gần nhất của một comment (độc lập với CommentStatus hiển thị). */
public enum AiModerationStatus {
    NOT_CHECKED,
    SAFE,
    UNSAFE,
    FAILED
}
