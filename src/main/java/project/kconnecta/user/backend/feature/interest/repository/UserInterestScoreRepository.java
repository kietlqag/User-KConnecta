package project.kconnecta.user.backend.feature.interest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.kconnecta.user.backend.feature.interest.entity.UserInterestScore;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UserInterestScoreRepository extends JpaRepository<UserInterestScore, UUID> {

    List<UserInterestScore> findByUserIdOrderByScoreDesc(UUID userId);

    @Query("SELECT uis FROM UserInterestScore uis WHERE uis.user.id = :userId AND LOWER(uis.topic) = LOWER(:topic)")
    java.util.Optional<UserInterestScore> findByUserIdAndTopicIgnoreCase(
            @Param("userId") UUID userId,
            @Param("topic") String topic);

    long countByUserId(UUID userId);

    @Query("SELECT uis FROM UserInterestScore uis WHERE uis.user.id = :userId ORDER BY uis.score ASC")
    List<UserInterestScore> findByUserIdOrderByScoreAsc(UUID userId);

    @Query("""
            SELECT uis FROM UserInterestScore uis
            WHERE uis.user.id IN :userIds
            ORDER BY uis.user.id ASC, uis.score DESC
            """)
    List<UserInterestScore> findByUserIds(@Param("userIds") Collection<UUID> userIds);
}
