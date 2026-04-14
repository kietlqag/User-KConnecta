package project.kconnecta.user.backend.feature.chat.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import project.kconnecta.user.backend.feature.chat.service.PresenceService;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) {
            return;
        }
        presenceService.handleSessionConnected(accessor.getSessionId(), principal.getName());
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        presenceService.handleSessionDisconnected(accessor.getSessionId());
    }
}

