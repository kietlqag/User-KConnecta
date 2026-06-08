package project.kconnecta.user.backend.feature.group.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateGroupDescriptionRequest {

    @NotNull
    private UUID requesterId;

    @Size(max = 2000)
    private String description;
}
