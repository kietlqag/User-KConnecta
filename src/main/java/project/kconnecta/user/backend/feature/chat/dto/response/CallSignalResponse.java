package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import project.kconnecta.user.backend.feature.chat.dto.CallParticipantInfo;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallSignalResponse {
    private UUID callId;
    private UUID fromUserId;
    private UUID toUserId;
    private UUID conversationId;
    private String conversationName;
    private String conversationAvatarUrl;
    private String fromUsername;
    private String type;
    private String mediaType;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
    private List<CallParticipantInfo> groupParticipants;
    private UUID participantUserId;
    private String participantStatus;
    private LocalDateTime createdAt;
    private String sessionStatus;
    private String sessionMediaType;
    private LocalDateTime sessionStartedAt;
    private LocalDateTime sessionAnsweredAt;
    private LocalDateTime sessionEndedAt;
    private Integer sessionDurationSec;
}
