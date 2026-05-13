package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.UpsertLiveScheduleRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveScheduleResponse;
import project.kconnecta.user.backend.feature.live.service.LiveScheduleService;

import java.util.UUID;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveScheduleController {

    private final LiveScheduleService liveScheduleService;

    @PostMapping("/schedule")
    public ResponseEntity<LiveScheduleResponse> upsertSchedule(@Valid @RequestBody UpsertLiveScheduleRequest request) {
        return ResponseEntity.ok(liveScheduleService.upsertSchedule(request));
    }

    @GetMapping("/schedule")
    public ResponseEntity<LiveScheduleResponse> getSchedule(@RequestParam UUID userId) {
        return ResponseEntity.ok(liveScheduleService.getSchedule(userId));
    }
}

