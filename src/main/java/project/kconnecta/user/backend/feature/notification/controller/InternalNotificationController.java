package project.kconnecta.user.backend.feature.notification.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.security.MessageDigest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.notification.dto.request.InternalBroadcastRequest;
import project.kconnecta.user.backend.feature.notification.dto.request.InternalSendRequest;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;

@RestController
@RequestMapping("/api/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final NotificationService notificationService;

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
    public ResponseEntity<Void> broadcast(
            @RequestHeader("X-Internal-Key") String key,
            @RequestBody InternalBroadcastRequest request) {
        validateKey(key);
        notificationService.broadcastSystemNotification(request.text());
        return ResponseEntity.ok().build();
    }

    private void validateKey(String key) {
        if (!MessageDigest.isEqual(
                internalApiKey.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                key.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
