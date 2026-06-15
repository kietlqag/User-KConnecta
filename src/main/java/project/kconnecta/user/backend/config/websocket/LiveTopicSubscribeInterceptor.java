package project.kconnecta.user.backend.config.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.feature.live.entity.LiveSession;
import project.kconnecta.user.backend.feature.live.repository.LiveSessionRepository;
import project.kconnecta.user.backend.feature.live.service.LiveAccessService;

import java.security.Principal;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class LiveTopicSubscribeInterceptor implements ChannelInterceptor {

    private static final Pattern LIVE_TOPIC_PATTERN = Pattern.compile("^/topic/live/([0-9a-fA-F-]{36})$");

    private final LiveSessionRepository liveSessionRepository;
    private final LiveAccessService liveAccessService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            return message;
        }

        Matcher matcher = LIVE_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            return message;
        }

        Principal principal = accessor.getUser();
        if (!(principal instanceof UserPrincipal userPrincipal)) {
            throw new ForbiddenException("Authentication required to subscribe to live updates");
        }

        UUID sessionId = UUID.fromString(matcher.group(1));
        LiveSession session = liveSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ForbiddenException("Live session not found"));
        liveAccessService.requireCanView(session, userPrincipal.getUserId());
        return message;
    }
}
