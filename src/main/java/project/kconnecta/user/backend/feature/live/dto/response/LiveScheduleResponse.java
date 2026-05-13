package project.kconnecta.user.backend.feature.live.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class LiveScheduleResponse {
    private UUID id;
    private UUID userId;
    private LiveStartMode startMode;
    private LocalDateTime scheduledAt;
    private LocalDateTime effectiveStartAt;
    private LocalDateTime updatedAt;
}

