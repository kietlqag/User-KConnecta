package project.kconnecta.user.backend.feature.collection.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddCollectionItemRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private UUID postId;
}
