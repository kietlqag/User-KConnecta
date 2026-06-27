package project.kconnecta.user.backend.config.websocket;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import project.kconnecta.user.backend.config.security.AuthCookieService;

import java.util.Map;

/** Copies the access token from HttpOnly cookie into the WebSocket session for STOMP auth. */
@Component
@RequiredArgsConstructor
public class WebSocketCookieHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ACCESS_TOKEN_SESSION_ATTR = "kcAccessToken";

    private final AuthCookieService authCookieService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            authCookieService.readAccessToken(httpRequest).ifPresent(token ->
                    attributes.put(ACCESS_TOKEN_SESSION_ATTR, token));
        }
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }
}
