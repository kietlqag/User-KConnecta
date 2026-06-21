package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.CommentViolation;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface CommentViolationRepository extends JpaRepository<CommentViolation, UUID> {
    long countByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime threshold);

    /** Đã có violation AI_UNSAFE cho comment này chưa (chống double-count khi moderate lại). */
    boolean existsByCommentIdAndSource(UUID commentId, String source);
}
