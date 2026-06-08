package project.kconnecta.user.backend.feature.story.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.story.dto.request.CreateStoryRequest;
import project.kconnecta.user.backend.feature.story.dto.response.StoryResponse;
import project.kconnecta.user.backend.feature.story.service.StoryService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoryResponse> createStory(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @ModelAttribute CreateStoryRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(storyService.createStory(request));
    }

    @GetMapping
    public ResponseEntity<List<StoryResponse>> getAllActiveStories() {
        return ResponseEntity.ok(storyService.getAllActiveStories());
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<List<StoryResponse>> getActiveStoriesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(storyService.getActiveStories(userId));
    }

    @DeleteMapping("/{storyId}")
    public ResponseEntity<Void> deleteStory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID storyId) {
        storyService.deleteStory(storyId, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
