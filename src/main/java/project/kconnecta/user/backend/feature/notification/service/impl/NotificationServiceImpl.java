package project.kconnecta.user.backend.feature.notification.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.notification.dto.response.NotificationResponse;
import project.kconnecta.user.backend.feature.notification.entity.Notification;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.repository.NotificationRepository;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SettingsService settingsService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public NotificationResponse createNotification(UUID recipientId, UUID senderId, NotificationType type, String content, UUID relatedId) {
        if (!settingsService.isNotificationEnabled(recipientId, type)) {
            return null;
        }

        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found: " + recipientId));

        if (type == NotificationType.FRIEND_REMOVED) {
            // Silent event: push WebSocket only, no DB record
            pushUnreadCountUpdate(recipient, type);
            return null;
        }

        User sender = null;
        if (senderId != null) {
            sender = userRepository.findById(senderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Sender not found: " + senderId));
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .sender(sender)
                .type(type)
                .content(content)
                .relatedId(relatedId)
                .isRead(false)
                .isActioned(false)
                .build();

        notification = notificationRepository.save(notification);
        pushUnreadCountUpdate(recipient, type);
        return toResponse(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(UUID userId) {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public int getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadByRecipientId(userId);
    }

    @Override
    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setRead(true);
        notificationRepository.save(notification);
        pushUnreadCountUpdate(notification.getRecipient());
    }

    @Override
    public void markAllAsRead(UUID userId) {
        List<Notification> unreadList = notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .filter(n -> !n.isRead())
                .collect(Collectors.toList());
        
        unreadList.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadList);
        userRepository.findById(userId).ifPresent(this::pushUnreadCountUpdate);
    }

    @Override
    public void markAsActioned(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setActioned(true);
        notification.setRead(true);
        notificationRepository.save(notification);
        pushUnreadCountUpdate(notification.getRecipient());
    }

    private void pushUnreadCountUpdate(User recipient) {
        pushUnreadCountUpdate(recipient, null);
    }

    private void pushUnreadCountUpdate(User recipient, NotificationType type) {
        if (recipient == null || recipient.getUsername() == null || recipient.getUsername().isBlank()) {
            return;
        }
        int unreadCount = notificationRepository.countUnreadByRecipientId(recipient.getId());
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("event", "UNREAD_COUNT_UPDATED");
        payload.put("unreadCount", unreadCount);
        if (type != null) {
            payload.put("notificationType", type.name());
        }
        messagingTemplate.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/notifications",
                payload
        );
    }

    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse.NotificationUser senderDto = null;
        if (notification.getSender() != null) {
            senderDto = NotificationResponse.NotificationUser.builder()
                    .id(notification.getSender().getId())
                    .name(notification.getSender().getFullName())
                    .avatarUrl(notification.getSender().getAvatarUrl())
                    .build();
        }

        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .user(senderDto)
                .text(notification.getContent())
                .timestamp(notification.getCreatedAt())
                .isUnread(!notification.isRead())
                .isActioned(notification.isActioned())
                .relatedId(notification.getRelatedId())
                .build();
    }
}
