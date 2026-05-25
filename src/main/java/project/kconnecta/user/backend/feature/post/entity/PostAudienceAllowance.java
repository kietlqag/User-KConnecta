package project.kconnecta.user.backend.feature.post.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.util.UUID;

@Entity
@Table(
        name = "post_audience_allowances",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(name = "uk_post_allowance", columnNames = {"post_id", "allowed_user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostAudienceAllowance {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "allowed_user_id", nullable = false)
    private User allowedUser;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
