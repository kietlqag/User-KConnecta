package project.kconnecta.user.backend.feature.live.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.kconnecta.user.backend.feature.live.dto.response.LiveDestinationsResponse;
import project.kconnecta.user.backend.feature.live.service.LiveDestinationService;

import java.util.UUID;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
public class LiveDestinationController {

    private final LiveDestinationService liveDestinationService;

    @GetMapping("/destinations")
    public ResponseEntity<LiveDestinationsResponse> getDestinations(@RequestParam UUID userId) {
        return ResponseEntity.ok(liveDestinationService.getDestinations(userId));
    }
}

