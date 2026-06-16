package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.GoLiveResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscribersResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveEventSubscriptionStatusResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionReactionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import project.kconnecta.user.backend.feature.live.service.LiveEventSubscriptionService;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/live/sessions")
@RequiredArgsConstructor
public class LiveSessionController {

    private final LiveSessionService liveSessionService;
    private final LiveEventSubscriptionService liveEventSubscriptionService;

    @PostMapping
    public ResponseEntity<LiveSessionResponse> create(
            @Valid @RequestBody CreateLiveSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.createSession(request, principal.getUserId()));
    }

    @PostMapping("/{sessionId}/go-live")
    public ResponseEntity<GoLiveResponse> goLive(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.goLive(sessionId, principal.getUserId()));
    }

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<LiveSessionResponse> endLive(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.endLive(sessionId, principal.getUserId()));
    }

    @PostMapping(value = "/{sessionId}/recording", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LiveSessionResponse> uploadRecording(
            @PathVariable UUID sessionId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "durationSec", required = false) Integer durationSec,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.saveRecording(sessionId, principal.getUserId(), file, durationSec));
    }

    @PostMapping("/{sessionId}/recording/failed")
    public ResponseEntity<LiveSessionResponse> markRecordingFailed(
            @PathVariable UUID sessionId,
            @RequestBody(required = false) Map<String, String> request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String error = request == null ? null : request.get("error");
        return ResponseEntity.ok(liveSessionService.markRecordingFailed(sessionId, principal.getUserId(), error));
    }

    @PutMapping("/{sessionId}/viewer/join")
    public ResponseEntity<LiveSessionResponse> join(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.join(sessionId, principal.getUserId()));
    }

    @PutMapping("/{sessionId}/viewer/heartbeat")
    public ResponseEntity<LiveSessionResponse> heartbeat(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.heartbeat(sessionId, principal.getUserId()));
    }

    @PutMapping("/{sessionId}/viewer/leave")
    public ResponseEntity<LiveSessionResponse> leave(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.leave(sessionId, principal.getUserId()));
    }

    @PutMapping("/{sessionId}/reaction")
    public ResponseEntity<LiveSessionResponse> react(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpsertLiveReactionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.react(sessionId, principal.getUserId(), request));
    }

    @GetMapping("/{sessionId}/reaction")
    public ResponseEntity<LiveSessionReactionResponse> getReaction(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.getReaction(sessionId, principal.getUserId()));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<LiveSessionResponse> getById(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(liveSessionService.getById(sessionId, principal == null ? null : principal.getUserId()));
    }

    @GetMapping("/by-post/{postId}")
    public ResponseEntity<LiveSessionResponse> getByPostId(
            @PathVariable UUID postId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(liveSessionService.getByPostId(postId, principal == null ? null : principal.getUserId()));
    }

    @GetMapping("/active")
    public ResponseEntity<List<LiveSessionResponse>> listActive(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(liveSessionService.listActive(principal == null ? null : principal.getUserId()));
    }

    @GetMapping
    public ResponseEntity<List<LiveSessionResponse>> listByHost(
            @RequestParam UUID hostUserId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveSessionService.listByHost(hostUserId, principal.getUserId()));
    }

    @GetMapping("/{sessionId}/stats")
    public ResponseEntity<LiveSessionStatsResponse> stats(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(liveSessionService.getStats(sessionId, principal == null ? null : principal.getUserId()));
    }

    @PostMapping("/{sessionId}/subscribe")
    public ResponseEntity<LiveEventSubscriptionStatusResponse> subscribe(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveEventSubscriptionService.subscribe(sessionId, principal.getUserId()));
    }

    @DeleteMapping("/{sessionId}/subscribe")
    public ResponseEntity<LiveEventSubscriptionStatusResponse> unsubscribe(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveEventSubscriptionService.unsubscribe(sessionId, principal.getUserId()));
    }

    @GetMapping("/{sessionId}/subscription")
    public ResponseEntity<LiveEventSubscriptionStatusResponse> getSubscriptionStatus(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveEventSubscriptionService.getStatus(sessionId, principal.getUserId()));
    }

    @GetMapping("/{sessionId}/subscribers")
    public ResponseEntity<LiveEventSubscribersResponse> listSubscribers(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(liveEventSubscriptionService.listSubscribers(sessionId, principal.getUserId()));
    }
}
