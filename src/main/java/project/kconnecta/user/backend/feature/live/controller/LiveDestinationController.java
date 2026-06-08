package project.kconnecta.user.backend.feature.live.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationsResponse;
import project.kconnecta.user.backend.feature.live.service.LiveDestinationService;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveDestinationController {

    private final LiveDestinationService liveDestinationService;

    @GetMapping("/destinations")
    public ResponseEntity<LiveDestinationsResponse> getDestinations(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(liveDestinationService.getDestinations(principal.getUserId()));
    }
}

