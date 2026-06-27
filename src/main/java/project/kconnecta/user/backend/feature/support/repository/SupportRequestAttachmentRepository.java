package project.kconnecta.user.backend.feature.support.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import project.kconnecta.user.backend.feature.support.entity.SupportRequestAttachment;

import java.util.UUID;

public interface SupportRequestAttachmentRepository extends JpaRepository<SupportRequestAttachment, UUID> {
}
