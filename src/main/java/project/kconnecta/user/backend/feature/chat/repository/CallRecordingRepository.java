package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.chat.entity.CallRecording;

import java.util.UUID;

public interface CallRecordingRepository extends JpaRepository<CallRecording, UUID> {
}

