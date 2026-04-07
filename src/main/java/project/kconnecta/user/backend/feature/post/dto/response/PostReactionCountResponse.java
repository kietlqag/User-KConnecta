package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import project.kconnecta.user.backend.feature.post.entity.enums.ReactionType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostReactionCountResponse {
    private ReactionType reactionType;
    private long count;
}
