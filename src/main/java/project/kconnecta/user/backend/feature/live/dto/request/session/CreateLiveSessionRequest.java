package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateLiveSessionRequest {
    @NotNull
    private UUID hostUserId;

    private UUID groupId;

    private UUID pageId;

    @NotBlank
    @Size(min = 5, max = 255)
    private String title;

    @Size(max = 5000)
    private String description;

    @NotNull
    private PostPrivacy privacy;

    @NotNull
    private LiveStartMode startMode;

    private LocalDateTime scheduledAt;

    @Size(max = 500)
    private String playbackUrl;

    @Size(max = 500)
    private String thumbnailUrl;
}
