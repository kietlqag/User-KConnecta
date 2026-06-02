package project.kconnecta.user.backend.feature.live.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LiveKitTokenRequest {
    @NotNull
    private UUID userId;

    @NotNull
    private UUID sessionId;

    @NotNull
    private LiveKitParticipantRole role;

    public enum LiveKitParticipantRole {
        HOST,
        VIEWER
    }
}
