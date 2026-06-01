package project.kconnecta.user.backend.exception;

import lombok.Getter;

@Getter
public class ChatValidationException extends RuntimeException {
    private final String code;
    private final Integer retryAfterSeconds;
    private final String conversationId;
    private final String messageClientId;

    public ChatValidationException(String code, String message, Integer retryAfterSeconds,
                                   String conversationId, String messageClientId) {
        super(message);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
        this.conversationId = conversationId;
        this.messageClientId = messageClientId;
    }
}
