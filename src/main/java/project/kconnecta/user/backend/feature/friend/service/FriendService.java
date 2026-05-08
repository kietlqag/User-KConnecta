package project.kconnecta.user.backend.feature.friend.service;

import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendshipStatusResponse;

import java.util.List;
import java.util.UUID;

public interface FriendService {
    List<FriendResponse> getFriends(UUID userId);
    List<FriendResponse> getFriendRequests(UUID userId);
    List<FriendResponse> getSuggestions(UUID userId);
    FriendResponse sendFriendRequest(UUID requesterId, UUID addresseeId);
    FriendResponse acceptFriendRequest(UUID friendshipId);
    void deleteFriendship(UUID friendshipId);
    FriendshipStatusResponse getStatus(UUID meId, UUID targetId);
}
