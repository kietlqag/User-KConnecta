package project.kconnecta.user.backend.feature.story.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.story.entity.Story;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StoryRepository extends JpaRepository<Story, UUID> {
    
    @EntityGraph(attributePaths = {"user", "audienceAllowances", "audienceAllowances.allowedUser"})
    List<Story> findByUserIdAndExpiresAtAfterAndActiveTrueOrderByCreatedAtAsc(UUID userId, LocalDateTime now);
    
    @EntityGraph(attributePaths = {"user", "audienceAllowances", "audienceAllowances.allowedUser"})
    List<Story> findByExpiresAtAfterAndActiveTrueOrderByCreatedAtDesc(LocalDateTime now);

    @EntityGraph(attributePaths = {"user", "audienceAllowances", "audienceAllowances.allowedUser"})
    @Query("SELECT s FROM Story s WHERE s.active = true AND s.expiresAt > :now AND (s.user.id = :viewerId OR s.user.id IN :friendIds) ORDER BY s.createdAt DESC")
    List<Story> findActiveStoriesForViewer(
        @Param("viewerId") UUID viewerId,
        @Param("friendIds") List<UUID> friendIds,
        @Param("now") LocalDateTime now
    );
}
