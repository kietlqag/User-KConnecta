package project.kconnecta.user.backend.feature.group.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;
import project.kconnecta.user.backend.feature.search.redis.GroupSearchListener;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_groups", schema = "public")
@EntityListeners(GroupSearchListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Group {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_photo_url", columnDefinition = "TEXT")
    private String coverPhotoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GroupPrivacy privacy;

    @Column(name = "member_approval_required", nullable = false)
    private boolean memberApprovalRequired;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
