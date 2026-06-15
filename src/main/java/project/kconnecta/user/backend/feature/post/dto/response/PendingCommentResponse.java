package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PendingCommentResponse {
    private UUID id;
    private UUID postId;
    private UUID userId;
    private String username;
    private String content;
    private int moderationAttempts;
    private LocalDateTime createdAt;
}
