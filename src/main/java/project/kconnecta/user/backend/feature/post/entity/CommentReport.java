package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.ReportCategory;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "comment_reports",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_comment_report_comment_reporter",
                columnNames = {"comment_id", "reporter_id"}
        ),
        indexes = {
                @Index(name = "idx_comment_report_comment", columnList = "comment_id"),
                @Index(name = "idx_comment_report_reporter", columnList = "reporter_id"),
                @Index(name = "idx_comment_report_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private PostComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private ReportCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private CommentReportStatus status = CommentReportStatus.PENDING;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @Column(name = "ai_severity", length = 20)
    private String aiSeverity;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = CommentReportStatus.PENDING;
        }
    }
}
