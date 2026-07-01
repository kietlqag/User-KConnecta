package project.kconnecta.user.backend.feature.activity.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.activity.entity.UserActivityLog;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, UUID> {
    boolean existsByUserIdAndActionType(UUID userId, ActivityLogType actionType);
    Optional<UserActivityLog> findFirstByUserIdAndActionTypeOrderByCreatedAtDesc(UUID userId, ActivityLogType actionType);
    boolean existsByUserIdAndActionTypeAndCreatedAtAfter(UUID userId, ActivityLogType actionType, LocalDateTime createdAt);
}
