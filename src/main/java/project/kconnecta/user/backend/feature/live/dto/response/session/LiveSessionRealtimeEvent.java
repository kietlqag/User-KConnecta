package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveReactionType;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveSessionStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LiveSessionRealtimeEvent {
    private String type;
    private UUID sessionId;
    private LiveSessionStatus status;
    private Integer viewerCount;
    private Integer peakViewerCount;
    private Long totalReactionCount;
    private UUID reactedUserId;
    private LiveReactionType reactionType;
    private LiveSessionResponse session;
    private LiveSessionToolStateResponse tools;
    private LocalDateTime emittedAt;
}
