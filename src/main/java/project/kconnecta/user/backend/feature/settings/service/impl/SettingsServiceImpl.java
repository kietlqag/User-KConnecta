package project.kconnecta.user.backend.feature.settings.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.settings.dto.request.UpdateUserSettingsRequest;
import project.kconnecta.user.backend.feature.settings.dto.response.BlockedUserResponse;
import project.kconnecta.user.backend.feature.settings.dto.response.LoginSessionResponse;
import project.kconnecta.user.backend.feature.settings.dto.response.UserSettingsResponse;
import project.kconnecta.user.backend.feature.settings.entity.*;
import project.kconnecta.user.backend.feature.settings.repository.UserBlockRepository;
import project.kconnecta.user.backend.feature.settings.repository.UserLoginSessionRepository;
import project.kconnecta.user.backend.feature.settings.repository.UserSettingsRepository;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SettingsServiceImpl implements SettingsService {

    private final UserSettingsRepository userSettingsRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserLoginSessionRepository userLoginSessionRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    @Override
    public UserSettings getOrCreate(UUID userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createSettingsRow(userId));
    }

    @Override
    public UserSettingsResponse getSettings(UUID userId, UUID currentSessionId) {
        UserSettings settings = getOrCreate(userId);
        return toResponse(settings, userId, currentSessionId);
    }

    @Override
    public UserSettingsResponse updateSettings(UUID userId, UpdateUserSettingsRequest request) {
        UserSettings settings = getOrCreate(userId);
        if (request.getTwoFactorEnabled() != null) {
            settings.setTwoFactorEnabled(request.getTwoFactorEnabled());
        }
        if (request.getProfileVisibility() != null) {
            settings.setProfileVisibility(request.getProfileVisibility());
        }
        if (request.getNotifyPosts() != null) {
            settings.setNotifyPosts(request.getNotifyPosts());
        }
        if (request.getNotifyMessages() != null) {
            settings.setNotifyMessages(request.getNotifyMessages());
        }
        if (request.getTheme() != null) {
            settings.setTheme(request.getTheme());
        }
        if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
            settings.setLanguage(request.getLanguage().trim());
        }
        userSettingsRepository.save(settings);
        return toResponse(settings, userId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTwoFactorEnabled(UUID userId) {
        return getOrCreate(userId).isTwoFactorEnabled();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isNotificationEnabled(UUID userId, NotificationType type) {
        UserSettings settings = getOrCreate(userId);
        return switch (type) {
            case LIKE, COMMENT, SHARE, MENTION, FRIEND_REQUEST, FRIEND_ACCEPTED,
                 GROUP_ACTIVITY, GROUP_INVITE, GROUP_JOIN_REQUEST, GROUP_POST_PINNED,
                 BIRTHDAY, BIRTHDAY_WISH, EVENT, MEMORY, SYSTEM -> settings.isNotifyPosts();
            default -> true;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canViewProfile(UUID viewerId, UUID profileOwnerId) {
        if (viewerId != null && viewerId.equals(profileOwnerId)) {
            return true;
        }
        if (viewerId != null && isBlockedEitherDirection(viewerId, profileOwnerId)) {
            return false;
        }
        SettingsVisibility visibility = getOrCreate(profileOwnerId).getProfileVisibility();
        return switch (visibility) {
            case PUBLIC -> true;
            case FRIENDS -> viewerId != null && areFriends(viewerId, profileOwnerId);
            case PRIVATE -> false;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public PostPrivacy getDefaultPostPrivacy(UUID userId) {
        return PostPrivacy.PUBLIC;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlockedUserResponse> getBlockedUsers(UUID userId) {
        return userBlockRepository.findAllByBlockerIdOrderByCreatedAtDesc(userId).stream()
                .map(block -> BlockedUserResponse.builder()
                        .id(block.getBlocked().getId())
                        .name(block.getBlocked().getFullName())
                        .avatarUrl(block.getBlocked().getAvatarUrl())
                        .blockedAt(block.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    public void blockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new ValidationException("Khong the tu chan chinh minh");
        }
        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung khong ton tai"));
        User blocked = userRepository.findById(blockedId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung bi chan khong ton tai"));

        if (userBlockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            return;
        }

        userBlockRepository.save(UserBlock.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build());

        friendshipRepository.findBetweenUsers(blocker.getId(), blocked.getId())
                .ifPresent(friendshipRepository::delete);
    }

    @Override
    public void unblockUser(UUID blockerId, UUID blockedId) {
        userBlockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .ifPresent(userBlockRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isBlockedEitherDirection(UUID userA, UUID userB) {
        if (userA == null || userB == null) {
            return false;
        }
        return userBlockRepository.existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(
                userA, userB, userB, userA);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isBlockedByMe(UUID blockerId, UUID blockedId) {
        if (blockerId == null || blockedId == null) {
            return false;
        }
        return userBlockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LoginSessionResponse> getLoginSessions(UUID userId, UUID currentSessionId) {
        return userLoginSessionRepository.findAllByUserIdAndRevokedAtIsNullOrderByLastSeenAtDesc(userId).stream()
                .filter(UserLoginSession::isActive)
                .map(session -> LoginSessionResponse.builder()
                        .id(session.getId())
                        .deviceName(session.getDeviceName())
                        .browser(session.getBrowser())
                        .location(session.getLocation())
                        .lastActive(session.getLastSeenAt())
                        .current(currentSessionId != null && currentSessionId.equals(session.getId()))
                        .build())
                .toList();
    }

    @Override
    public void revokeSession(UUID userId, UUID sessionId) {
        UserLoginSession session = userLoginSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Phien dang nhap khong ton tai"));
        if (session.getRevokedAt() == null) {
            session.setRevokedAt(LocalDateTime.now());
            userLoginSessionRepository.save(session);
        }
    }

    @Override
    public void createDefaultSettings(UUID userId) {
        if (userSettingsRepository.findByUserId(userId).isEmpty()) {
            createSettingsRow(userId);
        }
    }

    public UUID createLoginSession(UUID userId, HttpServletRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung khong ton tai"));
        String userAgent = request != null ? request.getHeader("User-Agent") : null;
        ParsedAgent parsed = parseUserAgent(userAgent);
        LocalDateTime now = LocalDateTime.now();
        UserLoginSession session = UserLoginSession.builder()
                .id(UUID.randomUUID())
                .user(user)
                .ipAddress(resolveClientIp(request))
                .userAgent(userAgent)
                .deviceName(parsed.deviceName())
                .browser(parsed.browser())
                .location("Việt Nam")
                .createdAt(now)
                .lastSeenAt(now)
                .expiresAt(now.plusSeconds(jwtExpirationMs / 1000))
                .build();
        return userLoginSessionRepository.save(session).getId();
    }

    @Transactional(readOnly = true)
    public boolean isSessionActive(UUID sessionId) {
        if (sessionId == null) {
            return true;
        }
        return userLoginSessionRepository.findById(sessionId)
                .map(UserLoginSession::isActive)
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<UserLoginSession> findSession(UUID sessionId) {
        if (sessionId == null) {
            return java.util.Optional.empty();
        }
        return userLoginSessionRepository.findById(sessionId);
    }

    public void touchSession(UUID sessionId) {
        if (sessionId == null) {
            return;
        }
        userLoginSessionRepository.findById(sessionId).ifPresent(session -> {
            if (session.isActive()) {
                session.setLastSeenAt(LocalDateTime.now());
                userLoginSessionRepository.save(session);
            }
        });
    }

    private UserSettings createSettingsRow(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Nguoi dung khong ton tai"));
        return userSettingsRepository.save(UserSettings.builder()
                .user(user)
                .twoFactorEnabled(false)
                .profileVisibility(SettingsVisibility.PUBLIC)
                .postsVisibility(SettingsVisibility.FRIENDS)
                .notifyPosts(true)
                .notifyMessages(true)
                .notifyEmail(false)
                .theme(SettingsTheme.system)
                .language("vi")
                .build());
    }

    private UserSettingsResponse toResponse(UserSettings settings, UUID userId, UUID currentSessionId) {
        return UserSettingsResponse.builder()
                .userId(userId)
                .twoFactorEnabled(settings.isTwoFactorEnabled())
                .profileVisibility(settings.getProfileVisibility())
                .notifyPosts(settings.isNotifyPosts())
                .notifyMessages(settings.isNotifyMessages())
                .theme(settings.getTheme())
                .language(settings.getLanguage())
                .blockedUsers(getBlockedUsers(userId))
                .devices(getLoginSessions(userId, currentSessionId))
                .build();
    }

    private boolean areFriends(UUID userA, UUID userB) {
        return friendshipRepository.findBetweenUsers(userA, userB)
                .map(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                .orElse(false);
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private ParsedAgent parseUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return new ParsedAgent("Thiết bị không xác định", "Trình duyệt web");
        }
        boolean mobile = userAgent.matches("(?i).*(Mobile|Android|iPhone).*");
        String browser;
        if (userAgent.contains("Edg/")) {
            browser = "Microsoft Edge";
        } else if (userAgent.contains("Chrome/")) {
            browser = "Google Chrome";
        } else if (userAgent.contains("Firefox/")) {
            browser = "Firefox";
        } else if (userAgent.contains("Safari/")) {
            browser = "Safari";
        } else {
            browser = "Trình duyệt web";
        }
        return new ParsedAgent(mobile ? "Điện thoại" : "Máy tính", browser);
    }

    private record ParsedAgent(String deviceName, String browser) {}
}
