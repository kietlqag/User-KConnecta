package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;
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
    /** Reaction của người đang xem (LIKE/LOVE/...), null nếu chưa thả. */
    private String myReaction;
    /** Số lượng theo từng loại reaction: {"LIKE": 3, "LOVE": 1}. */
    private Map<String, Long> reactionCounts;
    private String content;
    private String imageUrl;
    private String moderationStatus;
    private String moderationFailReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
