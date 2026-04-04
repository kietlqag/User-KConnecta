package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostReactionResponse {
    private UUID id;
    private UUID postId;
    private UUID userId;
    private ReactionType reactionType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
