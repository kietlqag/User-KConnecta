package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostComment;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    long countByPostId(UUID postId);
    long countByParentCommentId(UUID parentCommentId);

    // Trả về comment cấp 1 chưa bị xóa, HOẶC đã bị soft-delete nhưng vẫn còn con
    @Query("SELECT c FROM PostComment c WHERE c.post.id = :postId AND c.parentComment IS NULL " +
           "AND (c.isDeleted = false OR EXISTS (SELECT r FROM PostComment r WHERE r.parentComment = c))")
    Page<PostComment> findTopLevelVisible(@Param("postId") UUID postId, Pageable pageable);

    // Trả về replies chưa xóa, HOẶC soft-deleted nhưng còn con
    @Query("SELECT c FROM PostComment c WHERE c.parentComment.id = :parentId " +
           "AND (c.isDeleted = false OR EXISTS (SELECT r FROM PostComment r WHERE r.parentComment = c)) " +
           "ORDER BY c.createdAt ASC")
    List<PostComment> findVisibleReplies(@Param("parentId") UUID parentId);

    @org.springframework.data.jpa.repository.Query("select c.post.id as postId, count(c) as count from PostComment c where c.post.id in :postIds group by c.post.id")
    List<CountProjection> countByPostIdIn(@org.springframework.data.repository.query.Param("postIds") List<UUID> postIds);

    interface CountProjection {
        UUID getPostId();
        long getCount();
    }
}
