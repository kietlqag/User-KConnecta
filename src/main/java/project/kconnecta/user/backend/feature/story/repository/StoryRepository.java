package project.kconnecta.user.backend.feature.story.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
