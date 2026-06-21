package project.kconnecta.user.backend.feature.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.user.entity.UserRestriction;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRestrictionRepository extends JpaRepository<UserRestriction, UUID> {

    /** Còn lệnh khóa comment đang hiệu lực (ACTIVE, chưa hết hạn) không. */
    @Query("""
            SELECT COUNT(r) > 0 FROM UserRestriction r
            WHERE r.user.id = :userId
              AND r.type = 'COMMENT_LOCK'
              AND r.status = 'ACTIVE'
              AND (r.expiresAt IS NULL OR r.expiresAt > :now)
            """)
    boolean existsActiveCommentLock(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    /** Mốc reset bộ đếm: thời điểm tạo lệnh khóa comment gần nhất (mọi trạng thái). */
    @Query("""
            SELECT MAX(r.createdAt) FROM UserRestriction r
            WHERE r.user.id = :userId
              AND r.type = 'COMMENT_LOCK'
            """)
    Optional<LocalDateTime> findLastCommentLockCreatedAt(@Param("userId") UUID userId);
}
