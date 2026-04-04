package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.post.entity.enums.MediaType;

import java.util.UUID;

@Getter
@Builder
public class PostMediaResponse {
    private UUID id;
    private MediaType mediaType;
    private String fileUrl;
    private String thumbnailUrl;
    private Integer sortOrder;
}
