package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateCommentRequest {

    @NotNull
    private UUID userId;

    @NotBlank
    private String content;

    private UUID parentCommentId;
}
