package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallRecording;

import java.util.UUID;

public interface GroupCallRecordingRepository extends JpaRepository<GroupCallRecording, UUID> {
}
