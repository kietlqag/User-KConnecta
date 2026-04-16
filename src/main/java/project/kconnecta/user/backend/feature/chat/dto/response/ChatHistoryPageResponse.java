package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatHistoryPageResponse {
    private List<ChatMessageResponse> messages;
    private boolean hasMore;
    private LocalDateTime nextBeforeCreatedAt;
}
