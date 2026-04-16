package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallSignalResponse {
    private UUID callId;
    private UUID fromUserId;
    private UUID toUserId;
    private String fromUsername;
    private String type;
    private String mediaType;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
    private LocalDateTime createdAt;
    private String sessionStatus;
    private String sessionMediaType;
    private LocalDateTime sessionStartedAt;
    private LocalDateTime sessionAnsweredAt;
    private LocalDateTime sessionEndedAt;
    private Integer sessionDurationSec;
}
