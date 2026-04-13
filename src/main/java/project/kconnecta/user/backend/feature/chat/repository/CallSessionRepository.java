package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;

import java.util.Optional;
import java.util.UUID;

public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {
    Optional<CallSession> findByCallId(UUID callId);
}

