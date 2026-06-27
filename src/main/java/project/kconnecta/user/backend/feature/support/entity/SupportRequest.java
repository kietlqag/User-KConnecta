package project.kconnecta.user.backend.feature.support.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Yêu cầu trợ giúp / hỗ trợ do người dùng gửi cho admin.
 * User backend và Admin backend dùng CHUNG database nên Admin app đọc thẳng bảng này.
 */
@Entity
@Table(name = "support_requests", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportRequest {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Email liên hệ chụp lại lúc gửi (lấy từ tài khoản) để admin tiện phản hồi. */
    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    /** BUG | FEEDBACK | ACCOUNT | OTHER */
    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** PENDING | IN_PROGRESS | RESOLVED — admin cập nhật khi xử lý. */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
    }
}
