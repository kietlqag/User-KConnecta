package project.kconnecta.user.backend.feature.notification.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    /**
     * Consumes events from the FIFO queue (ThreadPoolTaskExecutor's LinkedBlockingQueue).
     * Each event is processed in the order it was published.
     */
    @Async("notificationExecutor")
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        try {
            notificationService.createNotification(
                    event.getRecipientId(),
                    event.getSenderId(),
                    event.getType(),
                    event.getContent(),
                    event.getRelatedId()
            );
        } catch (Exception e) {
            log.error("Failed to process notification event type={} sender={} recipient={}",
                    event.getType(), event.getSenderId(), event.getRecipientId(), e);
        }
    }
}
