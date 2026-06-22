package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AlbumCommentResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userAvatarUrl;
    private String content;
    private UUID parentId;
    private LocalDateTime createdAt;
}
