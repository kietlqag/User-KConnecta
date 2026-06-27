package project.kconnecta.user.backend.feature.interest.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.interest.dto.request.RecordInterestEventRequest;
import project.kconnecta.user.backend.feature.interest.dto.request.SuggestHashtagsRequest;
import project.kconnecta.user.backend.feature.interest.dto.response.HashtagSuggestionResponse;
import project.kconnecta.user.backend.feature.interest.service.HashtagSuggestionService;
import project.kconnecta.user.backend.feature.interest.service.UserInterestService;

@RestController
@RequestMapping("/api/interest")
@RequiredArgsConstructor
public class InterestController {

    private final UserInterestService userInterestService;
    private final HashtagSuggestionService hashtagSuggestionService;

    @PostMapping("/events")
    public ResponseEntity<Void> recordEvent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RecordInterestEventRequest request) {
        userInterestService.recordInteraction(
                principal.getUserId(),
                request.getPostId(),
                request.getEventType());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/hashtags/suggest")
    public ResponseEntity<HashtagSuggestionResponse> suggestHashtags(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SuggestHashtagsRequest request) {
        String content = request.getContent() == null ? "" : request.getContent();
        return ResponseEntity.ok(new HashtagSuggestionResponse(
                hashtagSuggestionService.suggest(content, principal.getUserId())));
    }
}
