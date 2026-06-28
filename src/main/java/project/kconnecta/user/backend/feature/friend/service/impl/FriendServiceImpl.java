package project.kconnecta.user.backend.feature.friend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.settings.service.SettingsService;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.service.ActivityLogService;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendBirthdayResponse;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendshipStatusResponse;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.friend.service.FriendService;
import project.kconnecta.user.backend.feature.friend.service.FriendSuggestionService;
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendServiceImpl implements FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final NotificationEventPublisher notificationEventPublisher;
    private final SettingsService settingsService;
    private final FriendSuggestionService friendSuggestionService;

    @Override
    public List<FriendResponse> getFriends(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatusWithUsers(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .filter(f -> !f.getRequester().getId().equals(f.getAddressee().getId()))
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendBirthdayResponse> getFriendBirthdays(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatusWithUsers(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .filter(f -> !f.getRequester().getId().equals(f.getAddressee().getId()))
                .map(f -> {
                    User other = f.getRequester().getId().equals(userId)
                            ? f.getAddressee()
                            : f.getRequester();
                    if (other.getDateOfBirth() == null) {
                        return null;
                    }
                    return FriendBirthdayResponse.builder()
                            .friendshipId(f.getId())
                            .userId(other.getId())
                            .fullName(other.getFullName())
                            .avatarUrl(other.getAvatarUrl())
                            .dateOfBirth(other.getDateOfBirth())
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public List<FriendResponse> getFriendRequests(UUID userId) {
        return friendshipRepository.findAllByAddresseeIdAndStatusWithUsers(userId, FriendshipStatus.PENDING)
                .stream()
                .filter(f -> !f.getRequester().getId().equals(f.getAddressee().getId()))
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendResponse> getSuggestions(UUID userId) {
        return friendSuggestionService.getSuggestions(userId);
    }

    @Override
    public FriendResponse sendFriendRequest(UUID requesterId, UUID addresseeId) {
        if (requesterId.equals(addresseeId)) {
            throw new BadRequestException("Khong the gui loi moi ket ban cho chinh minh");
        }

        if (settingsService.isBlockedEitherDirection(requesterId, addresseeId)) {
            throw new ForbiddenException("Khong the gui loi moi ket ban");
        }

        friendshipRepository.findBetweenUsers(requesterId, addresseeId).ifPresent(f -> {
            throw new DuplicateResourceException("Friendship already exists");
        });

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + requesterId));
        User addressee = userRepository.findById(addresseeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + addresseeId));

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .addressee(addressee)
                .status(FriendshipStatus.PENDING)
                .build();

        Friendship saved = friendshipRepository.save(friendship);
        activityLogService.log(requester.getId(), requester.getUsername(), ActivityLogType.FRIEND_REQUEST_SENT,
                "{\"targetUserId\":\"" + addresseeId + "\"}");
        notificationEventPublisher.publish(
                requesterId,
                addresseeId,
                NotificationType.FRIEND_REQUEST,
                "đã gửi cho bạn lời mời kết bạn",
                saved.getId()
        );
        return mapToResponse(saved, requesterId);
    }

    @Override
    public FriendResponse acceptFriendRequest(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found: " + friendshipId));

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        Friendship saved = friendshipRepository.save(friendship);
        User addressee = saved.getAddressee();
        User requester = saved.getRequester();
        activityLogService.log(addressee.getId(), addressee.getUsername(), ActivityLogType.FRIEND_ACCEPTED,
                "{\"requesterId\":\"" + requester.getId() + "\"}");
        notificationEventPublisher.publish(
                addressee.getId(),
                requester.getId(),
                NotificationType.FRIEND_ACCEPTED,
                "đã chấp nhận lời mời kết bạn của bạn",
                saved.getId()
        );
        return mapToResponse(saved, addressee.getId());
    }

    @Override
    public void deleteFriendship(UUID friendshipId, UUID currentUserId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found: " + friendshipId));
        UUID otherUserId = friendship.getRequester().getId().equals(currentUserId)
                ? friendship.getAddressee().getId()
                : friendship.getRequester().getId();
        friendshipRepository.delete(friendship);
        notificationEventPublisher.publish(
                currentUserId,
                otherUserId,
                NotificationType.FRIEND_REMOVED,
                null,
                null
        );
    }

    @Override
    public FriendshipStatusResponse getStatus(UUID meId, UUID targetId) {
        return friendshipRepository.findBetweenUsers(meId, targetId)
                .map(f -> FriendshipStatusResponse.builder()
                        .friendshipId(f.getId())
                        .status(f.getStatus())
                        .sentByMe(f.getRequester().getId().equals(meId))
                        .build())
                .orElse(FriendshipStatusResponse.builder()
                        .friendshipId(null)
                        .status(null)
                        .sentByMe(false)
                        .build());
    }

    private FriendResponse mapToResponse(Friendship f, UUID currentUserId) {
        User other = f.getRequester().getId().equals(currentUserId)
                ? f.getAddressee()
                : f.getRequester();

        return FriendResponse.builder()
                .friendshipId(f.getId())
                .userId(other.getId())
                .username(other.getUsername())
                .fullName(other.getFullName())
                .avatarUrl(other.getAvatarUrl())
                .mutualFriends(0)
                .status(f.getStatus())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
