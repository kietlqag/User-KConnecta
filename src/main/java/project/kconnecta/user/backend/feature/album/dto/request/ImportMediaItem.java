package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumMediaType;

@Data
public class ImportMediaItem {

    @NotBlank
    private String url;

    private String thumbnailUrl;

    @NotNull
    private AlbumMediaType mediaType;

    private String caption;
}
