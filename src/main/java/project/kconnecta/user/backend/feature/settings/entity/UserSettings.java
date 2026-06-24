package project.kconnecta.user.backend.feature.settings.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_settings", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_visibility", nullable = false, length = 20)
    private SettingsVisibility profileVisibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "posts_visibility", nullable = false, length = 20)
    private SettingsVisibility postsVisibility;

    @Column(name = "notify_posts", nullable = false)
    private boolean notifyPosts;

    @Column(name = "notify_messages", nullable = false)
    private boolean notifyMessages;

    @Column(name = "notify_email", nullable = false)
    private boolean notifyEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SettingsTheme theme;

    @Column(nullable = false, length = 10)
    private String language;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (profileVisibility == null) {
            profileVisibility = SettingsVisibility.PUBLIC;
        }
        if (postsVisibility == null) {
            postsVisibility = SettingsVisibility.FRIENDS;
        }
        if (theme == null) {
            theme = SettingsTheme.system;
        }
        if (language == null) {
            language = "vi";
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
