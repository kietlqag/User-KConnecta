package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LivePinnedCommentResponse {
    private UUID id;
    private UUID userId;
    private boolean enabled;
    private String commentText;
    private LocalDateTime updatedAt;
}

