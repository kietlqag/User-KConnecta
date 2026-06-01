package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChatErrorMessage {
    private String code;
    private String message;
    private Integer retryAfterSeconds;
    private String conversationId;
    private String messageClientId;
}
