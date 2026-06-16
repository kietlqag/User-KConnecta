package project.kconnecta.user.backend.feature.story.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;
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
    private String musicTrackId;
    private String altText;
    private String sharedImageUrl;
    private UUID linkedPostId;
}
