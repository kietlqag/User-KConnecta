package project.kconnecta.user.backend.feature.live.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class UpsertLivePinnedCommentRequest {
    @NotNull
    private UUID userId;

    @NotNull
    private Boolean enabled;

    private String commentText;
}

