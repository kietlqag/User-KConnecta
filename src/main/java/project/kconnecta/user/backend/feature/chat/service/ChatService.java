package project.kconnecta.user.backend.feature.chat.service;

import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatService {
    void sendPrivateMessage(String currentUsername, PrivateMessageRequest request);
    void sendSystemMessage(UUID senderId, UUID receiverId, String content);
    void markMessageDelivered(String currentUsername, UUID messageId);
    void markConversationSeen(String currentUsername, UUID peerUserId);
    ChatMessageResponse updateMessageReaction(String currentUsername, UUID messageId, MessageReactionRequest request);
    ChatMessageResponse deleteMessage(String currentUsername, UUID messageId);
    void reportMessage(String currentUsername, UUID messageId, MessageReportRequest request);

    ChatHistoryPageResponse getChatHistory(UUID userId1, UUID userId2, LocalDateTime beforeCreatedAt, Integer limit);
    CallSessionSnapshotResponse getCallSessionSnapshot(String currentUsername, UUID callId);
}
