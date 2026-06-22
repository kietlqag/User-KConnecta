package project.kconnecta.user.backend.feature.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupJoinLinkPreviewResponse {
    private UUID conversationId;
    private String conversationName;
    private String avatarUrl;
    private int memberCount;
    private boolean memberApprovalRequired;
    /** NONE | MEMBER | PENDING */
    private String membershipStatus;
}
