package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.live.entity.LiveSchedule;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LiveScheduleRepository extends JpaRepository<LiveSchedule, UUID> {
    Optional<LiveSchedule> findTopByUserIdOrderByUpdatedAtDesc(UUID userId);
}

