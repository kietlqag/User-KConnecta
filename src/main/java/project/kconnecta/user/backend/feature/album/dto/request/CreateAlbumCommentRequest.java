package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateAlbumCommentRequest {

    @NotBlank
    @Size(max = 5000)
    private String content;

    private UUID parentId;
}
