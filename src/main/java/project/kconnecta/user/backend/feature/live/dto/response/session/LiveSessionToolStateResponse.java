package project.kconnecta.user.backend.feature.live.dto.response.session;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class LiveSessionToolStateResponse {
    private UUID sessionId;
    private boolean pollEnabled;
    private String pollQuestion;
    private List<String> pollOptions;
    private List<Long> pollOptionCounts;
    private Integer myPollOptionIndex;
    private String featuredLinkTitle;
    private String featuredLinkUrl;
    private String hostNotice;
    private UUID pinnedCommentId;
    private LocalDateTime updatedAt;
}
