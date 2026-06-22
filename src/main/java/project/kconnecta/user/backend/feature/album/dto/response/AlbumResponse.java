package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AlbumResponse {
    private UUID id;
    private String title;
    private String description;
    private AlbumType albumType;
    private AlbumPrivacy privacy;
    private AlbumStatus status;
    private UUID ownerId;
    private String ownerName;
    private String ownerAvatarUrl;
    private UUID groupId;
    private String groupName;
    private UUID coverMediaId;
    private String coverUrl;
    private int mediaCount;
    private long reactionCount;
    private long commentCount;
    private String viewerReaction;
    private boolean canEdit;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AlbumMediaResponse> media;
}
