package project.kconnecta.user.backend.feature.story.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.friend.entity.Friendship;
import project.kconnecta.user.backend.feature.friend.entity.enums.FriendshipStatus;
import project.kconnecta.user.backend.feature.friend.repository.FriendshipRepository;
import project.kconnecta.user.backend.feature.story.dto.request.CreateStoryRequest;
import project.kconnecta.user.backend.feature.story.dto.response.StoryResponse;
import project.kconnecta.user.backend.feature.story.entity.Story;
import project.kconnecta.user.backend.feature.story.entity.StoryAudienceAllowance;
import project.kconnecta.user.backend.feature.story.entity.enums.StoryPrivacy;
import project.kconnecta.user.backend.feature.story.repository.StoryRepository;
import project.kconnecta.user.backend.feature.story.service.StoryService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class StoryServiceImpl implements StoryService {

    private static final int DEFAULT_DURATION_HOURS = 24;
    private static final Set<Integer> ALLOWED_DURATION_HOURS = Set.of(3, 6, 12, 24);

    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    public StoryResponse createStory(CreateStoryRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String imageUrl = null;
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            imageUrl = cloudinaryService.uploadStory(request.getImage());
        } else if (request.getSharedImageUrl() != null && !request.getSharedImageUrl().isBlank()) {
            imageUrl = request.getSharedImageUrl();
        }

        if (imageUrl == null && (request.getTextContent() == null || request.getTextContent().trim().isEmpty())) {
            throw new ValidationException("Story must have an image or text content");
        }

        StoryPrivacy privacy = request.getPrivacy() == null ? StoryPrivacy.PUBLIC : request.getPrivacy();
        List<UUID> allowedUserIds = request.getAllowedUserIds() == null
                ? List.of()
                : request.getAllowedUserIds().stream().filter(Objects::nonNull).distinct().toList();

        if (privacy != StoryPrivacy.SPECIFIC_FRIENDS && !allowedUserIds.isEmpty()) {
            throw new ValidationException("allowedUserIds is only supported for SPECIFIC_FRIENDS privacy");
        }
        if (privacy == StoryPrivacy.SPECIFIC_FRIENDS && allowedUserIds.isEmpty()) {
            throw new ValidationException("SPECIFIC_FRIENDS privacy requires at least one allowed user");
        }

        int durationHours = resolveDurationHours(request.getDurationHours());
        LocalDateTime now = LocalDateTime.now();

        Story story = Story.builder()
                .user(user)
                .imageUrl(imageUrl)
                .backgroundColor(request.getBackgroundColor())
                .textContent(request.getTextContent())
                .textColor(request.getTextColor())
                .textSize(request.getTextSize())
                .textPosX(request.getTextPosX())
                .textPosY(request.getTextPosY())
                .musicTrackId(request.getMusicTrackId())
                .altText(request.getAltText())
                .linkedPostId(request.getLinkedPostId())
                .createdAt(now)
                .expiresAt(now.plusHours(durationHours))
                .privacy(privacy)
                .build();

        attachAllowedUsers(story, user, allowedUserIds);

        story = storyRepository.save(story);
        return mapToResponse(story);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getActiveStories(UUID userId, UUID viewerId) {
        return storyRepository.findByUserIdAndExpiresAtAfterAndActiveTrueOrderByCreatedAtAsc(userId, LocalDateTime.now())
                .stream()
                .filter(story -> canViewStory(story, viewerId))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getAllActiveStories(UUID viewerId) {
        return storyRepository.findByExpiresAtAfterAndActiveTrueOrderByCreatedAtDesc(LocalDateTime.now())
                .stream()
                .filter(story -> canViewStory(story, viewerId))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void deleteStory(UUID storyId, UUID userId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found"));

        if (!story.getUser().getId().equals(userId)) {
            throw new ValidationException("You can only delete your own stories");
        }

        story.setActive(false);
        storyRepository.save(story);
    }

    private void attachAllowedUsers(Story story, User author, List<UUID> allowedUserIds) {
        for (UUID allowedUserId : allowedUserIds) {
            if (allowedUserId.equals(author.getId())) {
                continue;
            }
            if (!isAcceptedFriend(author.getId(), allowedUserId)) {
                throw new ValidationException("Allowed viewers must be your friends");
            }
            User allowedUser = userRepository.findById(allowedUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Allowed user not found"));
            story.getAudienceAllowances().add(StoryAudienceAllowance.builder()
                    .story(story)
                    .allowedUser(allowedUser)
                    .build());
        }
    }

    private boolean canViewStory(Story story, UUID viewerId) {
        UUID authorId = story.getUser().getId();
        if (viewerId != null && viewerId.equals(authorId)) {
            return true;
        }

        StoryPrivacy privacy = story.getPrivacy() == null ? StoryPrivacy.PUBLIC : story.getPrivacy();
        return switch (privacy) {
            case PUBLIC -> true;
            case ONLY_ME -> false;
            case FRIENDS -> viewerId != null && isAcceptedFriend(authorId, viewerId);
            case SPECIFIC_FRIENDS -> viewerId != null && story.getAudienceAllowances().stream()
                    .anyMatch(allowance -> allowance.getAllowedUser().getId().equals(viewerId));
        };
    }

    private boolean isAcceptedFriend(UUID userId, UUID otherUserId) {
        return friendshipRepository.findBetweenUsers(userId, otherUserId)
                .map(Friendship::getStatus)
                .filter(status -> status == FriendshipStatus.ACCEPTED)
                .isPresent();
    }

    private int resolveDurationHours(Integer durationHours) {
        if (durationHours == null) {
            return DEFAULT_DURATION_HOURS;
        }
        if (!ALLOWED_DURATION_HOURS.contains(durationHours)) {
            throw new ValidationException("Story duration must be 3, 6, 12, or 24 hours");
        }
        return durationHours;
    }

    private StoryResponse mapToResponse(Story story) {
        return StoryResponse.builder()
                .id(story.getId())
                .userId(story.getUser().getId())
                .username(story.getUser().getUsername())
                .userFullName(story.getUser().getFullName())
                .userAvatarUrl(story.getUser().getAvatarUrl())
                .imageUrl(story.getImageUrl())
                .backgroundColor(story.getBackgroundColor())
                .textContent(story.getTextContent())
                .textColor(story.getTextColor())
                .textSize(story.getTextSize())
                .textPosX(story.getTextPosX())
                .textPosY(story.getTextPosY())
                .musicTrackId(story.getMusicTrackId())
                .altText(story.getAltText())
                .linkedPostId(story.getLinkedPostId())
                .createdAt(story.getCreatedAt())
                .expiresAt(story.getExpiresAt())
                .privacy(story.getPrivacy())
                .active(story.isActive())
                .build();
    }
}
