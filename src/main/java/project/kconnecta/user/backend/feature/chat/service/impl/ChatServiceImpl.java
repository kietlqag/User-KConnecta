package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.MessageStatusResponse;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository;

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
    public List<ChatMessageResponse> getChatHistory(UUID userId1, UUID userId2) {
        return chatMessageRepository.findConversation(userId1, userId2).stream()
                .map(m -> new ChatMessageResponse(
                        m.getId(),
                        m.getSender().getId(),
                        m.getSender().getUsername(),
                        m.getReceiver().getId(),
                        m.getContent(),
                        m.getCreatedAt(),
                        m.getDelivered(),
                        m.getSeen(),
                        m.getSeenAt()
                ))
                .collect(Collectors.toList());
    }
}
