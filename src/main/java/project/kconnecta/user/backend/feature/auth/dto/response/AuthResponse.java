package project.kconnecta.user.backend.feature.auth.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.common.enums.AccountStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class AuthResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String username;
    private boolean hasPassword;
    private boolean requiresProfileSetup;
    private boolean requiresTwoFactor;
    private String twoFactorToken;
    private String token;
    private AccountStatus accountStatus;
    private String blockedReason;
    private LocalDateTime lockedUntil;
}
