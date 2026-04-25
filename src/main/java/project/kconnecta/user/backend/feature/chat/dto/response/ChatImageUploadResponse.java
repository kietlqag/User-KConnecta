package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatImageUploadResponse {
    private String imageUrl;
    private String mimeType;
    private Long fileSizeBytes;
}
