package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveSessionRepository extends JpaRepository<LiveSession, UUID> {
    List<LiveSession> findAllByStatusOrderByCreatedAtDesc(LiveSessionStatus status);
    List<LiveSession> findAllByStatusOrderByScheduledAtAsc(LiveSessionStatus status);
    List<LiveSession> findAllByHostIdOrderByCreatedAtDesc(UUID hostId);
    List<LiveSession> findAllByGroupIdOrderByCreatedAtDesc(UUID groupId);

    @Query("""
            SELECT DISTINCT ls FROM LiveSession ls
            JOIN FETCH ls.host
            WHERE ls.groupId = :groupId
               OR ls.postId IN (
                    SELECT p.id FROM Post p WHERE p.group.id = :groupId
               )
            ORDER BY ls.createdAt DESC
            """)
    List<LiveSession> findAllForGroupEvents(@Param("groupId") UUID groupId);
    Optional<LiveSession> findByPostId(UUID postId);
    List<LiveSession> findAllByStatusAndScheduledAtLessThanEqual(LiveSessionStatus status, LocalDateTime scheduledAt);
    List<LiveSession> findAllByStatusAndScheduledAtBetween(
            LiveSessionStatus status,
            LocalDateTime scheduledAtStart,
            LocalDateTime scheduledAtEnd
    );
}
