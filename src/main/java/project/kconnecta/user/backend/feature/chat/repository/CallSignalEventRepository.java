package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.chat.entity.CallSignalEvent;

import java.util.UUID;

public interface CallSignalEventRepository extends JpaRepository<CallSignalEvent, UUID> {
}

