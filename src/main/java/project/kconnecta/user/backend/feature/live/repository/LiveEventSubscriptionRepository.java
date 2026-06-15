package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveEventSubscription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveEventSubscriptionRepository extends JpaRepository<LiveEventSubscription, UUID> {

    boolean existsBySessionIdAndUserId(UUID sessionId, UUID userId);

    Optional<LiveEventSubscription> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    long countBySessionId(UUID sessionId);

    List<LiveEventSubscription> findAllBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    List<LiveEventSubscription> findAllBySessionIdAndReminderSentAtIsNull(UUID sessionId);

    List<LiveEventSubscription> findAllBySessionIdAndLiveStartedNotifiedAtIsNull(UUID sessionId);
}
