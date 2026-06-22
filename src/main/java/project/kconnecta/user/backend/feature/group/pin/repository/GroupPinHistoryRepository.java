package project.kconnecta.user.backend.feature.group.pin.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.group.pin.entity.GroupPinHistory;

import java.util.UUID;

@Repository
public interface GroupPinHistoryRepository extends JpaRepository<GroupPinHistory, UUID> {

    Page<GroupPinHistory> findByGroupIdOrderByCreatedAtDesc(UUID groupId, Pageable pageable);

    Page<GroupPinHistory> findByGroupIdAndPostIdOrderByCreatedAtDesc(UUID groupId, UUID postId, Pageable pageable);
}
