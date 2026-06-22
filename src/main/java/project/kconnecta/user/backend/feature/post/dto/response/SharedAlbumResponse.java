package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class SharedAlbumResponse {
    private UUID id;
    private String title;
    private String coverUrl;
    private int mediaCount;
    private String ownerName;
}
