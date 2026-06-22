package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ShareAlbumResponse {
    private UUID id;
    private UUID postId;
}
