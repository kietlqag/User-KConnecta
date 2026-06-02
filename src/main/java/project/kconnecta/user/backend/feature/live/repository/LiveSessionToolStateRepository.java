package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionToolState;

import java.util.Optional;
import java.util.UUID;

public interface LiveSessionToolStateRepository extends JpaRepository<LiveSessionToolState, UUID> {
    Optional<LiveSessionToolState> findBySessionId(UUID sessionId);
}
