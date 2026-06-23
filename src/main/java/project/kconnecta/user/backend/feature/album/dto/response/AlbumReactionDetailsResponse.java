package project.kconnecta.user.backend.feature.album.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionCountResponse;
import project.kconnecta.user.backend.feature.post.dto.response.PostReactionUserResponse;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlbumReactionDetailsResponse {
    private UUID albumId;
    private long totalCount;
    private List<PostReactionCountResponse> counts;
    private List<PostReactionUserResponse> reactions;
}
