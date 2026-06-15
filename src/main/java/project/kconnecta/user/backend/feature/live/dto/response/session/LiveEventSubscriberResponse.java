package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LiveEventSubscriberResponse {
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private LocalDateTime subscribedAt;
}
