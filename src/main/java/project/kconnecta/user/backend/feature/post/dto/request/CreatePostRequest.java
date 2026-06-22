package project.kconnecta.user.backend.feature.post.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import project.kconnecta.user.backend.feature.post.entity.enums.PostPrivacy;
import project.kconnecta.user.backend.feature.post.entity.enums.PostStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreatePostRequest {

    private UUID authorId;

    private UUID groupId;

    private UUID pageId;

    // Set when sharing a group to the feed — the group being shared.
    private UUID sharedGroupId;

    private String content;
    private String imageUrl;

    private PostPrivacy privacy;

    private PostStatus status;

    private LocalDateTime scheduledAt;

    @Size(max = 255)
    private String locationText;

    @Size(max = 100)
    private String backgroundStyle;

    private Boolean promoted;

    @Valid
    private List<CreatePostMediaRequest> media;

    private List<UUID> excludedUserIds;

    private List<UUID> allowedUserIds;

    private List<UUID> taggedUserIds;

    @Valid
    private CreatePostPollRequest poll;
}
