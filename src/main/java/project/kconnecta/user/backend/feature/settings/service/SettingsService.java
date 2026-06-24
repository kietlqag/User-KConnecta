package project.kconnecta.user.backend.feature.settings.service;

import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.settings.dto.request.UpdateUserSettingsRequest;
import project.kconnecta.user.backend.feature.settings.dto.response.BlockedUserResponse;
import project.kconnecta.user.backend.feature.settings.dto.response.LoginSessionResponse;
import project.kconnecta.user.backend.feature.settings.dto.response.UserSettingsResponse;
import project.kconnecta.user.backend.feature.settings.entity.UserSettings;

import java.util.List;
import java.util.UUID;

public interface SettingsService {
    UserSettings getOrCreate(UUID userId);

    UserSettingsResponse getSettings(UUID userId, UUID currentSessionId);

    UserSettingsResponse updateSettings(UUID userId, UpdateUserSettingsRequest request);

    boolean isTwoFactorEnabled(UUID userId);

    boolean isNotificationEnabled(UUID userId, NotificationType type);

    boolean canViewProfile(UUID viewerId, UUID profileOwnerId);

    PostPrivacy getDefaultPostPrivacy(UUID userId);

    List<BlockedUserResponse> getBlockedUsers(UUID userId);

    void blockUser(UUID blockerId, UUID blockedId);

    void unblockUser(UUID blockerId, UUID blockedId);

    boolean isBlockedEitherDirection(UUID userA, UUID userB);

    boolean isBlockedByMe(UUID blockerId, UUID blockedId);

    boolean isNotifyEmailEnabled(UUID userId);

    List<LoginSessionResponse> getLoginSessions(UUID userId, UUID currentSessionId);

    void revokeSession(UUID userId, UUID sessionId);

    void createDefaultSettings(UUID userId);
}
