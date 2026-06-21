package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.post.entity.CommentReport;
import project.kconnecta.user.backend.feature.post.entity.enums.CommentReportStatus;

import java.util.UUID;

@Repository
public interface CommentReportRepository extends JpaRepository<CommentReport, UUID> {

    boolean existsByCommentIdAndReporterId(UUID commentId, UUID reporterId);

    @Query("select count(distinct r.reporter.id) from CommentReport r where r.comment.id = :commentId")
    long countDistinctReportersByCommentId(@Param("commentId") UUID commentId);

    @Modifying
    @Transactional
    @Query("update CommentReport r set r.status = :to where r.comment.id = :commentId and r.status = :from")
    int updateStatusByCommentIdAndStatus(@Param("commentId") UUID commentId,
                                         @Param("from") CommentReportStatus from,
                                         @Param("to") CommentReportStatus to);
}
