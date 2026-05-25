package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LiveViewerRequest {
    @NotNull
    private UUID userId;
}
