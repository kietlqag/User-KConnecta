package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

import java.util.UUID;

@Getter
@Setter
public class AddReactionRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private ReactionType reactionType;
}
