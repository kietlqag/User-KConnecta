package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VideoMessageUploadResponse {
    private String videoUrl;
    private String mimeType;
    private Long fileSizeBytes;
    private Integer durationSec;
}
