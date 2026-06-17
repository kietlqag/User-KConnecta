package project.kconnecta.user.backend.feature.live.dto.request.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.time.LocalDateTime;

@Data
public class UpdateScheduledLiveRequest {
    @NotBlank
    @Size(min = 5, max = 255)
    private String title;

    @NotBlank
    @Size(min = 10, max = 5000)
    private String description;

    @NotNull
    private LocalDateTime scheduledAt;

    @NotNull
    private PostPrivacy privacy;
}
