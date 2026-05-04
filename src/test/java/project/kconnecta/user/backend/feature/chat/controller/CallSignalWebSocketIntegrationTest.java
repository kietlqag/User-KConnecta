package project.kconnecta.user.backend.feature.chat.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import project.kconnecta.user.backend.common.util.JwtUtil;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CallSignalWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JwtUtil jwtUtil;

    private WebSocketStompClient stompClient;
    private StompSession session;

    @AfterEach
    void tearDown() {
        if (session != null && session.isConnected()) {
            session.disconnect();
        }
        if (stompClient != null) {
            stompClient.stop();
        }
    }

    @Test
    void callSignal_invalidPayload_shouldReceiveCallErrorEvent() throws Exception {
        UUID userId = UUID.randomUUID();
        String username = "ws-it-user";
        String token = jwtUtil.generateToken(userId, username);

        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);

        session = stompClient
                .connectAsync(
                        "ws://localhost:" + port + "/ws",
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        new StompSessionHandlerAdapter() {}
                )
                .get(5, TimeUnit.SECONDS);

        BlockingQueue<Map<String, Object>> errors = new LinkedBlockingQueue<>();
        session.subscribe("/user/queue/call-errors", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                if (payload instanceof Map<?, ?> map) {
                    errors.offer((Map<String, Object>) map);
                }
            }
        });

        Map<String, Object> invalidSignal = new HashMap<>();
        invalidSignal.put("callId", UUID.randomUUID().toString());
        invalidSignal.put("type", "CALL_INVITE");
        session.send("/app/call.signal", invalidSignal);

        Map<String, Object> event = errors.poll(5, TimeUnit.SECONDS);
        assertThat(event).isNotNull();
        assertThat(event.get("code")).isEqualTo("CALL_SIGNAL_ERROR");
        assertThat(String.valueOf(event.get("message"))).contains("Receiver ID is required");
    }
}
