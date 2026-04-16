package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.MessageStatusResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final int DEFAULT_HISTORY_LIMIT = 30;
    private static final int MIN_HISTORY_LIMIT = 10;
    private static final int MAX_HISTORY_LIMIT = 100;

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CallSessionRepository callSessionRepository;

    @Override
    public void sendPrivateMessage(String currentUsername, PrivateMessageRequest request) {

        User sender = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        LocalDateTime now = LocalDateTime.now();

        // Lưu tin nhắn vào DB
        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .createdAt(now)
                .delivered(false)
                .deliveredAt(null)
                .seen(false)
                .seenAt(null)
                .build();
        message = chatMessageRepository.save(message);

        ChatMessageResponse response = new ChatMessageResponse(
                message.getId(),
                sender.getId(),
                sender.getUsername(),
                receiver.getId(),
                request.getContent(),
                now,
                message.getDelivered(),
                message.getSeen(),
                message.getSeenAt()
        );

        // gửi cho receiver
        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                response
        );

        // gửi lại cho sender (hiển thị ngay)
        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/messages",
                response
        );
    }

    @Override
    public void sendSystemMessage(UUID senderId, UUID receiverId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        LocalDateTime now = LocalDateTime.now();

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .createdAt(now)
                .delivered(false)
                .deliveredAt(null)
                .seen(false)
                .seenAt(null)
                .build();
        message = chatMessageRepository.save(message);

        ChatMessageResponse response = new ChatMessageResponse(
                message.getId(),
                sender.getId(),
                sender.getUsername(),
                receiver.getId(),
                content,
                now,
                message.getDelivered(),
                message.getSeen(),
                message.getSeenAt()
        );

        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                response
        );

        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/messages",
                response
        );
    }

    @Override
    @Transactional
    public void markMessageDelivered(String currentUsername, UUID messageId) {
        if (messageId == null) return;

        User receiver = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getReceiver().getId().equals(receiver.getId())) {
            return;
        }

        if (Boolean.TRUE.equals(message.getSeen())) {
            return;
        }

        if (!Boolean.TRUE.equals(message.getDelivered())) {
            message.setDelivered(true);
            message.setDeliveredAt(LocalDateTime.now());
            chatMessageRepository.save(message);
        }

        MessageStatusResponse status = new MessageStatusResponse(
                message.getId(),
                message.getSender().getId(),
                message.getReceiver().getId(),
                "DELIVERED",
                message.getDeliveredAt()
        );

        messagingTemplate.convertAndSendToUser(
                message.getSender().getUsername(),
                "/queue/message-status",
                status
        );
    }

    @Override
    @Transactional
    public void markConversationSeen(String currentUsername, UUID peerUserId) {
        if (peerUserId == null) return;

        User viewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Viewer not found"));

        List<ChatMessage> unseenMessages = chatMessageRepository.findUnseenMessages(peerUserId, viewer.getId());
        if (unseenMessages.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (ChatMessage message : unseenMessages) {
            message.setSeen(true);
            message.setSeenAt(now);
            if (!Boolean.TRUE.equals(message.getDelivered())) {
                message.setDelivered(true);
                message.setDeliveredAt(now);
            }
        }
        chatMessageRepository.saveAll(unseenMessages);

        for (ChatMessage message : unseenMessages) {
            MessageStatusResponse status = new MessageStatusResponse(
                    message.getId(),
                    message.getSender().getId(),
                    message.getReceiver().getId(),
                    "SEEN",
                    message.getSeenAt()
            );
            messagingTemplate.convertAndSendToUser(
                    message.getSender().getUsername(),
                    "/queue/message-status",
                    status
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ChatHistoryPageResponse getChatHistory(UUID userId1, UUID userId2, LocalDateTime beforeCreatedAt, Integer limit) {
        int normalizedLimit = normalizeHistoryLimit(limit);
        List<ChatMessageResponse> chunkDesc = chatMessageRepository.findConversationChunk(
                userId1,
                userId2,
                beforeCreatedAt,
                PageRequest.of(0, normalizedLimit + 1)
        );

        boolean hasMore = chunkDesc.size() > normalizedLimit;
        if (hasMore) {
            chunkDesc = new ArrayList<>(chunkDesc.subList(0, normalizedLimit));
        }

        Collections.reverse(chunkDesc);
        List<ChatMessageResponse> messages = chunkDesc;

        LocalDateTime nextBeforeCreatedAt = messages.isEmpty() ? null : messages.get(0).getCreatedAt();
        return new ChatHistoryPageResponse(messages, hasMore, nextBeforeCreatedAt);
    }

    private int normalizeHistoryLimit(Integer limit) {
        if (limit == null) return DEFAULT_HISTORY_LIMIT;
        if (limit < MIN_HISTORY_LIMIT) return MIN_HISTORY_LIMIT;
        return Math.min(limit, MAX_HISTORY_LIMIT);
    }

    @Override
    @Transactional(readOnly = true)
    public CallSessionSnapshotResponse getCallSessionSnapshot(String currentUsername, UUID callId) {
        if (callId == null) {
            throw new RuntimeException("Call ID is required");
        }
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        CallSession session = callSessionRepository.findByCallIdWithUsers(callId)
                .orElseThrow(() -> new RuntimeException("Call session not found"));

        UUID userId = currentUser.getId();
        boolean isParticipant = session.getCaller().getId().equals(userId) || session.getCallee().getId().equals(userId);
        if (!isParticipant) {
            throw new RuntimeException("Forbidden");
        }

        return toSnapshot(session, LocalDateTime.now());
    }

    public static CallSessionSnapshotResponse toSnapshot(CallSession session, LocalDateTime now) {
        Integer durationSec = session.getDurationSec();
        if ("ONGOING".equals(session.getStatus()) && session.getAnsweredAt() != null && session.getEndedAt() == null) {
            durationSec = (int) ChronoUnit.SECONDS.between(session.getAnsweredAt(), now);
            if (durationSec < 0) durationSec = 0;
        }
        return new CallSessionSnapshotResponse(
                session.getCallId(),
                session.getStatus(),
                session.getCallMediaType(),
                session.getStartedAt(),
                session.getAnsweredAt(),
                session.getEndedAt(),
                durationSec
        );
    }
}
