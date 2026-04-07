package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostReactionDetailsResponse {
    private UUID postId;
    private long totalCount;
    private List<PostReactionCountResponse> counts;
    private List<PostReactionUserResponse> reactions;
}
