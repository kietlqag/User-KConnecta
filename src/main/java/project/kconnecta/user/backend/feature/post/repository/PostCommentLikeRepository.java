package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.post.entity.PostCommentLike;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostCommentLikeRepository extends JpaRepository<PostCommentLike, UUID> {

    @Query("SELECT COUNT(l) > 0 FROM PostCommentLike l WHERE l.comment.id = :commentId AND l.user.id = :userId")
    boolean existsByCommentIdAndUserId(@Param("commentId") UUID commentId, @Param("userId") UUID userId);

    Optional<PostCommentLike> findByCommentIdAndUserId(UUID commentId, UUID userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PostCommentLike l WHERE l.comment.id = :commentId AND l.user.id = :userId")
    void deleteByCommentIdAndUserId(@Param("commentId") UUID commentId, @Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PostCommentLike l WHERE l.comment.id IN :commentIds")
    void deleteByCommentIdIn(@Param("commentIds") List<UUID> commentIds);

    @Query("SELECT COUNT(l) FROM PostCommentLike l WHERE l.comment.id = :commentId")
    long countByCommentId(@Param("commentId") UUID commentId);

    /** Đếm số reaction theo từng loại cho 1 bình luận → [reactionType, count]. */
    @Query("SELECT l.reactionType, COUNT(l) FROM PostCommentLike l WHERE l.comment.id = :commentId GROUP BY l.reactionType")
    List<Object[]> countGroupedByReactionType(@Param("commentId") UUID commentId);
}
