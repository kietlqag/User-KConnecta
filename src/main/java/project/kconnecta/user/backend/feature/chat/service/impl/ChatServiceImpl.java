package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
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
                .seen(false)
                .build();
        chatMessageRepository.save(message);

        ChatMessageResponse response = new ChatMessageResponse(
                sender.getId(),
                sender.getUsername(),
                receiver.getId(),
                request.getContent(),
                now
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
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(UUID userId1, UUID userId2) {
        return chatMessageRepository.findConversation(userId1, userId2).stream()
                .map(m -> new ChatMessageResponse(
                        m.getSender().getId(),
                        m.getSender().getUsername(),
                        m.getReceiver().getId(),
                        m.getContent(),
                        m.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
}