package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PostCommentResponse {
    private UUID id;
    private UUID postId;
    private UUID userId;
    private String username;
    private String userFullName;
    private String userAvatarUrl;
    private UUID parentCommentId;
    private boolean isDeleted;
    private long replyCount;
    private long likeCount;
    private boolean isLikedByCurrentUser;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
