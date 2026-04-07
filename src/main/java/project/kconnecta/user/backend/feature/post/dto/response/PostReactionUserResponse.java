package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostReactionUserResponse {
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private ReactionType reactionType;
    private LocalDateTime reactedAt;
}
