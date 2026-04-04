package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.MediaType;

@Getter
@Setter
public class CreatePostMediaRequest {

    @NotNull
    private MediaType mediaType;

    @NotBlank
    @Size(max = 1000)
    private String fileUrl;

    @Size(max = 1000)
    private String thumbnailUrl;

    private Integer sortOrder;
}
