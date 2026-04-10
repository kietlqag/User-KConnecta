package project.kconnecta.user.backend.feature.friend.dto.response;

import lombok.Builder;
import lombok.Data;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class FriendResponse {
    private UUID friendshipId;
    private UUID userId;
    private String username;
    private String fullName;
    private String avatarUrl;
    private int mutualFriends;
    private FriendshipStatus status;
    private LocalDateTime createdAt;
}
