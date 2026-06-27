package project.kconnecta.user.backend.feature.settings.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /** All user IDs involved in a block relationship with the given user (either direction). */
    @Query("""
            SELECT CASE WHEN b.blocker.id = :userId THEN b.blocked.id ELSE b.blocker.id END
            FROM UserBlock b
            WHERE b.blocker.id = :userId OR b.blocked.id = :userId
            """)
    List<UUID> findRelatedUserIds(@Param("userId") UUID userId);
}
