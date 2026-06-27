package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class UpdatePostRequest {

    private String content;

    @Valid
    private List<CreatePostMediaRequest> media;

    private PostPrivacy privacy;

    private String locationText;

    private List<UUID> excludedUserIds;

    private List<UUID> allowedUserIds;

    private List<UUID> taggedUserIds;

    private PostStatus status;

    private LocalDateTime scheduledAt;
}
