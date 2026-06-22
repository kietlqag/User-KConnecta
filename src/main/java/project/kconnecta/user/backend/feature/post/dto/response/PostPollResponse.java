package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class PostPollResponse {
    private UUID id;
    private boolean allowMultiple;
    private boolean allowAddOptions;
    private List<PostPollOptionResponse> options;
    private List<UUID> myVotedOptionIds;
    private long totalVotes;
}
