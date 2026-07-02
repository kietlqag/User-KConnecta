package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/** Gọi bởi Admin backend sau khi kiểm duyệt (ẩn/xóa) tin nhắn, để đẩy cập nhật realtime tới người dùng. */
@RestController
@RequestMapping("/api/internal/chat")
@RequiredArgsConstructor
public class InternalChatModerationController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final ChatService chatService;

    @PostMapping("/messages/{messageId}/sync")
    public ResponseEntity<Void> syncMessageStatus(
            @RequestHeader("X-Internal-Key") String key,
            @PathVariable UUID messageId) {
        validateKey(key);
        chatService.syncMessageStatusFromAdmin(messageId);
        return ResponseEntity.noContent().build();
    }

    private void validateKey(String key) {
        if (key == null || !MessageDigest.isEqual(
                internalApiKey.getBytes(StandardCharsets.UTF_8),
                key.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
