package project.kconnecta.user.backend.feature.collection.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.collection.entity.SavedCollection;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CollectionResponse {

    private UUID id;
    private String name;
    private String thumbnail;
    private long itemCount;
    private LocalDateTime createdAt;

    public static CollectionResponse from(SavedCollection col, long itemCount) {
        return CollectionResponse.builder()
                .id(col.getId())
                .name(col.getName())
                .thumbnail(col.getThumbnailUrl())
                .itemCount(itemCount)
                .createdAt(col.getCreatedAt())
                .build();
    }
}
