package project.kconnecta.user.backend.feature.chat.service;

import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    void sendPrivateMessage(String currentUsername, PrivateMessageRequest request);

    List<ChatMessageResponse> getChatHistory(UUID userId1, UUID userId2);
}
