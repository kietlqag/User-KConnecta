package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.feature.chat.dto.response.PresenceStatusResponse;
import project.kconnecta.user.backend.feature.chat.service.PresenceService;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentMap<String, UUID> sessionOwners = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, AtomicInteger> onlineCounters = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, LocalDateTime> lastActiveAt = new ConcurrentHashMap<>();

    @Override
    public void handleSessionConnected(String sessionId, String username) {
        if (sessionId == null || username == null || username.isBlank()) {
            return;
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return;
        }

        UUID userId = user.getId();
        sessionOwners.put(sessionId, userId);
        int activeSessions = onlineCounters.computeIfAbsent(userId, ignored -> new AtomicInteger(0)).incrementAndGet();

        if (activeSessions == 1) {
            publishPresenceToFriends(userId, true, null);
        }
    }

    @Override
    public void handleSessionDisconnected(String sessionId) {
        if (sessionId == null) {
            return;
        }

        UUID userId = sessionOwners.remove(sessionId);
        if (userId == null) {
            return;
        }

        AtomicInteger counter = onlineCounters.get(userId);
        if (counter == null) {
            return;
        }

        int activeSessions = counter.decrementAndGet();
        if (activeSessions > 0) {
            return;
        }

        onlineCounters.remove(userId);
        LocalDateTime now = LocalDateTime.now();
        lastActiveAt.put(userId, now);
        publishPresenceToFriends(userId, false, now);
    }

    @Override
    public void sendInitialPresenceSnapshot(String username) {
        if (username == null || username.isBlank()) {
            return;
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return;
        }

        UUID userId = user.getId();
        List<UUID> friendIds = friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED);

        for (UUID friendId : friendIds) {
            PresenceStatusResponse status = new PresenceStatusResponse(
                    friendId,
                    isOnline(friendId),
                    lastActiveAt.get(friendId)
            );
            messagingTemplate.convertAndSendToUser(username, "/queue/presence", status);
        }
    }

    private boolean isOnline(UUID userId) {
        AtomicInteger counter = onlineCounters.get(userId);
        return counter != null && counter.get() > 0;
    }

    private void publishPresenceToFriends(UUID subjectUserId, boolean online, LocalDateTime lastActive) {
        List<UUID> friendIds = friendshipRepository.findFriendIdsByUserIdAndStatus(subjectUserId, FriendshipStatus.ACCEPTED);
        if (friendIds.isEmpty()) {
            return;
        }

        PresenceStatusResponse payload = new PresenceStatusResponse(subjectUserId, online, lastActive);
        List<User> friends = userRepository.findAllById(friendIds);
        for (User friend : friends) {
            messagingTemplate.convertAndSendToUser(friend.getUsername(), "/queue/presence", payload);
        }
    }
}

