package project.kconnecta.user.backend.feature.live.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UpsertLiveScheduleRequest {
    @NotNull
    private UUID userId;

    @NotNull
    private LiveStartMode startMode;

    private LocalDateTime scheduledAt;
}

