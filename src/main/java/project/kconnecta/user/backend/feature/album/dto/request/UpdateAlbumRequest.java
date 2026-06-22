package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumStatus;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;

@Data
public class UpdateAlbumRequest {

    @Size(max = 255)
    private String title;

    @Size(max = 5000)
    private String description;

    private AlbumType albumType;

    private AlbumPrivacy privacy;

    private AlbumStatus status;
}
