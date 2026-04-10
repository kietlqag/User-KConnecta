package project.kconnecta.user.backend.feature.friend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.DuplicateResourceException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.feature.friend.dto.response.FriendResponse;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.friend.service.FriendService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendServiceImpl implements FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Override
    public List<FriendResponse> getFriends(UUID userId) {
        return friendshipRepository.findAllByUserIdAndStatus(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendResponse> getFriendRequests(UUID userId) {
        return friendshipRepository.findAllByAddresseeIdAndStatus(userId, FriendshipStatus.PENDING)
                .stream()
                .map(f -> mapToResponse(f, userId))
                .toList();
    }

    @Override
    public List<FriendResponse> getSuggestions(UUID userId) {
        Set<UUID> relatedIds = new HashSet<>();
        relatedIds.addAll(friendshipRepository.findAddresseeIdsByRequesterId(userId));
        relatedIds.addAll(friendshipRepository.findRequesterIdsByAddresseeId(userId));
        relatedIds.add(userId);

        return userRepository.findAll(PageRequest.of(0, 20))
                .stream()
                .filter(u -> !relatedIds.contains(u.getId()))
                .map(u -> FriendResponse.builder()
                        .friendshipId(null)
                        .userId(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .avatarUrl(u.getAvatarUrl())
                        .mutualFriends(0)
                        .status(null)
                        .createdAt(null)
                        .build())
                .toList();
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

        return mapToResponse(friendshipRepository.save(friendship), requesterId);
    }

    @Override
    public FriendResponse acceptFriendRequest(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found: " + friendshipId));

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        return mapToResponse(friendshipRepository.save(friendship), friendship.getAddressee().getId());
    }

    @Override
    public void deleteFriendship(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found: " + friendshipId));
        friendshipRepository.delete(friendship);
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
