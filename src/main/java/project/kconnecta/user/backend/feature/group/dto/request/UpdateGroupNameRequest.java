package project.kconnecta.user.backend.feature.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateGroupNameRequest {

    @NotNull
    private UUID requesterId;

    @NotBlank
    @Size(max = 150)
    private String name;
}
