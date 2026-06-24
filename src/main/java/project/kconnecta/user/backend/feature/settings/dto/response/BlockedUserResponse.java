package project.kconnecta.user.backend.feature.settings.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class BlockedUserResponse {
    private UUID id;
    private String name;
    private String avatarUrl;
    private LocalDateTime blockedAt;
}
