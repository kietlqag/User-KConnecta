package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.CommentStatus;
import project.kconnecta.user.backend.feature.post.entity.PostComment;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    // Đếm công khai: chỉ tính comment đã duyệt và chưa xóa (khớp với những gì render)
    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.post.id = :postId AND c.share IS NULL " +
           "AND c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED AND c.isDeleted = false")
    long countByPostId(@Param("postId") UUID postId);

    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.share.id = :shareId " +
           "AND c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED AND c.isDeleted = false")
    long countByShareId(@Param("shareId") UUID shareId);

    long countByParentCommentId(UUID parentCommentId);

    // Comment cấp 1 hiển thị: đã duyệt & chưa xóa, HOẶC của chính người xem, HOẶC soft-deleted/pending nhưng còn con (giữ thread)
    @Query("SELECT c FROM PostComment c WHERE c.post.id = :postId AND c.share IS NULL AND c.parentComment IS NULL " +
           "AND ((c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED AND c.isDeleted = false) " +
           "OR (:currentUserId IS NOT NULL AND c.user.id = :currentUserId AND c.status <> project.kconnecta.user.backend.feature.post.entity.CommentStatus.REJECTED) " +
           "OR EXISTS (SELECT r FROM PostComment r WHERE r.parentComment = c))")
    Page<PostComment> findTopLevelVisible(@Param("postId") UUID postId,
                                          @Param("currentUserId") UUID currentUserId,
                                          Pageable pageable);

    @Query("SELECT c FROM PostComment c WHERE c.share.id = :shareId AND c.parentComment IS NULL " +
           "AND ((c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED AND c.isDeleted = false) " +
           "OR (:currentUserId IS NOT NULL AND c.user.id = :currentUserId AND c.status <> project.kconnecta.user.backend.feature.post.entity.CommentStatus.REJECTED) " +
           "OR EXISTS (SELECT r FROM PostComment r WHERE r.parentComment = c))")
    Page<PostComment> findTopLevelVisibleByShareId(@Param("shareId") UUID shareId,
                                                   @Param("currentUserId") UUID currentUserId,
                                                   Pageable pageable);

    // Replies hiển thị: cùng quy tắc với cấp 1
    @Query("SELECT c FROM PostComment c WHERE c.parentComment.id = :parentId " +
           "AND ((c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED AND c.isDeleted = false) " +
           "OR (:currentUserId IS NOT NULL AND c.user.id = :currentUserId AND c.status <> project.kconnecta.user.backend.feature.post.entity.CommentStatus.REJECTED) " +
           "OR EXISTS (SELECT r FROM PostComment r WHERE r.parentComment = c)) " +
           "ORDER BY c.createdAt ASC")
    List<PostComment> findVisibleReplies(@Param("parentId") UUID parentId,
                                         @Param("currentUserId") UUID currentUserId);

    // Danh sách admin xem (mọi comment PENDING, kể cả đã hết lượt thử AI)
    Page<PostComment> findByStatusOrderByCreatedAtAsc(CommentStatus status, Pageable pageable);

    // Hàng đợi AI: bỏ qua comment đã thử quá nhiều lần (fail-closed) để không chặn comment mới
    Page<PostComment> findByStatusAndModerationAttemptsLessThanOrderByCreatedAtAsc(
            CommentStatus status, int maxAttempts, Pageable pageable);

    @Query("select c.post.id as postId, count(c) as count from PostComment c " +
           "where c.post.id in :postIds and c.share is null " +
           "and c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED and c.isDeleted = false " +
           "group by c.post.id")
    List<CountProjection> countByPostIdIn(@Param("postIds") List<UUID> postIds);

    @Query("select c.share.id as shareId, count(c) as count from PostComment c " +
           "where c.share.id in :shareIds " +
           "and c.status = project.kconnecta.user.backend.feature.post.entity.CommentStatus.APPROVED and c.isDeleted = false " +
           "group by c.share.id")
    List<ShareCountProjection> countByShareIdIn(@Param("shareIds") List<UUID> shareIds);

    interface CountProjection {
        UUID getPostId();
        long getCount();
    }

    interface ShareCountProjection {
        UUID getShareId();
        long getCount();
    }
}
