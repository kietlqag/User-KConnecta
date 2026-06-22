package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ShareAlbumRequest {

    @Size(max = 2000)
    private String message;

    private boolean shareToFeed = true;
}
