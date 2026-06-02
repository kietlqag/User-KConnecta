package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpsertLivePollRequest {
    private boolean enabled;

    @Size(max = 500)
    private String question;

    @Size(max = 6)
    private List<@Size(max = 120) String> options;
}
