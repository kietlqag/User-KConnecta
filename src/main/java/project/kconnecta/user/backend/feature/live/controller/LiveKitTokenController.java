package project.kconnecta.user.backend.feature.live.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.request.LiveKitTokenRequest;
import project.kconnecta.user.backend.feature.live.dto.response.LiveKitTokenResponse;
import project.kconnecta.user.backend.feature.live.service.LiveKitTokenService;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveKitTokenController {

    private final LiveKitTokenService liveKitTokenService;

    @PostMapping("/token")
    public ResponseEntity<LiveKitTokenResponse> createToken(@Valid @RequestBody LiveKitTokenRequest request) {
        return ResponseEntity.ok(liveKitTokenService.createToken(request));
    }
}
