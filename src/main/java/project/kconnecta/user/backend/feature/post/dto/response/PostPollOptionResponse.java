package project.kconnecta.user.backend.feature.post.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class PostPollOptionResponse {
    private UUID id;
    private String text;
    private int sortOrder;
    private long voteCount;
    private int percentage;
}
