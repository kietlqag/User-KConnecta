package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class LiveSessionStatsResponse {
    private UUID sessionId;
    private int viewerCount;
    private int peakViewerCount;
    private long totalReactionCount;
}
