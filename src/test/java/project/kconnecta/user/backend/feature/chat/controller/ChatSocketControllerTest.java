package project.kconnecta.user.backend.feature.chat.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.feature.chat.dto.request.CallSignalRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatErrorMessage;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSignalEventRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallSessionRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatSocketControllerTest {

    @Mock
    private ChatService chatService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private CallSessionRepository callSessionRepository;
    @Mock
    private CallSignalEventRepository callSignalEventRepository;
    @Mock
    private GroupCallSessionRepository groupCallSessionRepository;
    @Mock
    private ChatConversationRepository chatConversationRepository;
    @Mock
    private ChatConversationMemberRepository chatConversationMemberRepository;

    @InjectMocks
    private ChatSocketController controller;

    @Test
    void sendCallSignal_whenReceiverMissing_shouldPushErrorEventToCaller() {
        CallSignalRequest request = new CallSignalRequest();
        request.setCallId(UUID.randomUUID());
        request.setType("CALL_INVITE");

        Principal principal = () -> "alice";
        controller.sendCallSignal(request, principal);

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call-errors"), payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).containsEntry("code", "CALL_SIGNAL_ERROR");
        assertThat(payloadCaptor.getValue()).containsEntry("message", "Receiver ID is required");
        assertThat(payloadCaptor.getValue()).containsEntry("callId", request.getCallId());
        assertThat(payloadCaptor.getValue()).containsEntry("type", "CALL_INVITE");
    }

    @Test
    void sendCallSignal_groupInviteWithoutSession_shouldAutoCreateAndBroadcast() {
        UUID senderId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        UUID callId = UUID.randomUUID();

        User sender = User.builder().id(senderId).username("alice").fullName("Alice").build();
        User receiver = User.builder().id(receiverId).username("bob").fullName("Bob").build();
        ChatConversation conversation = ChatConversation.builder()
                .id(conversationId)
                .name("group")
                .createdBy(sender)
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(sender));
        when(userRepository.findById(receiverId)).thenReturn(Optional.of(receiver));
        when(chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, receiverId)).thenReturn(true);
        when(groupCallSessionRepository.findByCallIdForUpdate(callId)).thenReturn(Optional.empty());
        when(chatConversationRepository.findByIdPlain(conversationId)).thenReturn(Optional.of(conversation));
        when(chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, senderId)).thenReturn(true);
        when(groupCallSessionRepository.save(any(GroupCallSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CallSignalRequest request = new CallSignalRequest();
        request.setCallId(callId);
        request.setType("CALL_INVITE");
        request.setConversationId(conversationId);
        request.setReceiverId(receiverId);
        request.setMediaType("audio");

        controller.sendCallSignal(request, () -> "alice");

        ArgumentCaptor<GroupCallSession> sessionCaptor = ArgumentCaptor.forClass(GroupCallSession.class);
        verify(groupCallSessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getCallId()).isEqualTo(callId);
        assertThat(sessionCaptor.getValue().getStatus()).isEqualTo("RINGING");
        assertThat(sessionCaptor.getValue().getCaller().getId()).isEqualTo(senderId);

        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call"), any());
        verify(messagingTemplate, never()).convertAndSendToUser(eq("alice"), eq("/queue/call-errors"), any());
    }

    @Test
    void sendCallSignal_groupInviteWithReceiverOutsideConversation_shouldNotifyBothSidesError() {
        UUID senderId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        User sender = User.builder().id(senderId).username("alice").fullName("Alice").build();
        User receiver = User.builder().id(receiverId).username("bob").fullName("Bob").build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(sender));
        when(userRepository.findById(receiverId)).thenReturn(Optional.of(receiver));
        when(chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, receiverId)).thenReturn(false);

        CallSignalRequest request = new CallSignalRequest();
        request.setCallId(UUID.randomUUID());
        request.setType("CALL_INVITE");
        request.setConversationId(conversationId);
        request.setReceiverId(receiverId);

        controller.sendCallSignal(request, () -> "alice");

        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/call-errors"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/call-errors"), any());
        verify(messagingTemplate, never()).convertAndSendToUser(eq("bob"), eq("/queue/call"), any());
    }

    @Test
    void handleChatValidationError_rateLimited_sendsToQueueChatErrors() {
        ChatValidationException ex = new ChatValidationException(
                "CHAT_RATE_LIMITED", "Quá nhanh. Thử lại sau 5 giây.", 5, null, "client-123");
        Principal principal = () -> "alice";

        controller.handleChatValidationError(ex, principal);

        ArgumentCaptor<ChatErrorMessage> captor = ArgumentCaptor.forClass(ChatErrorMessage.class);
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/chat-errors"), captor.capture());
        assertThat(captor.getValue().getCode()).isEqualTo("CHAT_RATE_LIMITED");
        assertThat(captor.getValue().getRetryAfterSeconds()).isEqualTo(5);
        assertThat(captor.getValue().getMessageClientId()).isEqualTo("client-123");
    }

    @Test
    void handleChatValidationError_doesNotSendToCallErrors() {
        ChatValidationException ex = new ChatValidationException(
                "CHAT_BLOCKED_KEYWORD", "Nội dung không phù hợp.", null, null, null);

        controller.handleChatValidationError(ex, () -> "alice");

        verify(messagingTemplate, never()).convertAndSendToUser(eq("alice"), eq("/queue/call-errors"), any());
    }

    @Test
    void handleChatValidationError_nullPrincipal_doesNothing() {
        ChatValidationException ex = new ChatValidationException(
                "CHAT_RATE_LIMITED", "msg", 3, null, null);

        controller.handleChatValidationError(ex, null);

        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());
    }
}
