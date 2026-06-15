package project.kconnecta.user.backend.feature.post.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.post.entity.PostReport;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostReportRepository extends JpaRepository<PostReport, UUID> {
    boolean existsByPostIdAndReporterId(UUID postId, UUID reporterId);
    List<PostReport> findByReporterIdOrderByCreatedAtDesc(UUID reporterId);
}
