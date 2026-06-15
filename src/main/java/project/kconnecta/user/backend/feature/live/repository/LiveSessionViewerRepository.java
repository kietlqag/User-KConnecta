package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.live.entity.LiveSessionViewer;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface LiveSessionViewerRepository extends JpaRepository<LiveSessionViewer, UUID> {
    Optional<LiveSessionViewer> findBySessionIdAndUserId(UUID sessionId, UUID userId);
    int countBySessionId(UUID sessionId);

    @Modifying
    @Query("""
            DELETE FROM LiveSessionViewer v
            WHERE v.session.id = :sessionId
              AND COALESCE(v.lastSeenAt, v.joinedAt) < :cutoff
            """)
    int deleteStaleBySessionId(@Param("sessionId") UUID sessionId, @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM LiveSessionViewer v WHERE v.session.id = :sessionId")
    void deleteAllBySessionId(@Param("sessionId") UUID sessionId);
}
