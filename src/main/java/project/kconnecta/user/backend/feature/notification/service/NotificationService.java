package project.kconnecta.user.backend.feature.notification.service;

import project.kconnecta.user.backend.feature.notification.dto.response.NotificationResponse;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    NotificationResponse createNotification(UUID recipientId, UUID senderId, NotificationType type, String content, UUID relatedId);
    List<NotificationResponse> getNotificationsForUser(UUID userId);
    int getUnreadCount(UUID userId);
    void markAsRead(UUID notificationId);
    void markAllAsRead(UUID userId);
    void markAsActioned(UUID notificationId);

    void broadcastSystemNotification(String content);
}
