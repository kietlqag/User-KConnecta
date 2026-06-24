package project.kconnecta.user.backend.feature.settings.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.settings.entity.UserBlock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBlockRepository extends JpaRepository<UserBlock, UUID> {
    List<UserBlock> findAllByBlockerIdOrderByCreatedAtDesc(UUID blockerId);

    Optional<UserBlock> findByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    boolean existsByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    boolean existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(
            UUID blockerId1, UUID blockedId1, UUID blockerId2, UUID blockedId2);
}
