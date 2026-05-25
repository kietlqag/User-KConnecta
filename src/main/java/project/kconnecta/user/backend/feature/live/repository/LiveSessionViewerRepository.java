package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionViewer;

import java.util.Optional;
import java.util.UUID;

public interface LiveSessionViewerRepository extends JpaRepository<LiveSessionViewer, UUID> {
    Optional<LiveSessionViewer> findBySessionIdAndUserId(UUID sessionId, UUID userId);
}
