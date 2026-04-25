package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VoiceMessageUploadResponse {
    private String audioUrl;
    private String mimeType;
    private Long fileSizeBytes;
    private Integer durationSec;
}
