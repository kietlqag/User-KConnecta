package project.kconnecta.user.backend.feature.friend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
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
import project.kconnecta.user.backend.feature.notification.entity.enums.NotificationType;
import project.kconnecta.user.backend.feature.notification.event.NotificationEventPublisher;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendServiceImpl implements FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final NotificationEventPublisher notificationEventPublisher;

    @Override
    public List<FriendResponse> getFriends(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatusWithUsers(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendBirthdayResponse> getFriendBirthdays(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatusWithUsers(userId, FriendshipStatus.ACCEPTED)
                .stream()
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
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendResponse> getSuggestions(UUID userId) {
        // BFS Level 1: current user's accepted friends
        Set<UUID> myFriendIds = new HashSet<>(
                friendshipRepository.findFriendIdsByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED));

        // All IDs to exclude: friends, pending sent/received, and self
        Set<UUID> excluded = new HashSet<>(myFriendIds);
        excluded.addAll(friendshipRepository.findAddresseeIdsByRequesterId(userId));
        excluded.addAll(friendshipRepository.findRequesterIdsByAddresseeId(userId));
        excluded.add(userId);

        // Friends-of-friends: one query for all edges touching my friends, then count mutuals in memory
        Map<UUID, Integer> mutualCountMap = new HashMap<>();
        if (!myFriendIds.isEmpty()) {
            for (Object[] pair : friendshipRepository.findFriendshipPairsInvolvingUsers(
                    new ArrayList<>(myFriendIds),
                    FriendshipStatus.ACCEPTED)) {
                UUID requesterId = (UUID) pair[0];
                UUID addresseeId = (UUID) pair[1];
                UUID candidate;
                if (myFriendIds.contains(requesterId) && !myFriendIds.contains(addresseeId)) {
                    candidate = addresseeId;
                } else if (myFriendIds.contains(addresseeId) && !myFriendIds.contains(requesterId)) {
                    candidate = requesterId;
                } else {
                    continue;
                }
                if (!excluded.contains(candidate)) {
                    mutualCountMap.merge(candidate, 1, Integer::sum);
                }
            }
        }

        // Sort candidates by mutual friend count descending, take top 20
        List<UUID> sortedCandidates = mutualCountMap.entrySet().stream()
                .sorted(Map.Entry.<UUID, Integer>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .limit(20)
                .toList();

        List<FriendResponse> result = new ArrayList<>();

        if (!sortedCandidates.isEmpty()) {
            Map<UUID, User> userMap = userRepository.findAllById(sortedCandidates).stream()
                    .collect(Collectors.toMap(User::getId, u -> u));

            sortedCandidates.stream()
                    .filter(userMap::containsKey)
                    .map(id -> {
                        User u = userMap.get(id);
                        return FriendResponse.builder()
                                .friendshipId(null)
                                .userId(u.getId())
                                .username(u.getUsername())
                                .fullName(u.getFullName())
                                .avatarUrl(u.getAvatarUrl())
                                .mutualFriends(mutualCountMap.get(id))
                                .status(null)
                                .createdAt(null)
                                .build();
                    })
                    .forEach(result::add);
        }

        // Fallback: if BFS yields fewer than 10 results, fill with strangers (no mutual friends)
        if (result.size() < 10) {
            Set<UUID> fullyExcluded = new HashSet<>(excluded);
            result.forEach(r -> fullyExcluded.add(r.getUserId()));

            int needed = 10 - result.size();
            userRepository.findSuggestionsExcluding(fullyExcluded, PageRequest.of(0, needed))
                    .forEach(u -> result.add(FriendResponse.builder()
                            .friendshipId(null)
                            .userId(u.getId())
                            .username(u.getUsername())
                            .fullName(u.getFullName())
                            .avatarUrl(u.getAvatarUrl())
                            .mutualFriends(0)
                            .status(null)
                            .createdAt(null)
                            .build()));
        }

        return result;
    }

    @Override
    public FriendResponse sendFriendRequest(UUID requesterId, UUID addresseeId) {
        if (requesterId.equals(addresseeId)) {
            throw new IllegalArgumentException("Cannot send friend request to yourself");
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
                requester.getFullName() + " đã gửi cho bạn lời mời kết bạn",
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
                addressee.getFullName() + " đã chấp nhận lời mời kết bạn của bạn",
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
