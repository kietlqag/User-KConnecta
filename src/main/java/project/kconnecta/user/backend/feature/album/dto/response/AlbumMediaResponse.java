package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumMediaType;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AlbumMediaResponse {
    private UUID id;
    private AlbumMediaType mediaType;
    private String url;
    private String thumbnailUrl;
    private String caption;
    private int sortOrder;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
    private UUID uploaderId;
    private String uploaderName;
    private LocalDateTime createdAt;
    private long reactionCount;
    private String viewerReaction;
}
