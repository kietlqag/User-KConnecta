package project.kconnecta.user.backend.feature.group.pin.dto.request;

import lombok.Data;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinPriority;
import project.kconnecta.user.backend.feature.group.pin.entity.enums.PinType;

import java.time.LocalDateTime;

@Data
public class PinPostRequest {
    private PinType pinType;          // null => NORMAL
    private PinPriority priority;     // null => NORMAL
    private String reason;            // optional
    private LocalDateTime expiresAt;  // optional
}
