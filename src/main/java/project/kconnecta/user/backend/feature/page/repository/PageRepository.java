package project.kconnecta.user.backend.feature.page.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.page.entity.Page;

import java.util.List;
import java.util.UUID;

@Repository
public interface PageRepository extends JpaRepository<Page, UUID> {
    List<Page> findAllByCreatedByIdOrderByUpdatedAtDesc(UUID userId);
}

