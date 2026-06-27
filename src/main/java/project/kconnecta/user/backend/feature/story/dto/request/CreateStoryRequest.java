package project.kconnecta.user.backend.feature.story.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.feature.story.entity.enums.StoryPrivacy;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateStoryRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    private MultipartFile image;
    
    private String backgroundColor;
    private String textContent;
    private String textColor;
    private Integer textSize;
    private Double textPosX;
    private Double textPosY;
    private String stickers;
    private String musicTrackId;
    private String altText;
    private String sharedImageUrl;
    private UUID linkedPostId;

    /** Story lifetime in hours. Allowed: 3, 6, 12, 24. Defaults to 24 when omitted. */
    private Integer durationHours;

    private StoryPrivacy privacy;

    private List<UUID> allowedUserIds;
}
