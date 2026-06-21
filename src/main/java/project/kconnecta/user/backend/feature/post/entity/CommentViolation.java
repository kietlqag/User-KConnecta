package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Một lần người dùng vi phạm khi bình luận: dùng từ cấm (source=BLACKLIST) hoặc bị AI
 * kết luận vi phạm (source=AI_UNSAFE). Mỗi vi phạm là 1 dòng riêng để audit; đếm số
 * dòng trong cửa sổ thời gian (reset sau mỗi lần khóa) để tạm cấm bình luận.
 */
@Entity
@Table(
        name = "comment_violations",
        schema = "public",
        indexes = {
                @Index(name = "idx_comment_violation_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_comment_violation_comment", columnList = "comment_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentViolation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Nguồn xác định vi phạm: BLACKLIST | AI_UNSAFE. */
    @Column(name = "source", nullable = false, length = 20)
    private String source;

    /** Hình phạt áp tại thời điểm vi phạm: WARNING | COMMENT_LOCK_TEMP | COMMENT_LOCK_PERMANENT. */
    @Column(name = "action", nullable = false, length = 25)
    @Builder.Default
    private String action = "WARNING";

    /** Comment liên quan. Null khi blacklist chặn lúc tạo (comment chưa được lưu). */
    @Column(name = "comment_id")
    private UUID commentId;

    /** Report kích hoạt luồng AI (nếu có). */
    @Column(name = "report_id")
    private UUID reportId;

    /** Từ cấm đã khớp (chỉ với BLACKLIST), trỏ tới policy_keywords.id. */
    @Column(name = "matched_keyword_id", length = 64)
    private String matchedKeywordId;

    /** Snapshot giá trị từ khóa đã khớp (phòng khi từ khóa bị xóa khỏi policy_keywords). */
    @Column(name = "matched_keyword", length = 255)
    private String matchedKeyword;

    /** Ảnh chụp nội dung vi phạm để audit (bắt buộc với BLACKLIST). */
    @Column(name = "content_snapshot", columnDefinition = "TEXT")
    private String contentSnapshot;

    /** Chi tiết bổ sung: reason từ AI. */
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
