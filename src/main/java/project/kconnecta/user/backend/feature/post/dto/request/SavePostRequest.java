package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SavePostRequest {

    private UUID userId;

    @NotNull
    private UUID postId;
}
