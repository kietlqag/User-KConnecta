package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionReaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveSessionReactionRepository extends JpaRepository<LiveSessionReaction, UUID> {
    Optional<LiveSessionReaction> findBySessionIdAndUserId(UUID sessionId, UUID userId);
    long countBySessionId(UUID sessionId);
    List<LiveSessionReaction> findAllBySession_Id(UUID sessionId);
}
