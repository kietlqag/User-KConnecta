package project.kconnecta.user.backend.feature.collection.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCollectionRequest {

    @NotNull
    private UUID userId;

    @NotBlank
    @Size(max = 50)
    private String name;
}
