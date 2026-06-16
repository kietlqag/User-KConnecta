package project.kconnecta.user.backend.feature.story.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class StoryResponse {
    private UUID id;
    private UUID userId;
    private String username;
    private String userFullName;
    private String userAvatarUrl;
    
    private String imageUrl;
    private String backgroundColor;
    private String textContent;
    private String textColor;
    private Integer textSize;
    private Double textPosX;
    private Double textPosY;
    private String musicTrackId;
    private String altText;
    private UUID linkedPostId;
    
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean active;
}
