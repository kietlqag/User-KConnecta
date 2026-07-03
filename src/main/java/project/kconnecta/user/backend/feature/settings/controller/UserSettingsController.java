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

import java.util.List;
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
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

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

    /** IDs of users in a block relationship with the current user (either direction). */
    @GetMapping("/blocks/related-ids")
    public ResponseEntity<List<String>> getRelatedBlockedUserIds(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<String> ids = settingsService.getRelatedBlockedUserIds(principal.getUserId()).stream()
                .map(UUID::toString)
                .toList();
        return ResponseEntity.ok(ids);
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
        UUID targetUserId = resolveBlockedUserId(blockedUserId);
        boolean blockedByMe = settingsService.isBlockedByMe(
                principal.getUserId(), targetUserId);
        boolean conversationLocked = isConversationLocked(principal.getUserId(), targetUserId);
        return ResponseEntity.ok(Map.of(
                "blockedByMe", blockedByMe,
                "conversationLocked", conversationLocked
        ));
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

    private boolean isConversationLocked(UUID u1, UUID u2) {
        String id1 = u1.toString();
        String id2 = u2.toString();
        String convId = id1.compareTo(id2) < 0 ? id1 + "_" + id2 : id2 + "_" + id1;
        try {
            String status = jdbcTemplate.queryForObject(
                "SELECT status FROM admin_conversation_statuses WHERE id = ?",
                String.class,
                convId
            );
            return "LOCKED".equalsIgnoreCase(status) || "DELETED".equalsIgnoreCase(status);
        } catch (Exception e) {
            return false;
        }
    }
}
