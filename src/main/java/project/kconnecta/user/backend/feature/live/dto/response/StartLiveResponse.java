package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class StartLiveResponse {
    private UUID postId;
    private UUID sessionId;
    private UUID userId;
    private String title;
    private String roomName;
    private String livekitUrl;
    private String hostToken;
    private LiveStartMode startMode;
    private PostStatus postStatus;
    private LocalDateTime scheduledAt;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
