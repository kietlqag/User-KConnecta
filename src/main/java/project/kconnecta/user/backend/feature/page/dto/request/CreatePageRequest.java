package project.kconnecta.user.backend.feature.page.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePageRequest {

    @NotNull
    private UUID creatorId;

    @NotBlank
    private String name;

    private String description;

    private String avatarUrl;
}

