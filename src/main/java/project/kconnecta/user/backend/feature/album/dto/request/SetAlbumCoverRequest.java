package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SetAlbumCoverRequest {

    @NotNull
    private UUID mediaId;
}
