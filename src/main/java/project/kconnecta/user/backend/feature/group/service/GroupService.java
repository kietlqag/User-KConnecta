package project.kconnecta.user.backend.feature.group.service;

import project.kconnecta.user.backend.feature.group.dto.request.CreateGroupRequest;
import project.kconnecta.user.backend.feature.group.dto.response.GroupMemberResponse;
import project.kconnecta.user.backend.feature.group.dto.response.GroupResponse;

import java.util.List;
import java.util.UUID;

public interface GroupService {
    List<GroupResponse> getJoinedGroups(UUID userId);
    List<GroupResponse> getManagedGroups(UUID userId);
    GroupResponse getGroupById(UUID groupId, UUID currentUserId);
    List<GroupMemberResponse> getGroupMembers(UUID groupId);
    List<GroupResponse> getDiscoverGroups(UUID userId);
    GroupResponse joinGroup(UUID groupId, UUID userId);
    void inviteFriends(UUID groupId, UUID senderId, List<UUID> userIds);
    void acceptInvite(UUID groupId, UUID notificationId, UUID userId);
    void rejectInvite(UUID groupId, UUID notificationId);
    GroupResponse createGroup(CreateGroupRequest request);
    GroupResponse updateCoverPhoto(UUID groupId, org.springframework.web.multipart.MultipartFile file);
    void removeCoverPhoto(UUID groupId);
    void removeMember(UUID groupId, UUID userId, UUID requesterId);
}
