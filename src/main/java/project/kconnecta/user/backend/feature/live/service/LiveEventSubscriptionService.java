package project.kconnecta.user.backend.feature.live.service;

import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscribersResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscriptionStatusResponse;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;

import java.util.UUID;

public interface LiveEventSubscriptionService {

    LiveEventSubscriptionStatusResponse subscribe(UUID sessionId, UUID userId);

    LiveEventSubscriptionStatusResponse unsubscribe(UUID sessionId, UUID userId);

    LiveEventSubscriptionStatusResponse getStatus(UUID sessionId, UUID userId);

    LiveEventSubscribersResponse listSubscribers(UUID sessionId, UUID hostUserId);

    int sendUpcomingReminders();

    void notifyLiveStarted(LiveSession session);

    long countBySessionId(UUID sessionId);

    boolean isSubscribed(UUID sessionId, UUID userId);
}
