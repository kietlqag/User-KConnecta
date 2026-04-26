package project.kconnecta.user.backend.feature.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;

import java.util.UUID;

@Data
public class CreateGroupRequest {

    @NotNull
    private UUID creatorId;

    @NotBlank
    private String name;

    private String description;

    private String coverPhotoUrl;

    @NotNull
    private GroupPrivacy privacy;
}
