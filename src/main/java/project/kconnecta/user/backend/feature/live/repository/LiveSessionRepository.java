package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveSessionRepository extends JpaRepository<LiveSession, UUID> {
    List<LiveSession> findAllByStatusOrderByCreatedAtDesc(LiveSessionStatus status);
    List<LiveSession> findAllByHostIdOrderByCreatedAtDesc(UUID hostId);
    Optional<LiveSession> findByPostId(UUID postId);
}
