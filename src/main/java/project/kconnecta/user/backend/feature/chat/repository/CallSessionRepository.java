package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;

import java.util.Optional;
import java.util.UUID;

public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {
    Optional<CallSession> findByCallId(UUID callId);

    @Query("""
            select cs from CallSession cs
            join fetch cs.caller c
            join fetch cs.callee d
            where cs.callId = :callId
            """)
    Optional<CallSession> findByCallIdWithUsers(@Param("callId") UUID callId);
}
