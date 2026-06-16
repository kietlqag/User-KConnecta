package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostShareResponse {
    private UUID id;
    private UUID postId;
    private UUID userId;
    private String userFullName;
    private String sharedContent;
    private LocalDateTime createdAt;
    private long shareCount;
    /** Reshare count on the parent share wrapper, when parentShareId was sent in the request. */
    private Long wrapperShareCount;
}
