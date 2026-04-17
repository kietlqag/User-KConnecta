package project.kconnecta.user.backend.feature.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReport;

import java.util.UUID;

public interface ChatMessageReportRepository extends JpaRepository<ChatMessageReport, UUID> {
}

