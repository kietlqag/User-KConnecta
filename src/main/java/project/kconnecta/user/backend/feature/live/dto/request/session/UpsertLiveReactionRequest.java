package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveReactionType;

import java.util.UUID;

@Data
public class UpsertLiveReactionRequest {
    @NotNull
    private UUID userId;

    private LiveReactionType reactionType;
}
