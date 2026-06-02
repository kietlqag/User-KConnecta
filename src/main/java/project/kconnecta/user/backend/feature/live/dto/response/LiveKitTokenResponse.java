package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LiveKitTokenResponse {
    private UUID sessionId;
    private UUID userId;
    private String role;
    private String roomName;
    private String livekitUrl;
    private String token;
    private LocalDateTime expiresAt;
}
