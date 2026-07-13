package project.kconnecta.user.backend.feature.story.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.common.util.MediaFileSniffer;
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
import project.kconnecta.user.backend.feature.post.repository.PostReactionRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
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
    private final PostReactionRepository postReactionRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    public StoryResponse createStory(CreateStoryRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String imageUrl = null;
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            validateStoryImage(request.getImage());
            imageUrl = cloudinaryService.uploadStory(request.getImage());
        } else if (request.getSharedImageUrl() != null && !request.getSharedImageUrl().isBlank()) {
            imageUrl = request.getSharedImageUrl();
        }

        if (imageUrl == null && (request.getTextContent() == null || request.getTextContent().trim().isEmpty())) {
            throw new ValidationException("Story must have an image or text content");
        }

        StoryPrivacy privacy = request.getPrivacy() == null ? StoryPrivacy.PUBLIC : request.getPrivacy();
        if (privacy == StoryPrivacy.SPECIFIC_FRIENDS) {
            throw new ValidationException("Chỉ hỗ trợ quyền riêng tư: Công khai, Bạn bè hoặc Chỉ mình tôi");
        }
        List<UUID> allowedUserIds = request.getAllowedUserIds() == null
                ? List.of()
                : request.getAllowedUserIds().stream().filter(Objects::nonNull).distinct().toList();

        if (!allowedUserIds.isEmpty()) {
            throw new ValidationException("allowedUserIds is no longer supported");
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
                .stickers(normalizeStickersJson(request.getStickers()))
                .musicTrackId(request.getMusicTrackId())
                .altText(request.getAltText())
                .linkedPostId(request.getLinkedPostId())
                .createdAt(now)
                .expiresAt(now.plusHours(durationHours))
                .privacy(privacy)
                .build();

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
        if (viewerId == null) {
            return List.of();
        }

        // 1. Get friend IDs of the viewer
        List<UUID> friendIds = friendshipRepository.findFriendIdsByUserIdAndStatus(viewerId, FriendshipStatus.ACCEPTED);

        // 2. Fetch active stories of self and friends
        List<Story> activeStories;
        if (friendIds.isEmpty()) {
            activeStories = storyRepository.findByUserIdAndExpiresAtAfterAndActiveTrueOrderByCreatedAtAsc(viewerId, LocalDateTime.now());
        } else {
            activeStories = storyRepository.findActiveStoriesForViewer(viewerId, friendIds, LocalDateTime.now());
        }

        // 3. Construct closeness map based on reaction counts
        List<Object[]> reactionCounts = postReactionRepository.countReactionsByAuthorForUser(viewerId);
        Map<UUID, Long> closenessMap = new HashMap<>();
        for (Object[] row : reactionCounts) {
            if (row[0] != null && row[1] != null) {
                closenessMap.put((UUID) row[0], (Long) row[1]);
            }
        }

        // 4. Filter by privacy visibility and map to response
        List<StoryResponse> responses = activeStories.stream()
                .filter(story -> canViewStory(story, viewerId))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        // 5. Sort stories: self first, then closeness count desc, then createdAt desc
        responses.sort((a, b) -> {
            if (a.getUserId().equals(viewerId) && !b.getUserId().equals(viewerId)) {
                return -1;
            }
            if (!a.getUserId().equals(viewerId) && b.getUserId().equals(viewerId)) {
                return 1;
            }
            if (a.getUserId().equals(b.getUserId())) {
                // If same user, sort by createdAt desc
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            }
            long scoreA = closenessMap.getOrDefault(a.getUserId(), 0L);
            long scoreB = closenessMap.getOrDefault(b.getUserId(), 0L);
            if (scoreA != scoreB) {
                return Long.compare(scoreB, scoreA); // Closeness desc
            }
            return b.getCreatedAt().compareTo(a.getCreatedAt()); // CreatedAt desc
        });

        return responses;
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
                .stickers(story.getStickers())
                .musicTrackId(story.getMusicTrackId())
                .altText(story.getAltText())
                .linkedPostId(story.getLinkedPostId())
                .createdAt(story.getCreatedAt())
                .expiresAt(story.getExpiresAt())
                .privacy(story.getPrivacy())
                .active(story.isActive())
                .build();
    }

    private static final Set<String> STORY_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

    private String normalizeStickersJson(String stickers) {
        if (stickers == null || stickers.isBlank()) {
            return null;
        }
        String trimmed = stickers.trim();
        if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
            throw new ValidationException("Stickers must be a JSON array");
        }
        return trimmed;
    }

    private void validateStoryImage(org.springframework.web.multipart.MultipartFile file) {
        if (!MediaFileSniffer.isAllowedImage(file, STORY_IMAGE_EXTENSIONS)) {
            throw new ValidationException("Story image must be JPG, PNG, GIF, or WebP");
        }
    }
}
