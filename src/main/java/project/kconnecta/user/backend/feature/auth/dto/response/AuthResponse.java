package project.kconnecta.user.backend.feature.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class AuthResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String username;
}
