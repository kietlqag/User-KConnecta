package project.kconnecta.user.backend.feature.live.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.kconnecta.user.backend.feature.live.entity.LivePinnedCommentSetting;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LivePinnedCommentSettingRepository extends JpaRepository<LivePinnedCommentSetting, UUID> {
    Optional<LivePinnedCommentSetting> findTopByUserIdOrderByUpdatedAtDesc(UUID userId);
}

