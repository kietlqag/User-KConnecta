package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
public class ConversationSummaryResponse {
    private UUID peerUserId;
    private UUID conversationId;
    private String lastMessageContent;
    private UUID lastMessageSenderId;
    private LocalDateTime lastMessageCreatedAt;
    private int unreadCount;
}

