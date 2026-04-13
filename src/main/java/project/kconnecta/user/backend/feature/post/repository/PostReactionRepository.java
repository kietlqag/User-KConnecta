package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;
import project.kconnecta.user.backend.feature.post.entity.PostReaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {
    interface ReactionCountProjection {
        ReactionType getReactionType();
        long getCount();
    }

    Optional<PostReaction> findByPostIdAndUserId(UUID postId, UUID userId);
    void deleteByPostIdAndUserId(UUID postId, UUID userId);
    long countByPostId(UUID postId);
    List<PostReaction> findAllByPostIdOrderByCreatedAtDesc(UUID postId);

    @Query("""
            select r.reactionType as reactionType, count(r) as count
            from PostReaction r
            where r.post.id = :postId
            group by r.reactionType
            """)
    List<ReactionCountProjection> findReactionCountsByPostId(@Param("postId") UUID postId);
}
