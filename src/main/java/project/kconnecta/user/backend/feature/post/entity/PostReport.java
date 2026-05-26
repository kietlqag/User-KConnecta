package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "post_reports",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_post_report_post_reporter",
                columnNames = {"post_id", "reporter_id"}
        ),
        indexes = {
                @Index(name = "idx_post_report_post", columnList = "post_id"),
                @Index(name = "idx_post_report_reporter", columnList = "reporter_id"),
                @Index(name = "idx_post_report_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
