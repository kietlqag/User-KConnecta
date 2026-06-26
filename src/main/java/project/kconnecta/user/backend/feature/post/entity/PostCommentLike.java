package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "post_comment_likes",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(name = "uk_comment_like", columnNames = {"comment_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostCommentLike {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private PostComment comment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Loại cảm xúc (LIKE/LOVE/HAHA/WOW/SAD/ANGRY). Mặc định LIKE để tương thích like cũ.
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false, length = 20, columnDefinition = "varchar(20) default 'LIKE'")
    private ReactionType reactionType = ReactionType.LIKE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = LocalDateTime.now();
        if (reactionType == null) reactionType = ReactionType.LIKE;
    }
}
