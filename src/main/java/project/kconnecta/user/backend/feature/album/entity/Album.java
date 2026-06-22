package project.kconnecta.user.backend.feature.album.entity;

import jakarta.persistence.*;
import lombok.*;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.user.entity.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "albums", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Album {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "album_type", nullable = false, length = 20)
    private AlbumType albumType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlbumPrivacy privacy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlbumStatus status;

    @Column(name = "cover_media_id")
    private UUID coverMediaId;

    @Column(name = "media_count", nullable = false)
    private int mediaCount;

    @Column(name = "created_at", nullable = false)
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
        if (albumType == null) {
            albumType = AlbumType.PERSONAL;
        }
        if (privacy == null) {
            privacy = AlbumPrivacy.PUBLIC;
        }
        if (status == null) {
            status = AlbumStatus.ACTIVE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
