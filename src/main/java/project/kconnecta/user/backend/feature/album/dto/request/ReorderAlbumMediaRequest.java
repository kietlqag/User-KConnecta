package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReorderAlbumMediaRequest {

    @NotEmpty
    private List<UUID> mediaIds;
}
