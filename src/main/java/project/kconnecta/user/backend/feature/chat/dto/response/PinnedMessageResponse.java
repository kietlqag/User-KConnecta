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
public class PinnedMessageResponse {
    private UUID id;
    private UUID peerUserId;
    private UUID conversationId;
    private UUID messageId;
    private UUID pinnedBy;
    private LocalDateTime pinnedAt;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private String messagePreview;
    private LocalDateTime messageCreatedAt;
    private Boolean pinned;
}
