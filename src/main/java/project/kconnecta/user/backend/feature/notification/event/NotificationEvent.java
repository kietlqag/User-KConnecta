package project.kconnecta.user.backend.feature.notification.event;

import lombok.Getter;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;

import java.util.UUID;

@Getter
public class NotificationEvent {
    private final UUID senderId;
    private final UUID recipientId;
    private final NotificationType type;
    private final String content;
    private final UUID relatedId;

    public NotificationEvent(UUID senderId, UUID recipientId, NotificationType type, String content, UUID relatedId) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.type = type;
        this.content = content;
        this.relatedId = relatedId;
    }
}
