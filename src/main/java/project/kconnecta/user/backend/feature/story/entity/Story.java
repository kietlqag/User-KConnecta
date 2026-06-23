package project.kconnecta.user.backend.feature.story.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.story.entity.enums.StoryPrivacy;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "stories", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Story {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "background_color", length = 500)
    private String backgroundColor;

    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "text_color", length = 30)
    private String textColor;

    @Column(name = "text_size")
    private Integer textSize;

    @Column(name = "text_pos_x")
    private Double textPosX;

    @Column(name = "text_pos_y")
    private Double textPosY;

    @Column(name = "music_track_id", length = 50)
    private String musicTrackId;

    @Column(name = "alt_text", length = 500)
    private String altText;

    @Column(name = "linked_post_id")
    private UUID linkedPostId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy", length = 255)
    private StoryPrivacy privacy;

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StoryAudienceAllowance> audienceAllowances = new ArrayList<>();

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (expiresAt == null) {
            expiresAt = createdAt.plusHours(24);
        }
        if (privacy == null) {
            privacy = StoryPrivacy.PUBLIC;
        }
        active = true;
    }
}
