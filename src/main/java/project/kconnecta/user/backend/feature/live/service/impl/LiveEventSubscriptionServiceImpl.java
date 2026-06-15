package project.kconnecta.user.backend.feature.live.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscriberResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscribersResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscriptionStatusResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveEventSubscription;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.repository.LiveEventSubscriptionRepository;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.service.LiveAccessService;
import project.kconnecta.user.backend.feature.live.service.LiveEventSubscriptionService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class LiveEventSubscriptionServiceImpl implements LiveEventSubscriptionService {

    private static final long REMINDER_WINDOW_MINUTES = 15;
    private static final DateTimeFormatter REMINDER_TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final LiveEventSubscriptionRepository subscriptionRepository;
    private final LiveSessionRepository liveSessionRepository;
    private final UserRepository userRepository;
    private final LiveAccessService liveAccessService;
    private final NotificationEventPublisher notificationEventPublisher;

    @Override
    public LiveEventSubscriptionStatusResponse subscribe(UUID sessionId, UUID userId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        requireScheduledSession(session);
        if (session.getHost().getId().equals(userId)) {
            throw new ValidationException("Host không cần đăng ký nhắc nhở");
        }

        if (!subscriptionRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            User user = findUser(userId);
            subscriptionRepository.save(LiveEventSubscription.builder()
                    .session(session)
                    .user(user)
                    .build());
        }

        return buildStatus(sessionId, userId);
    }

    @Override
    public LiveEventSubscriptionStatusResponse unsubscribe(UUID sessionId, UUID userId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        subscriptionRepository.findBySessionIdAndUserId(sessionId, userId)
                .ifPresent(subscriptionRepository::delete);
        return buildStatus(sessionId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveEventSubscriptionStatusResponse getStatus(UUID sessionId, UUID userId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireCanView(session, userId);
        return buildStatus(sessionId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public LiveEventSubscribersResponse listSubscribers(UUID sessionId, UUID hostUserId) {
        LiveSession session = findSession(sessionId);
        liveAccessService.requireHost(session, hostUserId);

        List<LiveEventSubscriberResponse> subscribers = subscriptionRepository
                .findAllBySessionIdOrderByCreatedAtDesc(sessionId)
                .stream()
                .map(subscription -> {
                    User user = subscription.getUser();
                    return LiveEventSubscriberResponse.builder()
                            .userId(user.getId())
                            .username(user.getUsername())
                            .fullName(user.getFullName())
                            .avatarUrl(user.getAvatarUrl())
                            .subscribedAt(subscription.getCreatedAt())
                            .build();
                })
                .toList();

        return LiveEventSubscribersResponse.builder()
                .total(subscribers.size())
                .subscribers(subscribers)
                .build();
    }

    @Override
    public int sendUpcomingReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusMinutes(REMINDER_WINDOW_MINUTES);
        List<LiveSession> sessions = liveSessionRepository.findAllByStatusAndScheduledAtBetween(
                LiveSessionStatus.SCHEDULED,
                now,
                windowEnd
        );

        int sent = 0;
        for (LiveSession session : sessions) {
            List<LiveEventSubscription> pending = subscriptionRepository
                    .findAllBySessionIdAndReminderSentAtIsNull(session.getId());
            if (pending.isEmpty()) {
                continue;
            }

            UUID hostId = session.getHost().getId();
            UUID relatedId = session.getPostId() != null ? session.getPostId() : session.getId();
            String content = buildReminderContent(session);

            for (LiveEventSubscription subscription : pending) {
                UUID recipientId = subscription.getUser().getId();
                if (recipientId.equals(hostId)) {
                    subscription.setReminderSentAt(now);
                    continue;
                }
                notificationEventPublisher.publish(hostId, recipientId, NotificationType.EVENT, content, relatedId);
                subscription.setReminderSentAt(now);
                sent++;
            }
            subscriptionRepository.saveAll(pending);
        }

        if (sent > 0) {
            log.info("[scheduler] sent live event reminders: count={}", sent);
        }
        return sent;
    }

    @Override
    public void notifyLiveStarted(LiveSession session) {
        List<LiveEventSubscription> pending = subscriptionRepository
                .findAllBySessionIdAndLiveStartedNotifiedAtIsNull(session.getId());
        if (pending.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        UUID hostId = session.getHost().getId();
        UUID relatedId = session.getPostId() != null ? session.getPostId() : session.getId();
        String hostName = resolveDisplayName(session.getHost());
        String content = hostName + " đã bắt đầu phát live \"" + session.getTitle() + "\".";

        for (LiveEventSubscription subscription : pending) {
            UUID recipientId = subscription.getUser().getId();
            if (!recipientId.equals(hostId)) {
                notificationEventPublisher.publish(hostId, recipientId, NotificationType.EVENT, content, relatedId);
            }
            subscription.setLiveStartedNotifiedAt(now);
        }
        subscriptionRepository.saveAll(pending);
    }

    @Override
    @Transactional(readOnly = true)
    public long countBySessionId(UUID sessionId) {
        return subscriptionRepository.countBySessionId(sessionId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSubscribed(UUID sessionId, UUID userId) {
        if (userId == null) {
            return false;
        }
        return subscriptionRepository.existsBySessionIdAndUserId(sessionId, userId);
    }

    private LiveEventSubscriptionStatusResponse buildStatus(UUID sessionId, UUID userId) {
        return LiveEventSubscriptionStatusResponse.builder()
                .subscribed(subscriptionRepository.existsBySessionIdAndUserId(sessionId, userId))
                .subscriptionCount(subscriptionRepository.countBySessionId(sessionId))
                .build();
    }

    private void requireScheduledSession(LiveSession session) {
        if (session.getStatus() != LiveSessionStatus.SCHEDULED) {
            throw new ValidationException("Chỉ có thể quan tâm sự kiện đang chờ phát");
        }
    }

    private LiveSession findSession(UUID sessionId) {
        return liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Live session not found: " + sessionId));
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private String buildReminderContent(LiveSession session) {
        String timeLabel = session.getScheduledAt() == null
                ? "sắp tới"
                : REMINDER_TIME_FORMAT.format(session.getScheduledAt());
        return "Buổi live \"" + session.getTitle() + "\" sẽ bắt đầu lúc " + timeLabel + ".";
    }

    private String resolveDisplayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        return user.getUsername();
    }
}
