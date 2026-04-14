package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import project.kconnecta.user.backend.feature.chat.service.PresenceService;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class PresenceSocketController {

    private final PresenceService presenceService;

    @MessageMapping("/presence.init")
    public void initPresence(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        presenceService.sendInitialPresenceSnapshot(principal.getName());
    }
}

