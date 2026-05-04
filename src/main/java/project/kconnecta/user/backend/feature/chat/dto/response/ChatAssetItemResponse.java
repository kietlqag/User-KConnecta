package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatAssetItemResponse {
    private String id;
    private String type;
    private String url;
    private String label;
    private String meta;
    private LocalDateTime createdAt;
}

