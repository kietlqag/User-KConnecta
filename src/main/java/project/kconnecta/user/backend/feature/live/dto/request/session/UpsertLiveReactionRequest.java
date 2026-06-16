package project.kconnecta.user.backend.feature.live.dto.request.session;

import lombok.Data;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveReactionType;

@Data
public class UpsertLiveReactionRequest {
    private LiveReactionType reactionType;
}
