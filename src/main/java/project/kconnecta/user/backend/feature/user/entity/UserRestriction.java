package project.kconnecta.user.backend.feature.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Một lệnh hạn chế quyền của user (hiện chỉ COMMENT_LOCK — tạm cấm bình luận).
 * Nguồn duy nhất cho trạng thái khóa: mỗi lệnh là 1 dòng, không gộp. Không khóa toàn account.
 */
@Entity
@Table(
        name = "user_restrictions",
        schema = "public",
        indexes = {
                @Index(name = "idx_user_restriction_lookup", columnList = "user_id, type, status"),
                @Index(name = "idx_user_restriction_expires", columnList = "expires_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRestriction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Loại hạn chế: COMMENT_LOCK. */
    @Column(name = "type", nullable = false, length = 20)
    @Builder.Default
    private String type = "COMMENT_LOCK";

    /** Trạng thái: ACTIVE | EXPIRED | REVOKED. */
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "reason", length = 255)
    private String reason;

    /** Vi phạm kích hoạt lệnh khóa này (trỏ tới comment_violations.id). */
    @Column(name = "source_violation_id")
    private UUID sourceViolationId;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    /** Mốc hết hạn; null = vĩnh viễn. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (startsAt == null) {
            startsAt = createdAt;
        }
    }
}
