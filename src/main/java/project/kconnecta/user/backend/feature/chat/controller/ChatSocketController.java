package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.service.ChatService;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final ChatService chatService;

    /**
     * Client gửi tới: /app/chat.private
     * Principal được set bởi WebSocketAuthInterceptor sau khi xác thực JWT.
     * principal.getName() trả về username — dùng để tra cứu sender và route tin nhắn.
     */
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(PrivateMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.sendPrivateMessage(principal.getName(), request);
    }
}
