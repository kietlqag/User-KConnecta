package project.kconnecta.user.backend.feature.support.dto.response;

import project.kconnecta.user.backend.feature.support.entity.SupportRequest;

import java.time.LocalDateTime;
import java.util.UUID;

public record SupportRequestResponse(
        UUID id,
        String category,
        String subject,
        String message,
        String status,
        String contactEmail,
        LocalDateTime createdAt
) {
    public static SupportRequestResponse from(SupportRequest s) {
        return new SupportRequestResponse(
                s.getId(),
                s.getCategory(),
                s.getSubject(),
                s.getMessage(),
                s.getStatus(),
                s.getContactEmail(),
                s.getCreatedAt()
        );
    }
}
