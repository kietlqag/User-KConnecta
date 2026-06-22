package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumPrivacy;
import project.kconnecta.user.backend.feature.album.entity.enums.AlbumType;

import java.util.UUID;

@Data
public class CreateAlbumRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @Size(max = 5000)
    private String description;

    private AlbumType albumType;

    private AlbumPrivacy privacy;

    private UUID groupId;
}
