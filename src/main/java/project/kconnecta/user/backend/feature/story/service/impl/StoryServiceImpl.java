package project.kconnecta.user.backend.feature.story.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.common.util.CloudinaryService;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.story.dto.request.CreateStoryRequest;
import project.kconnecta.user.backend.feature.story.dto.response.StoryResponse;
import project.kconnecta.user.backend.feature.story.entity.Story;
import project.kconnecta.user.backend.feature.story.repository.StoryRepository;
import project.kconnecta.user.backend.feature.story.service.StoryService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final UserRepository userRepository;
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
                .build();

        story = storyRepository.save(story);
        return mapToResponse(story);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getActiveStories(UUID userId) {
        return storyRepository.findByUserIdAndExpiresAtAfterAndActiveTrueOrderByCreatedAtAsc(userId, LocalDateTime.now())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getAllActiveStories() {
        return storyRepository.findByExpiresAtAfterAndActiveTrueOrderByCreatedAtDesc(LocalDateTime.now())
                .stream()
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
                .createdAt(story.getCreatedAt())
                .expiresAt(story.getExpiresAt())
                .active(story.isActive())
                .build();
    }
}
