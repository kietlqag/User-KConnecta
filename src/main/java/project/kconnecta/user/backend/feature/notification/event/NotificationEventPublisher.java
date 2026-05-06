package project.kconnecta.user.backend.feature.notification.event;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    /**
     * Push a notification event onto the internal queue.
     * Events are processed FIFO by NotificationEventListener.
     * Self-notifications are silently dropped.
     */
    public void publish(UUID senderId, UUID recipientId, NotificationType type, String content, UUID relatedId) {
        if (senderId != null && senderId.equals(recipientId)) return;
        applicationEventPublisher.publishEvent(
                new NotificationEvent(senderId, recipientId, type, content, relatedId)
        );
    }
}
