package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveReactionType;

import java.util.UUID;

@Getter
@Builder
public class LiveSessionReactionResponse {
    private UUID sessionId;
    private UUID userId;
    private LiveReactionType reactionType;
}
