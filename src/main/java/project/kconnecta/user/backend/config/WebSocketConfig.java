package project.kconnecta.user.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import project.kconnecta.user.backend.config.websocket.LiveTopicSubscribeInterceptor;
import project.kconnecta.user.backend.config.websocket.WebSocketAuthInterceptor;
import project.kconnecta.user.backend.config.websocket.WebSocketCookieHandshakeInterceptor;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final LiveTopicSubscribeInterceptor liveTopicSubscribeInterceptor;
    private final WebSocketCookieHandshakeInterceptor webSocketCookieHandshakeInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,https://user-k-connecta.vercel.app}")
    private String allowedOrigins;

    @Override
    public void registerStompEndpoints(@org.springframework.lang.NonNull StompEndpointRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
        boolean hasPattern = Arrays.stream(origins).anyMatch(o -> o.contains("*"));
        var endpoint = registry.addEndpoint("/ws")
                .addInterceptors(webSocketCookieHandshakeInterceptor);
        if (hasPattern) {
            endpoint.setAllowedOriginPatterns(origins);
        } else {
            endpoint.setAllowedOrigins(origins);
        }
    }

    @Override
    public void configureMessageBroker(@org.springframework.lang.NonNull MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/queue", "/topic");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(@org.springframework.lang.NonNull ChannelRegistration registration) {
        // Đăng ký interceptor — xác thực JWT khi client gửi STOMP CONNECT
        registration.interceptors(webSocketAuthInterceptor, liveTopicSubscribeInterceptor);
    }
}
