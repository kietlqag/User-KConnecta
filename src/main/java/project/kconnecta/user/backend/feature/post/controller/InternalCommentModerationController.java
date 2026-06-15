package project.kconnecta.user.backend.feature.post.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.post.dto.response.PendingCommentResponse;
import project.kconnecta.user.backend.feature.post.service.PostService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;

/**
 * Internal endpoints for the admin service to review comments stuck in PENDING
 * (fail-closed when AI moderation is unavailable). Guarded by the shared internal key,
 * same pattern as {@code InternalPolicyController}.
 */
@RestController
@RequestMapping("/api/internal/comments")
@RequiredArgsConstructor
public class InternalCommentModerationController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final PostService postService;

    @GetMapping("/pending")
    public ResponseEntity<Page<PendingCommentResponse>> listPending(
            @RequestHeader("X-Internal-Key") String key,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        validateKey(key);
        return ResponseEntity.ok(postService.listPendingComments(PageRequest.of(page, size)));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approve(
            @RequestHeader("X-Internal-Key") String key,
            @PathVariable UUID id) {
        validateKey(key);
        postService.approveComment(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(
            @RequestHeader("X-Internal-Key") String key,
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        validateKey(key);
        String reason = body != null ? body.get("reason") : null;
        postService.rejectComment(id, reason);
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
