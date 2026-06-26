package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveRecordingStatus;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LiveSessionResponse {
    private UUID id;
    private UUID hostUserId;
    private String hostName;
    private String hostAvatarUrl;
    private UUID groupId;
    private UUID pageId;
    private UUID postId;
    private String title;
    private String description;
    private PostPrivacy privacy;
    private LiveStartMode startMode;
    private LocalDateTime scheduledAt;
    private LiveSessionStatus status;
    private String streamKey;
    private String roomName;
    private String playbackUrl;
    private String hlsPlaybackUrl;
    private String thumbnailUrl;
    private LiveRecordingStatus recordingStatus;
    private Integer recordingDurationSec;
    private String recordingMimeType;
    private Long recordingFileSizeBytes;
    private String recordingError;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private int viewerCount;
    private int peakViewerCount;
    private long totalReactionCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long subscriptionCount;
    private Boolean subscribedByCurrentUser;
}
