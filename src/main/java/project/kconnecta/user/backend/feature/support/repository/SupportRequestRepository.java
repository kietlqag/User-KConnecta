package project.kconnecta.user.backend.feature.support.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.support.entity.SupportRequest;

import java.util.List;
import java.util.UUID;

@Repository
public interface SupportRequestRepository extends JpaRepository<SupportRequest, UUID> {

    @EntityGraph(attributePaths = "attachments")
    List<SupportRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
