package project.kconnecta.user.backend.feature.birthday.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class BirthdayWishResponse {
    private UUID id;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private UUID recipientId;
    private String recipientName;
    private String recipientAvatarUrl;
    private String message;
    private LocalDateTime createdAt;
}
