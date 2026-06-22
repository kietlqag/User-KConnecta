package project.kconnecta.user.backend.feature.group.pin.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.FeaturedType;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinStatus;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinType;
import project.kconnecta.user.backend.feature.post.entity.Post;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "group_pinned_posts",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "post_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPinnedPost {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pinned_by", nullable = false)
    private User pinnedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "featured_type", nullable = false, length = 20)
    @Builder.Default
    private FeaturedType featuredType = FeaturedType.POST;

    @Enumerated(EnumType.STRING)
    @Column(name = "pin_type", nullable = false, length = 20)
    @Builder.Default
    private PinType pinType = PinType.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private PinPriority priority = PinPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PinStatus status = PinStatus.ACTIVE;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(length = 255)
    private String reason;

    @Column(name = "pinned_at", nullable = false)
    private LocalDateTime pinnedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        if (pinnedAt == null) pinnedAt = now;
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
