package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private UUID id;
    private UUID senderId;
    private String senderUsername;
    private UUID receiverId;
    private String content;
    private LocalDateTime createdAt;
    private Boolean delivered;
    private Boolean seen;
    private LocalDateTime seenAt;
    private Boolean deleted;
    private LocalDateTime deletedAt;
    private List<String> reactions;
}
