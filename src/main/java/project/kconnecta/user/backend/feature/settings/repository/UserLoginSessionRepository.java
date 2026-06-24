package project.kconnecta.user.backend.feature.settings.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.settings.entity.UserLoginSession;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLoginSessionRepository extends JpaRepository<UserLoginSession, UUID> {
    List<UserLoginSession> findAllByUserIdAndRevokedAtIsNullOrderByLastSeenAtDesc(UUID userId);

    Optional<UserLoginSession> findByIdAndUserId(UUID id, UUID userId);
}
