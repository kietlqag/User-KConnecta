package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.StartLiveRequest;
import project.kconnecta.user.backend.feature.live.dto.response.StartLiveResponse;
import project.kconnecta.user.backend.feature.live.service.LiveStartService;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveStartController {

    private final LiveStartService liveStartService;

    @PostMapping("/start")
    public ResponseEntity<StartLiveResponse> startLive(@Valid @RequestBody StartLiveRequest request) {
        return ResponseEntity.ok(liveStartService.startLive(request));
    }
}
