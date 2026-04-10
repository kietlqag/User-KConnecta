package project.kconnecta.user.backend.config.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.config.security.UserPrincipal;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing or invalid Authorization header on STOMP CONNECT");
            }

            String token = authHeader.substring(7);

            if (!jwtUtil.isTokenValid(token)) {
                throw new IllegalArgumentException("Invalid or expired JWT token");
            }

            UserPrincipal principal = new UserPrincipal(
                    jwtUtil.extractUserId(token),
                    jwtUtil.extractUsername(token)
            );

            // Gắn principal vào WebSocket session — Spring dùng principal.getName()
            // để route convertAndSendToUser() tới đúng client
            accessor.setUser(principal);
        }

        return message;
    }
}
