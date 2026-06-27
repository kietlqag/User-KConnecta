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
    private String refreshToken;
    private AccountStatus accountStatus;
    private String blockedReason;
    private LocalDateTime lockedUntil;

    /** API response without JWT secrets (tokens live in HttpOnly cookies). */
    public AuthResponse withoutTokens() {
        return AuthResponse.builder()
                .id(id)
                .email(email)
                .fullName(fullName)
                .username(username)
                .hasPassword(hasPassword)
                .requiresProfileSetup(requiresProfileSetup)
                .requiresTwoFactor(requiresTwoFactor)
                .twoFactorToken(twoFactorToken)
                .accountStatus(accountStatus)
                .blockedReason(blockedReason)
                .lockedUntil(lockedUntil)
                .build();
    }

    public AuthResponse withTokens(String accessToken, String refreshTokenValue) {
        return AuthResponse.builder()
                .id(id)
                .email(email)
                .fullName(fullName)
                .username(username)
                .hasPassword(hasPassword)
                .requiresProfileSetup(requiresProfileSetup)
                .requiresTwoFactor(requiresTwoFactor)
                .twoFactorToken(twoFactorToken)
                .token(accessToken)
                .refreshToken(refreshTokenValue)
                .accountStatus(accountStatus)
                .blockedReason(blockedReason)
                .lockedUntil(lockedUntil)
                .build();
    }
}
