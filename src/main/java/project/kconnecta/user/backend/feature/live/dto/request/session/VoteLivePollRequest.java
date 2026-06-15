package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VoteLivePollRequest {
    @NotNull
    @Min(0)
    private Integer optionIndex;
}
