package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageStatusResponse {
    private UUID messageId;
    private UUID senderId;
    private UUID receiverId;
    private String status; // SENT | DELIVERED | SEEN
    private LocalDateTime updatedAt;
}

