package project.kconnecta.user.backend.feature.activity.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_activity_logs", schema = "public",
        indexes = {
                @Index(name = "idx_ual_user_id", columnList = "user_id"),
                @Index(name = "idx_ual_created_at", columnList = "created_at"),
                @Index(name = "idx_ual_action_type", columnList = "action_type")
        })
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserActivityLog {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "username", length = 30)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 50)
    private ActivityLogType actionType;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
