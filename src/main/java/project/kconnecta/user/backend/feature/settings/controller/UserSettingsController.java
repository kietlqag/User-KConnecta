package project.kconnecta.user.backend.feature.settings.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.config.security.TokenBlacklistService;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.settings.dto.request.UpdateUserSettingsRequest;
import project.kconnecta.user.backend.feature.settings.dto.response.UserSettingsResponse;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.settings.service.impl.SettingsServiceImpl;
import project.kconnecta.user.backend.feature.user.dto.request.DeleteAccountRequest;
import project.kconnecta.user.backend.feature.user.service.UserService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserSettingsController {

    private final SettingsService settingsService;
    private final SettingsServiceImpl settingsServiceImpl;
    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final TokenBlacklistService tokenBlacklistService;

    @GetMapping("/settings")
    public ResponseEntity<UserSettingsResponse> getSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UUID sessionId = extractSessionId(authHeader);
        return ResponseEntity.ok(settingsService.getSettings(principal.getUserId(), sessionId));
    }

    @PatchMapping("/settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateUserSettingsRequest request) {
        return ResponseEntity.ok(settingsService.updateSettings(principal.getUserId(), request));
    }

    @PostMapping("/blocks/{blockedUserId}")
    public ResponseEntity<Map<String, Boolean>> blockUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String blockedUserId) {
        settingsService.blockUser(principal.getUserId(), resolveBlockedUserId(blockedUserId));
        return ResponseEntity.ok(Map.of("blocked", true));
    }

    @GetMapping("/blocks/{blockedUserId}/status")
    public ResponseEntity<Map<String, Boolean>> getBlockStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String blockedUserId) {
        boolean blockedByMe = settingsService.isBlockedByMe(
                principal.getUserId(), resolveBlockedUserId(blockedUserId));
        return ResponseEntity.ok(Map.of("blockedByMe", blockedByMe));
    }

    @DeleteMapping("/blocks/{blockedUserId}")
    public ResponseEntity<Void> unblockUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String blockedUserId) {
        settingsService.unblockUser(principal.getUserId(), resolveBlockedUserId(blockedUserId));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {
        settingsService.revokeSession(principal.getUserId(), sessionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) DeleteAccountRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String password = request != null ? request.getPassword() : null;
        userService.deleteAccount(principal.getUserId(), password);
        blacklistToken(authHeader);
        return ResponseEntity.noContent().build();
    }

    private void blacklistToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return;
        }
        try {
            tokenBlacklistService.blacklistToken(authHeader.substring(7).trim());
        } catch (Exception ignored) {
            // Account is already deleted; best-effort token invalidation.
        }
    }

    private UUID extractSessionId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtil.extractSessionId(authHeader.substring(7));
        } catch (Exception ignored) {
            return null;
        }
    }

    /** Cho phép UUID hoặc username trong path — tránh 400 khi frontend gửi username. */
    private UUID resolveBlockedUserId(String identifier) {
        return userService.getUserByIdOrUsername(identifier).getId();
    }
}
