package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveFeaturedLinkRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveHostNoticeRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLivePollRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;
import project.kconnecta.user.backend.feature.live.service.LiveSessionToolService;

import java.util.UUID;

@RestController
@RequestMapping("/api/live/sessions/{sessionId}/tools")
@RequiredArgsConstructor
public class LiveSessionToolController {

    private final LiveSessionToolService liveSessionToolService;

    @GetMapping
    public ResponseEntity<LiveSessionToolStateResponse> get(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(liveSessionToolService.get(sessionId));
    }

    @PutMapping("/poll")
    public ResponseEntity<LiveSessionToolStateResponse> upsertPoll(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLivePollRequest request
    ) {
        return ResponseEntity.ok(liveSessionToolService.upsertPoll(sessionId, request));
    }

    @PutMapping("/featured-link")
    public ResponseEntity<LiveSessionToolStateResponse> upsertFeaturedLink(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveFeaturedLinkRequest request
    ) {
        return ResponseEntity.ok(liveSessionToolService.upsertFeaturedLink(sessionId, request));
    }

    @PutMapping("/host-notice")
    public ResponseEntity<LiveSessionToolStateResponse> upsertHostNotice(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveHostNoticeRequest request
    ) {
        return ResponseEntity.ok(liveSessionToolService.upsertHostNotice(sessionId, request));
    }
}
