package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveSessionPinnedCommentRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.VoteLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;
import project.kconnecta.user.backend.feature.live.service.LiveSessionToolService;

import java.util.UUID;

@RestController
@RequestMapping("/api/live/sessions/{sessionId}/tools")
@RequiredArgsConstructor
public class LiveSessionToolController {

    private final LiveSessionToolService liveSessionToolService;

    @GetMapping
    public ResponseEntity<LiveSessionToolStateResponse> get(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(liveSessionToolService.get(sessionId, principal == null ? null : principal.getUserId()));
    }

    @PutMapping("/poll")
    public ResponseEntity<LiveSessionToolStateResponse> upsertPoll(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLivePollRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionToolService.upsertPoll(sessionId, principal.getUserId(), request));
    }

    @PutMapping("/featured-link")
    public ResponseEntity<LiveSessionToolStateResponse> upsertFeaturedLink(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveFeaturedLinkRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionToolService.upsertFeaturedLink(sessionId, principal.getUserId(), request));
    }

    @PutMapping("/host-notice")
    public ResponseEntity<LiveSessionToolStateResponse> upsertHostNotice(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveHostNoticeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionToolService.upsertHostNotice(sessionId, principal.getUserId(), request));
    }

    @PutMapping("/poll/vote")
    public ResponseEntity<LiveSessionToolStateResponse> votePoll(
            @PathVariable UUID sessionId,
            @Valid @RequestBody VoteLivePollRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionToolService.votePoll(sessionId, principal.getUserId(), request));
    }

    @PutMapping("/pinned-comment")
    public ResponseEntity<LiveSessionToolStateResponse> upsertPinnedComment(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveSessionPinnedCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionToolService.upsertPinnedComment(sessionId, principal.getUserId(), request));
    }
}
