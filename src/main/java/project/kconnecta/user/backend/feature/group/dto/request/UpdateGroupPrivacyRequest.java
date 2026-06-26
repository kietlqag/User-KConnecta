package project.kconnecta.user.backend.feature.group.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupPrivacy;

@Data
public class UpdateGroupPrivacyRequest {

    @NotNull
    private GroupPrivacy privacy;
}
