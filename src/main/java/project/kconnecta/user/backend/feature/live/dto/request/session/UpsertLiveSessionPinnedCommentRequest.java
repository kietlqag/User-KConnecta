package project.kconnecta.user.backend.feature.live.dto.request.session;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UpsertLiveSessionPinnedCommentRequest {
    private UUID commentId;
}
