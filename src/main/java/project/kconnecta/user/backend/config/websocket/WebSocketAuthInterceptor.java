package project.kconnecta.user.backend.config.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import project.kconnecta.user.backend.config.websocket.WebSocketCookieHandshakeInterceptor;
import project.kconnecta.user.backend.common.enums.AccountStatus;
import project.kconnecta.user.backend.common.util.JwtUtil;
import project.kconnecta.user.backend.config.security.TokenBlacklistService;
import project.kconnecta.user.backend.config.security.UserPrincipal;
import project.kconnecta.user.backend.feature.settings.service.impl.SettingsServiceImpl;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;
    private final SettingsServiceImpl settingsService;

    @Override
    public Message<?> preSend(@org.springframework.lang.NonNull Message<?> message, @org.springframework.lang.NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            String token = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                var sessionAttrs = accessor.getSessionAttributes();
                if (sessionAttrs != null) {
                    Object sessionToken = sessionAttrs.get(WebSocketCookieHandshakeInterceptor.ACCESS_TOKEN_SESSION_ATTR);
                    if (sessionToken instanceof String s && !s.isBlank()) {
                        token = s;
                    }
                }
            }

            if (token == null || token.isBlank()) {
                throw new IllegalArgumentException("Missing or invalid Authorization on STOMP CONNECT");
            }

            if (!jwtUtil.isTokenValid(token) || tokenBlacklistService.isBlacklisted(token)) {
                throw new IllegalArgumentException("Invalid or expired JWT token");
            }

            UUID sessionId = jwtUtil.extractSessionId(token);
            if (sessionId != null) {
                var sessionOpt = settingsService.findSession(sessionId);
                if (sessionOpt.isPresent() && !sessionOpt.get().isActive()) {
                    throw new IllegalArgumentException("Login session revoked");
                }
            }

            UUID userId = jwtUtil.extractUserId(token);
            var user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getAccount() == null
                    || user.getAccount().getStatus() != AccountStatus.ACTIVE) {
                throw new IllegalArgumentException("Account is not active");
            }

            UserPrincipal principal = new UserPrincipal(
                    userId,
                    jwtUtil.extractUsername(token)
            );

            accessor.setUser(principal);
        }

        return message;
    }
}
