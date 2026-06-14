package project.kconnecta.user.backend.feature.live.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionRealtimeEvent;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionResponse;
import project.kconnecta.user.backend.feature.live.dto.response.session.LiveSessionToolStateResponse;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveSessionRealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishSessionEvent(String type, LiveSessionResponse session) {
        if (session == null || session.getId() == null) {
            return;
        }
        publish(session.getId(), LiveSessionRealtimeEvent.builder()
                .type(type)
                .sessionId(session.getId())
                .status(session.getStatus())
                .viewerCount(session.getViewerCount())
                .peakViewerCount(session.getPeakViewerCount())
                .totalReactionCount(session.getTotalReactionCount())
                .session(session)
                .emittedAt(LocalDateTime.now())
                .build());
    }

    public void publishToolsUpdated(LiveSessionToolStateResponse tools) {
        if (tools == null || tools.getSessionId() == null) {
            return;
        }
        publish(tools.getSessionId(), LiveSessionRealtimeEvent.builder()
                .type("TOOLS_UPDATED")
                .sessionId(tools.getSessionId())
                .tools(tools)
                .emittedAt(LocalDateTime.now())
                .build());
    }

    private void publish(UUID sessionId, LiveSessionRealtimeEvent event) {
        messagingTemplate.convertAndSend("/topic/live/" + sessionId, event);
    }
}
