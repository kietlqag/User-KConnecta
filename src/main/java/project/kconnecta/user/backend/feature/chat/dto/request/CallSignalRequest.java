package project.kconnecta.user.backend.feature.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CallSignalRequest {
    private UUID receiverId;
    private UUID callId;
    private String type;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
}
