package project.kconnecta.user.backend.feature.chat.service;

import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.AddGroupMembersRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.GroupMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationPinRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupCallSessionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PinnedMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupMemberNicknameRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatAssetPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupCallSessionResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationPinResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.PinnedMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationSummaryResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatService {
    void sendPrivateMessage(String currentUsername, PrivateMessageRequest request);
    ChatMessageResponse sendGroupMessage(String currentUsername, GroupMessageRequest request);
    void sendSystemMessage(UUID senderId, UUID receiverId, String content);
    void sendGroupSystemMessage(UUID senderId, UUID conversationId, String content);
    void markMessageDelivered(String currentUsername, UUID messageId);
    void markConversationSeen(String currentUsername, UUID peerUserId);
    ChatMessageResponse updateMessageReaction(String currentUsername, UUID messageId, MessageReactionRequest request);
    ChatMessageResponse deleteMessage(String currentUsername, UUID messageId);
    void reportMessage(String currentUsername, UUID messageId, MessageReportRequest request);

    ChatHistoryPageResponse getChatHistory(UUID userId1, UUID userId2, LocalDateTime beforeCreatedAt, Integer limit);
    ChatHistoryPageResponse getGroupChatHistory(String currentUsername, UUID conversationId, LocalDateTime beforeCreatedAt, Integer limit);
    ChatAssetPageResponse getPrivateAssets(String currentUsername, UUID peerUserId, String type, LocalDateTime beforeCreatedAt, Integer limit);
    ChatAssetPageResponse getGroupAssets(String currentUsername, UUID conversationId, String type, LocalDateTime beforeCreatedAt, Integer limit);
    GroupConversationResponse createGroupConversation(String currentUsername, CreateGroupConversationRequest request);
    GroupConversationResponse updateGroupConversation(String currentUsername, UUID conversationId, UpdateGroupConversationRequest request);
    GroupConversationResponse updateGroupMemberNickname(String currentUsername, UUID conversationId, UUID memberUserId, UpdateGroupMemberNicknameRequest request);
    List<GroupConversationResponse> getMyGroupConversations(String currentUsername);
    GroupConversationResponse addGroupMembers(String currentUsername, UUID conversationId, AddGroupMembersRequest request);
    GroupCallSessionResponse createGroupCallSession(String currentUsername, UUID conversationId, CreateGroupCallSessionRequest request);
    GroupCallSessionResponse getGroupCallSessionSnapshot(String currentUsername, UUID callId);
    ConversationPinResponse setConversationPinned(String currentUsername, ConversationPinRequest request);
    List<ConversationPinResponse> getPinnedConversations(String currentUsername);
    PinnedMessageResponse setPinnedMessage(String currentUsername, PinnedMessageRequest request);
    List<PinnedMessageResponse> getPinnedMessages(String currentUsername);
    List<ConversationSummaryResponse> getConversationSummaries(String currentUsername, List<UUID> peerUserIds, List<UUID> conversationIds);
    int getTotalPrivateUnreadCount(String currentUsername);
    CallSessionSnapshotResponse getCallSessionSnapshot(String currentUsername, UUID callId);
}
