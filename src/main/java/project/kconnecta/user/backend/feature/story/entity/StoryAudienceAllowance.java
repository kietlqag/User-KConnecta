package project.kconnecta.user.backend.feature.story.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.util.UUID;

@Entity
@Table(
        name = "story_audience_allowances",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(name = "uk_story_allowance", columnNames = {"story_id", "allowed_user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryAudienceAllowance {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

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
