package project.kconnecta.user.backend.feature.auth.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.auth.service.AccountSessionRevocationService;
import project.kconnecta.user.backend.feature.auth.service.OtpService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserSessionController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final AccountSessionRevocationService accountSessionRevocationService;
    private final UserRepository userRepository;
    private final OtpService otpService;

    @PostMapping("/{userId}/revoke-sessions")
    public ResponseEntity<Void> revokeSessions(
            @RequestHeader("X-Internal-Key") String key,
            @PathVariable UUID userId) {
        validateKey(key);
        accountSessionRevocationService.revokeAllForUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/send-reset-password-email")
    public ResponseEntity<Void> sendResetPasswordEmail(
            @RequestHeader("X-Internal-Key") String key,
            @PathVariable UUID userId) {
        validateKey(key);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getAccount() == null || user.getAccount().getEmail() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User account email not found");
        }

        otpService.sendOtp(user.getAccount().getEmail(), true);
        return ResponseEntity.ok().build();
    }

    private void validateKey(String key) {
        if (key == null || !MessageDigest.isEqual(
                internalApiKey.getBytes(StandardCharsets.UTF_8),
                key.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
