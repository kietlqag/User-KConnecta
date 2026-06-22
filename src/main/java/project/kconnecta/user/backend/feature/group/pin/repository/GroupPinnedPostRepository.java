package project.kconnecta.user.backend.feature.group.pin.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinnedPost;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupPinnedPostRepository extends JpaRepository<GroupPinnedPost, UUID> {

    Optional<GroupPinnedPost> findByGroupIdAndPostId(UUID groupId, UUID postId);

    Optional<GroupPinnedPost> findByGroupIdAndPostIdAndStatus(UUID groupId, UUID postId, PinStatus status);

    int countByGroupIdAndStatus(UUID groupId, PinStatus status);

    // Danh sách bài ghim ACTIVE, sắp theo priority (rank) rồi display_order.
    // Chỉ lấy pin trỏ tới bài còn PUBLISHED.
    @Query("SELECT gp FROM GroupPinnedPost gp " +
           "JOIN FETCH gp.post p JOIN FETCH gp.pinnedBy " +
           "WHERE gp.group.id = :groupId AND gp.status = :status AND p.status = 'PUBLISHED' " +
           "ORDER BY CASE gp.priority " +
           "  WHEN project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority.CRITICAL THEN 0 " +
           "  WHEN project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority.HIGH THEN 1 " +
           "  WHEN project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority.NORMAL THEN 2 " +
           "  ELSE 3 END ASC, gp.displayOrder ASC, gp.pinnedAt DESC")
    List<GroupPinnedPost> findActiveByGroup(@Param("groupId") UUID groupId, @Param("status") PinStatus status);

    @Query("SELECT COALESCE(MAX(gp.displayOrder), -1) FROM GroupPinnedPost gp " +
           "WHERE gp.group.id = :groupId AND gp.status = :status")
    int findMaxDisplayOrder(@Param("groupId") UUID groupId, @Param("status") PinStatus status);

    @Query("SELECT gp FROM GroupPinnedPost gp " +
           "WHERE gp.status = project.kconnecta.user.backend.feature.group.pin.entity.enums.PinStatus.ACTIVE " +
           "AND gp.expiresAt IS NOT NULL AND gp.expiresAt <= :now")
    List<GroupPinnedPost> findActiveExpired(@Param("now") LocalDateTime now);
}
