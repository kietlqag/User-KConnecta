package project.kconnecta.user.backend.feature.group.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateGroupMemberApprovalRequest {

    @NotNull
    private Boolean memberApprovalRequired;
}
