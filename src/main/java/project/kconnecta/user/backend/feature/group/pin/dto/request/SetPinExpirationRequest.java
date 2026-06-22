package project.kconnecta.user.backend.feature.group.pin.dto.request;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SetPinExpirationRequest {
    private LocalDateTime expiresAt; // null => huỷ hạn
}
