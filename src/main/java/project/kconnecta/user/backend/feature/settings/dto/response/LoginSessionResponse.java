package project.kconnecta.user.backend.feature.settings.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LoginSessionResponse {
    private UUID id;
    private String deviceName;
    private String browser;
    private String location;
    private LocalDateTime lastActive;
    private boolean current;
}
