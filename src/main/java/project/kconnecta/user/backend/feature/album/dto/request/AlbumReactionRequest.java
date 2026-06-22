package project.kconnecta.user.backend.feature.album.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

@Data
public class AlbumReactionRequest {

    @NotNull
    private ReactionType reactionType;
}
