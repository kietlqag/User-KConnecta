package project.kconnecta.user.backend.feature.group.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.group.dto.request.CreateGroupRequest;
import project.kconnecta.user.backend.feature.group.dto.response.GroupMemberResponse;
import project.kconnecta.user.backend.feature.group.dto.response.GroupResponse;
import project.kconnecta.user.backend.feature.group.entity.Group;
import project.kconnecta.user.backend.feature.group.entity.GroupMember;
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberRole;
import project.kconnecta.user.backend.feature.group.repository.GroupMemberRepository;
import project.kconnecta.user.backend.feature.group.repository.GroupRepository;
import project.kconnecta.user.backend.feature.group.service.GroupService;
import project.kconnecta.user.backend.feature.notification.service.NotificationService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getJoinedGroups(UUID userId) {
        return groupMemberRepository.findAllByUserId(userId).stream()
                .map(gm -> toResponse(gm.getGroup(), gm.getRole()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getManagedGroups(UUID userId) {
        return groupMemberRepository.findAllByUserIdAndRole(userId, GroupMemberRole.ADMIN).stream()
                .map(gm -> toResponse(gm.getGroup(), gm.getRole()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupResponse getGroupById(UUID groupId, UUID currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        GroupMemberRole role = groupMemberRepository.findAllByUserId(currentUserId).stream()
                .filter(gm -> gm.getGroup().getId().equals(groupId))
                .map(GroupMember::getRole)
                .findFirst()
                .orElse(null);

        return toResponse(group, role);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getGroupMembers(UUID groupId) {
        return groupMemberRepository.findAllByGroupId(groupId).stream()
                .map(gm -> GroupMemberResponse.builder()
                        .id(gm.getId())
                        .userId(gm.getUser().getId())
                        .fullName(gm.getUser().getFullName())
                        .avatarUrl(gm.getUser().getAvatarUrl())
                        .role(gm.getRole())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getDiscoverGroups(UUID userId) {
        return groupRepository.findGroupsNotJoinedByUser(userId).stream()
                .map(g -> toResponse(g, null))
                .toList();
    }

    @Override
    public GroupResponse joinGroup(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean alreadyJoined = groupMemberRepository.findAllByUserId(userId).stream()
                .anyMatch(gm -> gm.getGroup().getId().equals(groupId));

        if (alreadyJoined) {
            throw new ValidationException("User already joined this group");
        }

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(user)
                .role(GroupMemberRole.MEMBER)
                .build();

        groupMemberRepository.save(member);

        return toResponse(group, GroupMemberRole.MEMBER);
    }

    @Override
    @Transactional
    public void inviteFriends(UUID groupId, UUID senderId, List<UUID> userIds) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));

        for (UUID userId : userIds) {
            // Check if already a member
            boolean alreadyMember = groupMemberRepository.findAllByGroupId(groupId).stream()
                    .anyMatch(gm -> gm.getUser().getId().equals(userId));

            if (!alreadyMember) {
                String content = sender.getFullName() + " đã mời bạn tham gia nhóm " + group.getName();
                notificationService.createNotification(
                        userId, 
                        senderId, 
                        NotificationType.GROUP_INVITE, 
                        content, 
                        groupId
                );
            }
        }
    }

    @Override
    @Transactional
    public void acceptInvite(UUID groupId, UUID notificationId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean alreadyMember = groupMemberRepository.findAllByGroupId(groupId).stream()
                .anyMatch(gm -> gm.getUser().getId().equals(userId));

        if (!alreadyMember) {
            GroupMember member = GroupMember.builder()
                    .group(group)
                    .user(user)
                    .role(GroupMemberRole.MEMBER)
                    .build();
            groupMemberRepository.save(member);
        }

        notificationService.markAsActioned(notificationId);
    }

    @Override
    @Transactional
    public void rejectInvite(UUID groupId, UUID notificationId) {
        notificationService.markAsActioned(notificationId);
    }

    @Override
    public GroupResponse createGroup(CreateGroupRequest request) {
        User creator = userRepository.findById(request.getCreatorId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getCreatorId()));

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .coverPhotoUrl(request.getCoverPhotoUrl())
                .privacy(request.getPrivacy())
                .createdBy(creator)
                .build();

        group = groupRepository.save(group);

        GroupMember adminMember = GroupMember.builder()
                .group(group)
                .user(creator)
                .role(GroupMemberRole.ADMIN)
                .build();

        groupMemberRepository.save(adminMember);

        return toResponse(group, GroupMemberRole.ADMIN);
    }

    @Override
    public GroupResponse updateCoverPhoto(UUID groupId, MultipartFile file) {
        validateImage(file);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        String oldCoverUrl = group.getCoverPhotoUrl();
        group.setCoverPhotoUrl(cloudinaryService.uploadCover(file));
        Group saved = groupRepository.save(group);

        if (oldCoverUrl != null && !oldCoverUrl.isBlank()) {
            cloudinaryService.deleteImageByUrl(oldCoverUrl);
        }

        return toResponse(saved, GroupMemberRole.ADMIN); // Assuming caller is admin or role is irrelevant for this response
    }

    @Override
    public void removeCoverPhoto(UUID groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        String oldCoverUrl = group.getCoverPhotoUrl();
        if (oldCoverUrl != null && !oldCoverUrl.isBlank()) {
            cloudinaryService.deleteImageByUrl(oldCoverUrl);
        }

        group.setCoverPhotoUrl(null);
        groupRepository.save(group);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("image/jpeg")
                        && !contentType.equals("image/png")
                        && !contentType.equals("image/webp"))) {
            throw new ValidationException("Only JPG, PNG, WEBP are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ValidationException("File size must be less than 5MB");
        }
    }

    private GroupResponse toResponse(Group group, GroupMemberRole role) {
        int memberCount = groupMemberRepository.countByGroupId(group.getId());
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .coverPhotoUrl(group.getCoverPhotoUrl())
                .privacy(group.getPrivacy())
                .memberCount(memberCount)
                .role(role)
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
