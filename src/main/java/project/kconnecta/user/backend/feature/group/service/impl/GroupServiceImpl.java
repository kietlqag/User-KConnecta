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
import project.kconnecta.user.backend.feature.group.entity.enums.GroupMemberStatus;
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
                .map(gm -> toResponse(gm.getGroup(), gm.getRole(), gm.getStatus()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getManagedGroups(UUID userId) {
        return groupMemberRepository.findAllByUserIdAndRole(userId, GroupMemberRole.ADMIN).stream()
                .map(gm -> toResponse(gm.getGroup(), gm.getRole(), gm.getStatus()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupResponse getGroupById(UUID groupId, UUID currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElse(null);

        GroupMemberRole role = member != null ? member.getRole() : null;
        GroupMemberStatus status = member != null ? member.getStatus() : null;

        return toResponse(group, role, status);
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
                .map(g -> toResponse(g, null, null))
                .toList();
    }

    @Override
    public GroupResponse joinGroup(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean alreadyJoined = groupMemberRepository.findByGroupIdAndUserId(groupId, userId).isPresent();
        if (alreadyJoined) {
            throw new ValidationException("Bạn đã tham gia hoặc đã gửi yêu cầu tham gia nhóm này rồi.");
        }

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(user)
                .role(GroupMemberRole.MEMBER)
                .status(GroupMemberStatus.PENDING)
                .build();

        groupMemberRepository.save(member);

        // Notify admins
        List<GroupMember> admins = groupMemberRepository.findAllByGroupId(groupId).stream()
                .filter(gm -> gm.getRole() == GroupMemberRole.ADMIN)
                .toList();

        for (GroupMember admin : admins) {
            notificationService.createNotification(
                    admin.getUser().getId(),
                    userId,
                    NotificationType.GROUP_JOIN_REQUEST,
                    user.getFullName() + " đã yêu cầu tham gia nhóm " + group.getName() + ".",
                    groupId
            );
        }

        return toResponse(group, GroupMemberRole.MEMBER, GroupMemberStatus.PENDING);
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
                    .status(GroupMemberStatus.APPROVED)
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
                .status(GroupMemberStatus.APPROVED)
                .build();

        groupMemberRepository.save(adminMember);

        return toResponse(group, GroupMemberRole.ADMIN, GroupMemberStatus.APPROVED);
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

        return toResponse(saved, GroupMemberRole.ADMIN, GroupMemberStatus.APPROVED); // Assuming caller is admin or role is irrelevant for this response
    }

    @Override
    public GroupResponse updateDescription(UUID groupId, UUID requesterId, String description) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        GroupMember requester = groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> new ValidationException("Requester is not a member of this group"));
        if (requester.getRole() != GroupMemberRole.ADMIN) {
            throw new ValidationException("Only admins can update group description");
        }

        String trimmed = description == null ? null : description.trim();
        group.setDescription(trimmed == null || trimmed.isEmpty() ? null : trimmed);
        Group saved = groupRepository.save(group);
        return toResponse(saved, GroupMemberRole.ADMIN, GroupMemberStatus.APPROVED);
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

    @Override
    @Transactional
    public void removeMember(UUID groupId, UUID userId, UUID requesterId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        // Check requester is an admin
        GroupMember requester = groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> new ValidationException("Requester is not a member of this group"));
        if (requester.getRole() != GroupMemberRole.ADMIN) {
            throw new ValidationException("Only admins can remove members");
        }

        // Find the member to remove
        GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in group"));

        // Cannot remove another admin
        if (target.getRole() == GroupMemberRole.ADMIN) {
            throw new ValidationException("Cannot remove an admin from the group");
        }

        groupMemberRepository.delete(target);
    }

    @Override
    @Transactional
    public void leaveGroup(UUID groupId, UUID userId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this group"));

        if (member.getRole() == GroupMemberRole.ADMIN) {
            long adminCount = groupMemberRepository.countByGroupIdAndRole(groupId, GroupMemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new ValidationException("Bạn là quản trị viên duy nhất. Hãy chỉ định quản trị viên khác trước khi rời nhóm.");
            }
        }

        groupMemberRepository.delete(member);
    }

    private GroupResponse toResponse(Group group, GroupMemberRole role, GroupMemberStatus status) {
        int memberCount = groupMemberRepository.countByGroupId(group.getId());
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .coverPhotoUrl(group.getCoverPhotoUrl())
                .privacy(group.getPrivacy())
                .memberCount(memberCount)
                .role(role)
                .status(status)
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getJoinRequests(UUID groupId, UUID adminId) {
        GroupMember requester = groupMemberRepository.findByGroupIdAndUserId(groupId, adminId)
                .orElseThrow(() -> new ValidationException("Requester is not a member of this group"));
        if (requester.getRole() != GroupMemberRole.ADMIN || requester.getStatus() != GroupMemberStatus.APPROVED) {
            throw new ValidationException("Only approved admins can view join requests");
        }

        return groupMemberRepository.findPendingRequestsByGroupId(groupId).stream()
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
    public void approveJoinRequest(UUID groupId, UUID targetUserId, UUID adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, adminId)
                .orElseThrow(() -> new ValidationException("Admin is not a member of this group"));
        if (admin.getRole() != GroupMemberRole.ADMIN || admin.getStatus() != GroupMemberStatus.APPROVED) {
            throw new ValidationException("Only approved admins can approve join requests");
        }

        GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found"));

        if (target.getStatus() == GroupMemberStatus.APPROVED) {
            return;
        }

        target.setStatus(GroupMemberStatus.APPROVED);
        groupMemberRepository.save(target);

        // Notify target user
        notificationService.createNotification(
                targetUserId,
                adminId,
                NotificationType.GROUP_ACTIVITY,
                "Yêu cầu tham gia nhóm " + group.getName() + " của bạn đã được phê duyệt.",
                groupId
        );
    }

    @Override
    public void rejectJoinRequest(UUID groupId, UUID targetUserId, UUID adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        GroupMember admin = groupMemberRepository.findByGroupIdAndUserId(groupId, adminId)
                .orElseThrow(() -> new ValidationException("Admin is not a member of this group"));
        if (admin.getRole() != GroupMemberRole.ADMIN || admin.getStatus() != GroupMemberStatus.APPROVED) {
            throw new ValidationException("Only approved admins can reject join requests");
        }

        GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found"));

        if (target.getStatus() == GroupMemberStatus.APPROVED) {
            throw new ValidationException("Không thể từ chối thành viên đã tham gia nhóm.");
        }

        groupMemberRepository.delete(target);

        notificationService.createNotification(
                targetUserId,
                adminId,
                NotificationType.GROUP_ACTIVITY,
                "Yêu cầu tham gia nhóm " + group.getName() + " của bạn đã bị từ chối.",
                groupId
        );
    }
}
