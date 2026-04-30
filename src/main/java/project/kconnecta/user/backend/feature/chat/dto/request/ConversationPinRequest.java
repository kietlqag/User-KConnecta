package project.kconnecta.user.backend.feature.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ConversationPinRequest {
    private UUID peerUserId;
    private UUID conversationId;
    private Boolean pinned;
}

