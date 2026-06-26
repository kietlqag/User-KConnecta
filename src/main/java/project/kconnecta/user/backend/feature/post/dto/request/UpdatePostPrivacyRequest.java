package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class UpdatePostPrivacyRequest {
    @NotNull
    private PostPrivacy privacy;

    private List<UUID> excludedUserIds;
    private List<UUID> allowedUserIds;
}
