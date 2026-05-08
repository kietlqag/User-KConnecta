package project.kconnecta.user.backend.feature.friend.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;

import java.util.UUID;

@Data
@Builder
public class FriendshipStatusResponse {
    private UUID friendshipId;       // null when no relationship
    private FriendshipStatus status; // null when no relationship
    private boolean sentByMe;        // true = current user sent the PENDING request
}
