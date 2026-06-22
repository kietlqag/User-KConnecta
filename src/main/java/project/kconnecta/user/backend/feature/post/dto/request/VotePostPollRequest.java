package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VotePostPollRequest {
    private UUID optionId;
}
