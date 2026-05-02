package project.kconnecta.user.backend.feature.chat.dto.request;

import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.chat.dto.CallParticipantInfo;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CallSignalRequest {
    private UUID receiverId;
    private UUID conversationId;
    private String conversationName;
    private String conversationAvatarUrl;
    private UUID callId;
    private String type;
    private String mediaType;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
    private Integer durationSec;
    private List<CallParticipantInfo> groupParticipants;
    private UUID participantUserId;
    private String participantStatus;
    private Boolean participantMicEnabled;
    private Boolean participantCameraEnabled;
}
