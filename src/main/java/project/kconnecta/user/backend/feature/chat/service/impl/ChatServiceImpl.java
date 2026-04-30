package project.kconnecta.user.backend.feature.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.GroupMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationPinRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PinnedMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationPinResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.PinnedMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationMemberResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.MessageStatusResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversationMember;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReaction;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReport;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedConversation;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedMessage;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageReactionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageReportRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatPinnedConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatPinnedMessageRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final int DEFAULT_HISTORY_LIMIT = 30;
    private static final int MIN_HISTORY_LIMIT = 10;
    private static final int MAX_HISTORY_LIMIT = 100;

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatConversationMemberRepository chatConversationMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageReactionRepository chatMessageReactionRepository;
    private final ChatMessageReportRepository chatMessageReportRepository;
    private final ChatPinnedConversationRepository chatPinnedConversationRepository;
    private final ChatPinnedMessageRepository chatPinnedMessageRepository;
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
                .conversation(null)
                .content(request.getContent())
                .createdAt(now)
                .delivered(false)
                .deliveredAt(null)
                .seen(false)
                .seenAt(null)
                .build();
        message = chatMessageRepository.save(message);

        ChatMessageResponse response = toMessageResponse(message);

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
                .conversation(null)
                .content(content)
                .createdAt(now)
                .delivered(false)
                .deliveredAt(null)
                .seen(false)
                .seenAt(null)
                .build();
        message = chatMessageRepository.save(message);

        ChatMessageResponse response = toMessageResponse(message);

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
    @Transactional
    public ChatMessageResponse sendGroupMessage(String currentUsername, GroupMessageRequest request) {
        if (request == null || request.getConversationId() == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new RuntimeException("Message content is required");
        }

        User sender = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        ChatConversation conversation = chatConversationRepository.findByIdPlain(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        boolean isMember = chatConversationMemberRepository.existsByConversationIdAndUserId(conversation.getId(), sender.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }

        LocalDateTime now = LocalDateTime.now();
        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                // Keep compatibility with old DB schemas that still enforce NOT NULL on receiver_id.
                // For group messages, receiver is not used by business logic (conversation_id is used),
                // so falling back to sender avoids insert failures before schema migration is applied.
                .receiver(sender)
                .conversation(conversation)
                .content(request.getContent())
                .createdAt(now)
                .delivered(true)
                .deliveredAt(now)
                .seen(false)
                .seenAt(null)
                .build();
        message = chatMessageRepository.save(message);

        ChatMessageResponse response = toMessageResponse(message);
        List<ChatConversationMember> members = chatConversationMemberRepository.findMembersByConversationId(conversation.getId());
        for (ChatConversationMember member : members) {
            messagingTemplate.convertAndSendToUser(
                    member.getUser().getUsername(),
                    "/queue/messages",
                    response
            );
        }
        return response;
    }

    @Override
    @Transactional
    public ChatMessageResponse updateMessageReaction(String currentUsername, UUID messageId, MessageReactionRequest request) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        validateParticipant(message, actor);

        String emoji = request == null ? null : normalizeEmoji(request.getEmoji());
        if (emoji == null) {
            chatMessageReactionRepository.deleteByMessageIdAndUserId(messageId, actor.getId());
        } else {
            ChatMessageReaction reaction = chatMessageReactionRepository
                    .findByMessageIdAndUserId(messageId, actor.getId())
                    .orElseGet(() -> ChatMessageReaction.builder()
                            .message(message)
                            .user(actor)
                            .createdAt(LocalDateTime.now())
                            .build());
            reaction.setEmoji(emoji);
            if (reaction.getCreatedAt() == null) {
                reaction.setCreatedAt(LocalDateTime.now());
            }
            chatMessageReactionRepository.save(reaction);
        }

        ChatMessageResponse updated = toMessageResponse(message);
        broadcastMessageUpdate(message, updated);
        return updated;
    }

    @Override
    @Transactional
    public ChatMessageResponse deleteMessage(String currentUsername, UUID messageId) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(actor.getId())) {
            throw new RuntimeException("Only sender can delete this message");
        }

        if (!Boolean.TRUE.equals(message.getDeleted())) {
            message.setDeleted(true);
            message.setDeletedAt(LocalDateTime.now());
            message.setContent("Tin nhắn đã được gỡ");
            chatMessageRepository.save(message);
            chatMessageReactionRepository.deleteByMessageId(messageId);
        }

        ChatMessageResponse updated = toMessageResponse(message);
        broadcastMessageUpdate(message, updated);
        return updated;
    }

    @Override
    @Transactional
    public void reportMessage(String currentUsername, UUID messageId, MessageReportRequest request) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }
        User reporter = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        validateParticipant(message, reporter);

        String reason = request == null ? null : normalizeReason(request.getReason());
        ChatMessageReport report = ChatMessageReport.builder()
                .message(message)
                .reporter(reporter)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageReportRepository.save(report);
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
        enrichReactions(messages);

        LocalDateTime nextBeforeCreatedAt = messages.isEmpty() ? null : messages.get(0).getCreatedAt();
        return new ChatHistoryPageResponse(messages, hasMore, nextBeforeCreatedAt);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatHistoryPageResponse getGroupChatHistory(String currentUsername, UUID conversationId, LocalDateTime beforeCreatedAt, Integer limit) {
        if (conversationId == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        User viewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        boolean isMember = chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, viewer.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }

        int normalizedLimit = normalizeHistoryLimit(limit);
        List<ChatMessageResponse> chunkDesc = chatMessageRepository.findConversationChunkByConversationId(
                conversationId,
                beforeCreatedAt,
                PageRequest.of(0, normalizedLimit + 1)
        );
        boolean hasMore = chunkDesc.size() > normalizedLimit;
        if (hasMore) {
            chunkDesc = new ArrayList<>(chunkDesc.subList(0, normalizedLimit));
        }
        Collections.reverse(chunkDesc);
        List<ChatMessageResponse> messages = chunkDesc;
        enrichReactions(messages);
        LocalDateTime nextBeforeCreatedAt = messages.isEmpty() ? null : messages.get(0).getCreatedAt();
        return new ChatHistoryPageResponse(messages, hasMore, nextBeforeCreatedAt);
    }

    @Override
    @Transactional
    public GroupConversationResponse createGroupConversation(String currentUsername, CreateGroupConversationRequest request) {
        User creator = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<UUID> requested = request == null ? null : request.getMemberIds();
        if (requested == null) {
            throw new RuntimeException("Member IDs are required");
        }

        Set<UUID> memberIds = new LinkedHashSet<>();
        memberIds.add(creator.getId());
        requested.stream().filter(id -> id != null && !id.equals(creator.getId())).forEach(memberIds::add);
        if (memberIds.size() < 3) {
            throw new RuntimeException("Group must have at least 3 members");
        }

        List<User> users = userRepository.findAllById(memberIds);
        if (users.size() != memberIds.size()) {
            throw new RuntimeException("One or more users not found");
        }

        String normalizedName = request.getName() == null ? "" : request.getName().trim();
        String name = normalizedName.isBlank() ? "Nhóm chat" : normalizedName;
        String avatarUrl = request.getAvatarUrl() == null ? null : request.getAvatarUrl().trim();

        ChatConversation conversation = ChatConversation.builder()
                .name(name)
                .avatarUrl(avatarUrl == null || avatarUrl.isBlank() ? null : avatarUrl)
                .createdBy(creator)
                .createdAt(LocalDateTime.now())
                .build();
        conversation = chatConversationRepository.save(conversation);

        List<ChatConversationMember> members = new ArrayList<>();
        LocalDateTime joinedAt = LocalDateTime.now();
        for (User user : users) {
            members.add(ChatConversationMember.builder()
                    .conversation(conversation)
                    .user(user)
                    .joinedAt(joinedAt)
                    .build());
        }
        chatConversationMemberRepository.saveAll(members);
        return toGroupConversationResponse(conversation, members);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupConversationResponse> getMyGroupConversations(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatConversationMember> memberships = chatConversationMemberRepository.findByUserIdWithConversation(user.getId());
        List<GroupConversationResponse> responses = new ArrayList<>();
        for (ChatConversationMember membership : memberships) {
            ChatConversation conversation = membership.getConversation();
            List<ChatConversationMember> members = chatConversationMemberRepository.findMembersByConversationId(conversation.getId());
            responses.add(toGroupConversationResponse(conversation, members));
        }
        return responses;
    }

    @Override
    @Transactional
    public ConversationPinResponse setConversationPinned(String currentUsername, ConversationPinRequest request) {
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (request == null) {
            throw new RuntimeException("Request is required");
        }

        boolean pinned = Boolean.TRUE.equals(request.getPinned());
        UUID peerUserId = request.getPeerUserId();
        UUID conversationId = request.getConversationId();
        if ((peerUserId == null && conversationId == null) || (peerUserId != null && conversationId != null)) {
            throw new RuntimeException("Exactly one target is required");
        }

        if (peerUserId != null) {
            if (peerUserId.equals(owner.getId())) {
                throw new RuntimeException("Cannot pin self conversation");
            }
            User peer = userRepository.findById(peerUserId)
                    .orElseThrow(() -> new RuntimeException("Peer not found"));
            var existing = chatPinnedConversationRepository.findByOwnerAndPeer(owner.getId(), peerUserId);
            if (pinned && existing.isEmpty()) {
                chatPinnedConversationRepository.save(ChatPinnedConversation.builder()
                        .ownerUser(owner)
                        .peerUser(peer)
                        .conversation(null)
                        .createdAt(LocalDateTime.now())
                        .build());
            } else if (!pinned) {
                existing.ifPresent(chatPinnedConversationRepository::delete);
            }
            return new ConversationPinResponse(peerUserId, null, pinned);
        }

        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        boolean isMember = chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, owner.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }

        var existing = chatPinnedConversationRepository.findByOwnerAndConversation(owner.getId(), conversationId);
        if (pinned && existing.isEmpty()) {
            chatPinnedConversationRepository.save(ChatPinnedConversation.builder()
                    .ownerUser(owner)
                    .peerUser(null)
                    .conversation(conversation)
                    .createdAt(LocalDateTime.now())
                    .build());
        } else if (!pinned) {
            existing.ifPresent(chatPinnedConversationRepository::delete);
        }
        return new ConversationPinResponse(null, conversationId, pinned);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationPinResponse> getPinnedConversations(String currentUsername) {
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<ChatPinnedConversation> rows = chatPinnedConversationRepository.findByOwnerUserId(owner.getId());
        List<ConversationPinResponse> result = new ArrayList<>();
        for (ChatPinnedConversation row : rows) {
            result.add(new ConversationPinResponse(
                    row.getPeerUser() == null ? null : row.getPeerUser().getId(),
                    row.getConversation() == null ? null : row.getConversation().getId(),
                    true
            ));
        }
        return result;
    }

    @Override
    @Transactional
    public PinnedMessageResponse setPinnedMessage(String currentUsername, PinnedMessageRequest request) {
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (request == null) {
            throw new RuntimeException("Request is required");
        }
        boolean pinned = Boolean.TRUE.equals(request.getPinned());
        UUID peerUserId = request.getPeerUserId();
        UUID conversationId = request.getConversationId();
        UUID messageId = request.getMessageId();

        if ((peerUserId == null && conversationId == null) || (peerUserId != null && conversationId != null)) {
            throw new RuntimeException("Exactly one target is required");
        }

        if (!pinned) {
            if (peerUserId != null) {
                chatPinnedMessageRepository.findByOwnerAndPeer(owner.getId(), peerUserId)
                        .ifPresent(chatPinnedMessageRepository::delete);
                return new PinnedMessageResponse(peerUserId, null, null, null, false);
            }
            chatPinnedMessageRepository.findByOwnerAndConversation(owner.getId(), conversationId)
                    .ifPresent(chatPinnedMessageRepository::delete);
            return new PinnedMessageResponse(null, conversationId, null, null, false);
        }

        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }

        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        String preview = message.getDeleted() != null && message.getDeleted() ? "Tin nhắn đã được gỡ" : message.getContent();

        if (peerUserId != null) {
            if (message.getConversation() != null) {
                throw new RuntimeException("Message does not belong to private chat");
            }
            UUID senderId = message.getSender().getId();
            UUID receiverId = message.getReceiver() == null ? null : message.getReceiver().getId();
            boolean isValidPair =
                    (senderId.equals(owner.getId()) && peerUserId.equals(receiverId))
                            || (senderId.equals(peerUserId) && owner.getId().equals(receiverId));
            if (!isValidPair) {
                throw new RuntimeException("Message does not belong to target chat");
            }
            User peer = userRepository.findById(peerUserId)
                    .orElseThrow(() -> new RuntimeException("Peer not found"));
            ChatPinnedMessage row = chatPinnedMessageRepository.findByOwnerAndPeer(owner.getId(), peerUserId)
                    .orElse(ChatPinnedMessage.builder()
                            .ownerUser(owner)
                            .peerUser(peer)
                            .conversation(null)
                            .createdAt(LocalDateTime.now())
                            .build());
            row.setMessage(message);
            chatPinnedMessageRepository.save(row);
            return new PinnedMessageResponse(peerUserId, null, messageId, preview, true);
        }

        if (message.getConversation() == null || !message.getConversation().getId().equals(conversationId)) {
            throw new RuntimeException("Message does not belong to target conversation");
        }
        boolean isMember = chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, owner.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        ChatPinnedMessage row = chatPinnedMessageRepository.findByOwnerAndConversation(owner.getId(), conversationId)
                .orElse(ChatPinnedMessage.builder()
                        .ownerUser(owner)
                        .peerUser(null)
                        .conversation(conversation)
                        .createdAt(LocalDateTime.now())
                        .build());
        row.setMessage(message);
        chatPinnedMessageRepository.save(row);
        return new PinnedMessageResponse(null, conversationId, messageId, preview, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PinnedMessageResponse> getPinnedMessages(String currentUsername) {
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<ChatPinnedMessage> rows = chatPinnedMessageRepository.findByOwnerUserId(owner.getId());
        List<PinnedMessageResponse> result = new ArrayList<>();
        for (ChatPinnedMessage row : rows) {
            ChatMessage m = row.getMessage();
            String preview = (m.getDeleted() != null && m.getDeleted()) ? "Tin nhắn đã được gỡ" : m.getContent();
            result.add(new PinnedMessageResponse(
                    row.getPeerUser() == null ? null : row.getPeerUser().getId(),
                    row.getConversation() == null ? null : row.getConversation().getId(),
                    m.getId(),
                    preview,
                    true
            ));
        }
        return result;
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

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        List<String> reactions = chatMessageReactionRepository.findByMessageId(message.getId())
                .stream()
                .map(ChatMessageReaction::getEmoji)
                .toList();
        return new ChatMessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getReceiver() == null ? null : message.getReceiver().getId(),
                message.getConversation() == null ? null : message.getConversation().getId(),
                message.getContent(),
                message.getCreatedAt(),
                message.getDelivered(),
                message.getSeen(),
                message.getSeenAt(),
                message.getDeleted(),
                message.getDeletedAt(),
                reactions
        );
    }

    private void broadcastMessageUpdate(ChatMessage message, ChatMessageResponse response) {
        if (message.getConversation() != null) {
            List<ChatConversationMember> members = chatConversationMemberRepository.findMembersByConversationId(message.getConversation().getId());
            for (ChatConversationMember member : members) {
                messagingTemplate.convertAndSendToUser(
                        member.getUser().getUsername(),
                        "/queue/messages",
                        response
                );
            }
            return;
        }

        if (message.getReceiver() != null) {
            messagingTemplate.convertAndSendToUser(
                    message.getReceiver().getUsername(),
                    "/queue/messages",
                    response
            );
        }
        messagingTemplate.convertAndSendToUser(
                message.getSender().getUsername(),
                "/queue/messages",
                response
        );
    }

    private void validateParticipant(ChatMessage message, User actor) {
        UUID actorId = actor.getId();
        if (message.getConversation() != null) {
            boolean isMember = chatConversationMemberRepository.existsByConversationIdAndUserId(message.getConversation().getId(), actorId);
            if (!isMember) {
                throw new RuntimeException("Forbidden");
            }
            return;
        }
        if (!message.getSender().getId().equals(actorId) && !message.getReceiver().getId().equals(actorId)) {
            throw new RuntimeException("Forbidden");
        }
    }

    private String normalizeEmoji(String emoji) {
        if (emoji == null) return null;
        String normalized = emoji.trim();
        if (normalized.isEmpty()) return null;
        if (normalized.length() > 16) {
            return normalized.substring(0, 16);
        }
        return normalized;
    }

    private String normalizeReason(String reason) {
        if (reason == null) return null;
        String normalized = reason.trim();
        if (normalized.isEmpty()) return null;
        return normalized.length() > 1000 ? normalized.substring(0, 1000) : normalized;
    }

    private void enrichReactions(List<ChatMessageResponse> messages) {
        if (messages == null || messages.isEmpty()) return;
        List<UUID> messageIds = messages.stream().map(ChatMessageResponse::getId).toList();
        Map<UUID, List<String>> reactionsByMessage = new HashMap<>();
        for (Object[] row : chatMessageReactionRepository.findReactionsByMessageIds(messageIds)) {
            if (row == null || row.length < 2) continue;
            UUID messageId = (UUID) row[0];
            String emoji = (String) row[1];
            if (messageId == null || emoji == null || emoji.isBlank()) continue;
            reactionsByMessage.computeIfAbsent(messageId, key -> new ArrayList<>()).add(emoji);
        }
        messages.forEach(message -> message.setReactions(
                reactionsByMessage.getOrDefault(message.getId(), Collections.emptyList())
        ));
    }

    private GroupConversationResponse toGroupConversationResponse(ChatConversation conversation, List<ChatConversationMember> members) {
        List<GroupConversationMemberResponse> memberResponses = members.stream()
                .map(member -> new GroupConversationMemberResponse(
                        member.getUser().getId(),
                        member.getUser().getUsername(),
                        member.getUser().getFullName(),
                        member.getUser().getAvatarUrl()
                ))
                .toList();

        return new GroupConversationResponse(
                conversation.getId(),
                conversation.getName(),
                conversation.getAvatarUrl(),
                conversation.getCreatedAt(),
                conversation.getCreatedBy().getId(),
                memberResponses
        );
    }
}
