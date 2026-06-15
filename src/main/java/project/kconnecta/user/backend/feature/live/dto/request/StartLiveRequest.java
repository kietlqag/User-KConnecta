package project.kconnecta.user.backend.feature.live.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import project.kconnecta.user.backend.feature.live.entity.enums.LiveStartMode;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class StartLiveRequest {
    @NotNull
    private UUID userId;

    private UUID groupId;

    private UUID pageId;

    @NotBlank
    @Size(min = 5, max = 255)
    private String title;

    @NotBlank
    @Size(min = 10, max = 5000)
    private String description;

    @NotNull
    private PostPrivacy privacy;

    @NotNull
    private LiveStartMode startMode;

    private LocalDateTime scheduledAt;

    @Size(max = 255)
    private String locationText;

    private List<UUID> excludedUserIds;

    private List<UUID> taggedUserIds;
}
