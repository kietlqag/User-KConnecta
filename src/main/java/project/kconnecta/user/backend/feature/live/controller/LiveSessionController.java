package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.session.CreateLiveSessionRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.LiveViewerRequest;
import project.kconnecta.user.backend.feature.live.dto.request.session.UpsertLiveReactionRequest;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionStatsResponse;
import project.kconnecta.user.backend.feature.live.service.LiveSessionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/live/sessions")
@RequiredArgsConstructor
public class LiveSessionController {

    private final LiveSessionService liveSessionService;

    @PostMapping
    public ResponseEntity<LiveSessionResponse> create(@Valid @RequestBody CreateLiveSessionRequest request) {
        return ResponseEntity.ok(liveSessionService.createSession(request));
    }

    @PostMapping("/{sessionId}/go-live")
    public ResponseEntity<LiveSessionResponse> goLive(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(liveSessionService.goLive(sessionId));
    }

    @PostMapping("/{sessionId}/end")
    public ResponseEntity<LiveSessionResponse> endLive(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(liveSessionService.endLive(sessionId));
    }

    @PutMapping("/{sessionId}/viewer/join")
    public ResponseEntity<LiveSessionResponse> join(@PathVariable UUID sessionId, @Valid @RequestBody LiveViewerRequest request) {
        return ResponseEntity.ok(liveSessionService.join(sessionId, request));
    }

    @PutMapping("/{sessionId}/viewer/leave")
    public ResponseEntity<LiveSessionResponse> leave(@PathVariable UUID sessionId, @Valid @RequestBody LiveViewerRequest request) {
        return ResponseEntity.ok(liveSessionService.leave(sessionId, request));
    }

    @PutMapping("/{sessionId}/reaction")
    public ResponseEntity<LiveSessionResponse> react(@PathVariable UUID sessionId, @Valid @RequestBody UpsertLiveReactionRequest request) {
        return ResponseEntity.ok(liveSessionService.react(sessionId, request));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<LiveSessionResponse> getById(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(liveSessionService.getById(sessionId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<LiveSessionResponse>> listActive() {
        return ResponseEntity.ok(liveSessionService.listActive());
    }

    @GetMapping
    public ResponseEntity<List<LiveSessionResponse>> listByHost(@RequestParam UUID hostUserId) {
        return ResponseEntity.ok(liveSessionService.listByHost(hostUserId));
    }

    @GetMapping("/{sessionId}/stats")
    public ResponseEntity<LiveSessionStatsResponse> stats(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(liveSessionService.getStats(sessionId));
    }
}
