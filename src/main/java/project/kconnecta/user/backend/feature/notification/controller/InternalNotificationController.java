package project.kconnecta.user.backend.feature.notification.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.notification.dto.request.InternalBroadcastRequest;
import project.kconnecta.user.backend.feature.notification.dto.request.InternalSendRequest;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.repository.NotificationRepository;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    @Value("${internal.api.key:kconnecta-internal-secret}")
    private String internalApiKey;

    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/send")
    public ResponseEntity<Void> send(
            @RequestHeader("X-Internal-Key") String key,
            @RequestBody InternalSendRequest request) {
        validateKey(key);
        notificationService.createNotification(
                request.recipientUserId(), null, NotificationType.SYSTEM, request.text(), null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/broadcast")
    @Transactional
    public ResponseEntity<Void> broadcast(
            @RequestHeader("X-Internal-Key") String key,
            @RequestBody InternalBroadcastRequest request) {
        validateKey(key);
        notificationRepository.broadcastToAll(request.text(), NotificationType.SYSTEM.name());
        userRepository.findAll().forEach(user -> {
            if (user.getUsername() != null && !user.getUsername().isBlank()) {
                messagingTemplate.convertAndSendToUser(
                        user.getUsername(),
                        "/queue/notifications",
                        Map.of("event", "NEW_SYSTEM_NOTIFICATION")
                );
            }
        });
        return ResponseEntity.ok().build();
    }

    private void validateKey(String key) {
        if (!internalApiKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
