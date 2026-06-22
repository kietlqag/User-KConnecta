package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AlbumSidebarItemResponse {
    private UUID id;
    private String title;
    private String coverUrl;
    private int mediaCount;
    private LocalDateTime updatedAt;
}
