package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatAssetPageResponse {
    private List<ChatAssetItemResponse> items;
    private boolean hasMore;
    private LocalDateTime nextBeforeCreatedAt;
}

