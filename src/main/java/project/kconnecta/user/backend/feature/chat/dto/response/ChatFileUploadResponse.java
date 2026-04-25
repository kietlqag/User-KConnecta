package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatFileUploadResponse {
    private String fileUrl;
    private String fileName;
    private String mimeType;
    private long fileSizeBytes;
}
