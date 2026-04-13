package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class CallRecordingResponse {
    private UUID id;
    private UUID callId;
    private UUID ownerUserId;
    private String fileUrl;
    private String recordingMediaType;
    private Boolean hasVideo;
    private String mimeType;
    private Long fileSizeBytes;
    private Integer durationSec;
    private LocalDateTime createdAt;
}
