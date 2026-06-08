package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.live.dto.request.UpsertLiveScheduleRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveScheduleResponse;
import project.kconnecta.user.backend.feature.live.service.LiveScheduleService;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveScheduleController {

    private final LiveScheduleService liveScheduleService;

    @PostMapping("/schedule")
    public ResponseEntity<LiveScheduleResponse> upsertSchedule(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpsertLiveScheduleRequest request) {
        request.setUserId(principal.getUserId());
        return ResponseEntity.ok(liveScheduleService.upsertSchedule(request));
    }

    @GetMapping("/schedule")
    public ResponseEntity<LiveScheduleResponse> getSchedule(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(liveScheduleService.getSchedule(principal.getUserId()));
    }
}

