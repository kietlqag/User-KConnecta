package project.kconnecta.user.backend.feature.group.pin.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinHistoryAction;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PinHistoryResponse {
    private UUID id;
    private UUID postId;
    private PinHistoryAction action;
    private UUID actorId;
    private String reason;
    private LocalDateTime createdAt;
}
