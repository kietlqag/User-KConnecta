package project.kconnecta.user.backend.feature.settings.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.settings.dto.request.UpdateUserSettingsRequest;
import project.kconnecta.user.backend.feature.settings.dto.response.UserSettingsResponse;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.settings.service.impl.SettingsServiceImpl;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserSettingsController {

    private final SettingsService settingsService;
    private final SettingsServiceImpl settingsServiceImpl;
    private final JwtUtil jwtUtil;

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
            @PathVariable UUID blockedUserId) {
        settingsService.blockUser(principal.getUserId(), blockedUserId);
        return ResponseEntity.ok(Map.of("blocked", true));
    }

    @GetMapping("/blocks/{blockedUserId}/status")
    public ResponseEntity<Map<String, Boolean>> getBlockStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID blockedUserId) {
        boolean blockedByMe = settingsService.isBlockedByMe(principal.getUserId(), blockedUserId);
        return ResponseEntity.ok(Map.of("blockedByMe", blockedByMe));
    }

    @DeleteMapping("/blocks/{blockedUserId}")
    public ResponseEntity<Void> unblockUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID blockedUserId) {
        settingsService.unblockUser(principal.getUserId(), blockedUserId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {
        settingsService.revokeSession(principal.getUserId(), sessionId);
        return ResponseEntity.noContent().build();
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
}
