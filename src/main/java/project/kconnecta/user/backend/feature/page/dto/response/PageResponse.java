package project.kconnecta.user.backend.feature.page.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PageResponse {
    private UUID id;
    private String name;
    private String description;
    private String avatarUrl;
    private UUID createdBy;
    private LocalDateTime updatedAt;
}

