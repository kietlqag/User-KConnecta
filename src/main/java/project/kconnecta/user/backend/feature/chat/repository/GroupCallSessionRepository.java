package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface GroupCallSessionRepository extends JpaRepository<GroupCallSession, UUID> {
    Optional<GroupCallSession> findByCallId(UUID callId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT gcs FROM GroupCallSession gcs WHERE gcs.callId = :callId")
    Optional<GroupCallSession> findByCallIdForUpdate(@Param("callId") UUID callId);

    @Query("""
            SELECT gcs FROM GroupCallSession gcs
            JOIN FETCH gcs.conversation c
            JOIN FETCH gcs.caller caller
            WHERE gcs.callId = :callId
            """)
    Optional<GroupCallSession> findByCallIdWithDetails(@Param("callId") UUID callId);
}
