package project.kconnecta.user.backend.feature.story.service;

import project.kconnecta.user.backend.feature.story.dto.request.CreateStoryRequest;
import project.kconnecta.user.backend.feature.story.dto.response.StoryResponse;

import java.util.List;
import java.util.UUID;

public interface StoryService {
    StoryResponse createStory(CreateStoryRequest request);
    List<StoryResponse> getActiveStories(UUID userId, UUID viewerId);
    List<StoryResponse> getAllActiveStories(UUID viewerId);
    void deleteStory(UUID storyId, UUID userId);
}
