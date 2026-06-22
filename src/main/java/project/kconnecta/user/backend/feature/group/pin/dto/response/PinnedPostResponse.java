package project.kconnecta.user.backend.feature.group.pin.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.FeaturedType;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinType;
import project.kconnecta.user.backend.feature.post.dto.response.PostResponse;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PinnedPostResponse {
    private UUID pinId;
    private UUID groupId;
    private FeaturedType featuredType;
    private PinType pinType;
    private PinPriority priority;
    private int displayOrder;
    private LocalDateTime pinnedAt;
    private LocalDateTime expiresAt;
    private String reason;
    private PinnedByUser pinnedBy;
    private boolean read;        // bài ghim này hiện user đã đọc chưa
    private PostResponse post;   // payload bài viết (tái dùng PostResponse hiện có)

    @Data
    @Builder
    public static class PinnedByUser {
        private UUID id;
        private String fullName;
        private String avatarUrl;
    }
}
