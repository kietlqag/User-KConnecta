package project.kconnecta.user.backend.feature.chat.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.exception.ResourceNotFoundException;
import project.kconnecta.user.backend.exception.ValidationException;
import project.kconnecta.user.backend.feature.activity.entity.enums.ActivityLogType;
import project.kconnecta.user.backend.feature.activity.service.ActivityLogService;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReactionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageReportRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.AddGroupMembersRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.GroupMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.LeaveGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.CreateGroupCallSessionRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationPinRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PinnedMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupConversationRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.UpdateGroupMemberNicknameRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatHistoryPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatAssetItemResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatAssetPageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationPinResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.ConversationSummaryResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.PinnedMessageResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationMemberResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupJoinLinkPreviewResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupJoinLinkResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.JoinGroupViaLinkResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupConversationResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.GroupCallSessionResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.MessageStatusResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversationMember;
import project.kconnecta.user.backend.feature.chat.entity.enums.ChatMemberStatus;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessage;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReaction;
import project.kconnecta.user.backend.feature.chat.entity.ChatMessageReport;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedConversation;
import project.kconnecta.user.backend.feature.chat.entity.ChatPinnedMessage;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageReactionRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatMessageReportRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatPinnedConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatPinnedMessageRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallSessionRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.policy.service.PolicyContentValidator;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final String CHAT_ACTION_PREFIX = "__CHAT_ACTION__:";
    private static final String IMAGE_MESSAGE_PREFIX = "__IMAGE__:";
    private static final String FILE_MESSAGE_PREFIX = "__FILE__:";
    private static final String REPLY_PREFIX = "__REPLY__:";
    private static final String LINK_REGEX = "https?://[^\\s<>\"']+";

    private static final int DEFAULT_HISTORY_LIMIT = 15;
    private static final int MIN_HISTORY_LIMIT = 1;
    private static final int MAX_HISTORY_LIMIT = 50;
    private static final int MAX_ASSET_LIMIT = 30;
    private static final int ASSET_SCAN_BATCH = 60;
    private static final int ASSET_SCAN_MAX_ROUNDS = 12;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
    private final GroupCallSessionRepository groupCallSessionRepository;
    private final PolicyContentValidator policyContentValidator;
    private final ActivityLogService activityLogService;

    @Override
    public void sendPrivateMessage(String currentUsername, PrivateMessageRequest request) {

        User sender = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        validateChatForSend(sender, request.getContent(), null, request.getMessageClientId());

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

        activityLogService.log(sender.getId(), sender.getUsername(), ActivityLogType.MESSAGE_SENT,
                "{\"messageId\":\"" + message.getId() + "\",\"type\":\"private\"}");

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

        boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversation.getId(), sender.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }

        validateChatForSend(sender, request.getContent(), conversation.getId(), request.getMessageClientId());

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

        activityLogService.log(sender.getId(), sender.getUsername(), ActivityLogType.MESSAGE_SENT,
                "{\"messageId\":\"" + message.getId() + "\",\"conversationId\":\"" + conversation.getId() + "\",\"type\":\"group\"}");

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

        List<ChatPinnedMessage> removedPins = chatPinnedMessageRepository.findByMessageIdWithTargets(messageId);
        chatPinnedMessageRepository.deleteByMessageId(messageId);
        ChatMessageResponse updated = toMessageResponse(message);
        broadcastMessageUpdate(message, updated);
        broadcastPinnedMessageRemoval(removedPins);
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

        activityLogService.log(reporter.getId(), reporter.getUsername(), ActivityLogType.REPORT_CREATED,
                "{\"targetType\":\"chat_message\",\"targetId\":\"" + messageId + "\"}");
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
        boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, viewer.getId());
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
    @Transactional(readOnly = true)
    public ChatAssetPageResponse getPrivateAssets(String currentUsername, UUID peerUserId, String type, LocalDateTime beforeCreatedAt, Integer limit) {
        User viewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (peerUserId == null) {
            throw new BadRequestException("Peer user ID is required");
        }
        AssetType assetType = normalizeAssetType(type);
        int normalizedLimit = normalizeAssetLimit(limit);
        return collectAssets(
                normalizedLimit,
                beforeCreatedAt,
                cursor -> chatMessageRepository.findPrivateChunkForAssets(viewer.getId(), peerUserId, cursor, PageRequest.of(0, ASSET_SCAN_BATCH)),
                assetType
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ChatAssetPageResponse getGroupAssets(String currentUsername, UUID conversationId, String type, LocalDateTime beforeCreatedAt, Integer limit) {
        User viewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (conversationId == null) {
            throw new BadRequestException("Conversation ID is required");
        }
        boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, viewer.getId());
        if (!isMember) {
            throw new ForbiddenException("Forbidden");
        }
        AssetType assetType = normalizeAssetType(type);
        int normalizedLimit = normalizeAssetLimit(limit);
        return collectAssets(
                normalizedLimit,
                beforeCreatedAt,
                cursor -> chatMessageRepository.findGroupChunkForAssets(conversationId, cursor, PageRequest.of(0, ASSET_SCAN_BATCH)),
                assetType
        );
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
                .joinLinkToken(generateJoinLinkToken())
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
                    .memberStatus(ChatMemberStatus.APPROVED)
                    .build());
        }
        chatConversationMemberRepository.saveAll(members);
        return toGroupConversationResponse(conversation, members);
    }

    @Override
    @Transactional
    public GroupConversationResponse updateGroupConversation(String currentUsername, UUID conversationId, UpdateGroupConversationRequest request) {
        if (conversationId == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId())) {
            throw new RuntimeException("Forbidden");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        String previousName = conversation.getName();
        String previousAvatarUrl = conversation.getAvatarUrl();
        String previousThemeColor = conversation.getThemeColor();

        if (request != null) {
            if (request.getMemberApprovalRequired() != null) {
                if (!conversation.getCreatedBy().getId().equals(actor.getId())) {
                    throw new RuntimeException("Only the group creator can change member approval settings");
                }
                conversation.setMemberApprovalRequired(request.getMemberApprovalRequired());
            }
            if (request.getName() != null) {
                String name = request.getName().trim();
                if (!name.isBlank()) {
                    conversation.setName(name.length() > 255 ? name.substring(0, 255) : name);
                }
            }
            if (request.getAvatarUrl() != null) {
                String avatarUrl = request.getAvatarUrl().trim();
                if (!avatarUrl.isBlank() && avatarUrl.length() > 1000) {
                    throw new BadRequestException("Avatar URL is too long");
                }
                conversation.setAvatarUrl(avatarUrl.isBlank() ? null : avatarUrl);
            }
            if (request.getThemeColor() != null) {
                String themeColor = request.getThemeColor().trim();
                conversation.setThemeColor(themeColor.isBlank() ? null : themeColor.substring(0, Math.min(themeColor.length(), 32)));
            }
        }

        ChatConversation saved = chatConversationRepository.save(conversation);
        if (request != null) {
            if (request.getName() != null && !equalsNullable(previousName, saved.getName())) {
                sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                        "rename_conversation",
                        actor,
                        null,
                        saved.getName()
                ));
            }
            if (request.getAvatarUrl() != null && !equalsNullable(previousAvatarUrl, saved.getAvatarUrl())) {
                sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                        "change_group_photo",
                        actor,
                        null,
                        null
                ));
            }
            if (request.getThemeColor() != null && !equalsNullable(previousThemeColor, saved.getThemeColor())) {
                sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                        "change_theme",
                        actor,
                        null,
                        null
                ));
            }
        }
        return toGroupConversationResponse(saved, chatConversationMemberRepository.findMembersByConversationId(conversationId));
    }

    @Override
    @Transactional
    public GroupConversationResponse updateGroupMemberNickname(
            String currentUsername,
            UUID conversationId,
            UUID memberUserId,
            UpdateGroupMemberNicknameRequest request
    ) {
        if (conversationId == null || memberUserId == null) {
            throw new RuntimeException("Conversation ID and member ID are required");
        }
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId())) {
            throw new RuntimeException("Forbidden");
        }
        ChatConversationMember target = chatConversationMemberRepository
                .findByConversationIdAndUserId(conversationId, memberUserId)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        String previousNickname = target.getNickname();

        String nickname = request == null ? null : request.getNickname();
        if (nickname == null || nickname.trim().isBlank()) {
            target.setNickname(null);
        } else {
            String normalized = nickname.trim();
            target.setNickname(normalized.length() > 120 ? normalized.substring(0, 120) : normalized);
        }
        chatConversationMemberRepository.save(target);
        if (!equalsNullable(previousNickname, target.getNickname())) {
            sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                    target.getNickname() == null ? "clear_nickname" : "change_nickname",
                    actor,
                    target.getUser(),
                    target.getNickname()
            ));
        }
        return toGroupConversationResponse(target.getConversation(), chatConversationMemberRepository.findMembersByConversationId(conversationId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupConversationResponse> getMyGroupConversations(String currentUsername) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatConversationMember> memberships = chatConversationMemberRepository.findApprovedByUserIdWithConversation(user.getId());
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
    public GroupConversationResponse addGroupMembers(String currentUsername, UUID conversationId, AddGroupMembersRequest request) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (conversationId == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId())) {
            throw new RuntimeException("You are not a member of this conversation");
        }

        List<UUID> requested = request == null ? null : request.getMemberIds();
        if (requested == null || requested.isEmpty()) {
            throw new RuntimeException("Member IDs are required");
        }

        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        Set<UUID> memberIds = requested.stream()
                .filter(id -> id != null && !id.equals(actor.getId()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (memberIds.isEmpty()) {
            return toGroupConversationResponse(
                    conversation,
                    chatConversationMemberRepository.findMembersByConversationId(conversationId)
            );
        }

        List<User> users = userRepository.findAllById(memberIds);
        if (users.size() != memberIds.size()) {
            throw new RuntimeException("One or more users not found");
        }

        boolean isCreator = conversation.getCreatedBy().getId().equals(actor.getId());
        boolean requiresApproval = conversation.isMemberApprovalRequired() && !isCreator;
        ChatMemberStatus memberStatus = requiresApproval ? ChatMemberStatus.PENDING : ChatMemberStatus.APPROVED;

        LocalDateTime joinedAt = LocalDateTime.now();
        List<ChatConversationMember> newMembers = users.stream()
                .filter(user -> !chatConversationMemberRepository.existsByConversationIdAndUserId(conversationId, user.getId()))
                .map(user -> ChatConversationMember.builder()
                        .conversation(conversation)
                        .user(user)
                        .joinedAt(joinedAt)
                        .memberStatus(memberStatus)
                        .build())
                .toList();

        if (!newMembers.isEmpty()) {
            chatConversationMemberRepository.saveAll(newMembers);
            String addedNames = newMembers.stream()
                    .map(ChatConversationMember::getUser)
                    .map(this::displayName)
                    .collect(Collectors.joining(", "));
            sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                    requiresApproval ? "add_members_pending" : "add_members",
                    actor,
                    null,
                    addedNames
            ));
        }

        return toGroupConversationResponse(
                conversation,
                chatConversationMemberRepository.findMembersByConversationId(conversationId)
        );
    }

    @Override
    @Transactional
    public GroupConversationResponse approveGroupMember(String currentUsername, UUID conversationId, UUID targetUserId) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!conversation.getCreatedBy().getId().equals(actor.getId())) {
            throw new RuntimeException("Only the group creator can approve members");
        }

        ChatConversationMember member = chatConversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Member request not found"));
        if (member.getMemberStatus() != ChatMemberStatus.PENDING) {
            throw new RuntimeException("Member is not pending approval");
        }
        member.setMemberStatus(ChatMemberStatus.APPROVED);
        chatConversationMemberRepository.save(member);
        sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                "approve_member",
                actor,
                member.getUser(),
                null
        ));
        return toGroupConversationResponse(conversation, chatConversationMemberRepository.findMembersByConversationId(conversationId));
    }

    @Override
    @Transactional
    public GroupConversationResponse rejectGroupMember(String currentUsername, UUID conversationId, UUID targetUserId) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!conversation.getCreatedBy().getId().equals(actor.getId())) {
            throw new RuntimeException("Only the group creator can reject members");
        }

        ChatConversationMember member = chatConversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Member request not found"));
        if (member.getMemberStatus() != ChatMemberStatus.PENDING) {
            throw new RuntimeException("Member is not pending approval");
        }
        User target = member.getUser();
        chatConversationMemberRepository.delete(member);
        sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                "reject_member",
                actor,
                target,
                null
        ));
        return toGroupConversationResponse(conversation, chatConversationMemberRepository.findMembersByConversationId(conversationId));
    }

    @Override
    @Transactional
    public GroupConversationResponse removeGroupMember(String currentUsername, UUID conversationId, UUID targetUserId) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        if (!conversation.getCreatedBy().getId().equals(actor.getId())) {
            throw new RuntimeException("Only the group creator can remove members");
        }
        if (targetUserId.equals(actor.getId())) {
            throw new BadRequestException("Use leave group to remove yourself");
        }
        if (targetUserId.equals(conversation.getCreatedBy().getId())) {
            throw new BadRequestException("Cannot remove the group creator");
        }

        ChatConversationMember member = chatConversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        if (member.getMemberStatus() != ChatMemberStatus.APPROVED) {
            throw new RuntimeException("Only approved members can be removed");
        }
        User target = member.getUser();
        chatConversationMemberRepository.delete(member);
        sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                "remove_member",
                actor,
                target,
                null
        ));
        return toGroupConversationResponse(conversation, chatConversationMemberRepository.findMembersByConversationId(conversationId));
    }

    @Override
    @Transactional
    public GroupConversationResponse leaveGroupConversation(
            String currentUsername,
            UUID conversationId,
            LeaveGroupConversationRequest request
    ) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (conversationId == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        ChatConversationMember membership = chatConversationMemberRepository
                .findByConversationIdAndUserId(conversationId, actor.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this conversation"));
        if (membership.getMemberStatus() != ChatMemberStatus.APPROVED) {
            throw new RuntimeException("Only approved members can leave the group");
        }

        boolean isCreator = conversation.getCreatedBy().getId().equals(actor.getId());
        if (isCreator) {
            UUID newAdminUserId = request == null ? null : request.getNewAdminUserId();
            if (newAdminUserId == null) {
                throw new BadRequestException("Group admin must assign a new admin before leaving");
            }
            if (newAdminUserId.equals(actor.getId())) {
                throw new BadRequestException("New admin must be another member");
            }
            if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, newAdminUserId)) {
                throw new BadRequestException("Selected member is not in this group");
            }
            User newAdmin = userRepository.findById(newAdminUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            conversation.setCreatedBy(newAdmin);
            chatConversationRepository.save(conversation);
            sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                    "transfer_admin",
                    actor,
                    newAdmin,
                    null
            ));
        }

        chatConversationMemberRepository.delete(membership);
        sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                "leave_group",
                actor,
                null,
                null
        ));
        return toGroupConversationResponse(
                conversation,
                chatConversationMemberRepository.findMembersByConversationId(conversationId)
        );
    }

    @Override
    @Transactional
    public void dissolveGroupConversation(String currentUsername, UUID conversationId) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (conversationId == null) {
            throw new BadRequestException("Conversation ID is required");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        if (!conversation.getCreatedBy().getId().equals(actor.getId())) {
            throw new ForbiddenException("Only group admin can dissolve this group");
        }
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId())) {
            throw new ForbiddenException("Forbidden");
        }
        chatConversationRepository.delete(conversation);
    }

    @Override
    @Transactional
    public GroupJoinLinkResponse getGroupJoinLink(String currentUsername, UUID conversationId) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (conversationId == null) {
            throw new RuntimeException("Conversation ID is required");
        }
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId())) {
            throw new RuntimeException("You are not a member of this conversation");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        ensureJoinLinkToken(conversation);
        return GroupJoinLinkResponse.builder()
                .conversationId(conversation.getId())
                .token(conversation.getJoinLinkToken())
                .memberApprovalRequired(conversation.isMemberApprovalRequired())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupJoinLinkPreviewResponse previewGroupJoinLink(String currentUsername, String token) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String normalizedToken = token == null ? "" : token.trim();
        if (normalizedToken.isBlank()) {
            throw new BadRequestException("Join link token is required");
        }
        ChatConversation conversation = chatConversationRepository.findByJoinLinkToken(normalizedToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid join link"));

        String membershipStatus = "NONE";
        Optional<ChatConversationMember> existing = chatConversationMemberRepository
                .findByConversationIdAndUserId(conversation.getId(), actor.getId());
        if (existing.isPresent()) {
            ChatMemberStatus status = existing.get().getMemberStatus();
            if (status == ChatMemberStatus.PENDING) {
                membershipStatus = "PENDING";
            } else if (status == ChatMemberStatus.APPROVED) {
                membershipStatus = "MEMBER";
            }
        }

        long memberCount = chatConversationMemberRepository.findMembersByConversationId(conversation.getId())
                .stream()
                .filter(member -> member.getMemberStatus() == null || member.getMemberStatus() == ChatMemberStatus.APPROVED)
                .count();

        return GroupJoinLinkPreviewResponse.builder()
                .conversationId(conversation.getId())
                .conversationName(conversation.getName())
                .avatarUrl(conversation.getAvatarUrl())
                .memberCount(Math.toIntExact(memberCount))
                .memberApprovalRequired(conversation.isMemberApprovalRequired())
                .membershipStatus(membershipStatus)
                .build();
    }

    @Override
    @Transactional
    public JoinGroupViaLinkResponse joinGroupViaLink(String currentUsername, String token) {
        User actor = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String normalizedToken = token == null ? "" : token.trim();
        if (normalizedToken.isBlank()) {
            throw new BadRequestException("Join link token is required");
        }
        ChatConversation conversation = chatConversationRepository.findByJoinLinkToken(normalizedToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid join link"));

        Optional<ChatConversationMember> existing = chatConversationMemberRepository
                .findByConversationIdAndUserId(conversation.getId(), actor.getId());
        if (existing.isPresent()) {
            ChatMemberStatus status = existing.get().getMemberStatus();
            if (status == ChatMemberStatus.PENDING) {
                return JoinGroupViaLinkResponse.builder()
                        .status("ALREADY_PENDING")
                        .conversationId(conversation.getId())
                        .conversationName(conversation.getName())
                        .message("Yêu cầu tham gia của bạn đang chờ quản trị viên duyệt.")
                        .build();
            }
            return JoinGroupViaLinkResponse.builder()
                    .status("ALREADY_MEMBER")
                    .conversationId(conversation.getId())
                    .conversationName(conversation.getName())
                    .message("Bạn đã là thành viên của nhóm này.")
                    .build();
        }

        boolean requiresApproval = conversation.isMemberApprovalRequired();
        ChatConversationMember member = ChatConversationMember.builder()
                .conversation(conversation)
                .user(actor)
                .joinedAt(LocalDateTime.now())
                .memberStatus(requiresApproval ? ChatMemberStatus.PENDING : ChatMemberStatus.APPROVED)
                .build();
        chatConversationMemberRepository.save(member);
        sendGroupSystemMessage(actor.getId(), conversation.getId(), buildChatActionContent(
                requiresApproval ? "join_via_link_pending" : "join_via_link",
                actor,
                null,
                null
        ));

        if (requiresApproval) {
            return JoinGroupViaLinkResponse.builder()
                    .status("PENDING")
                    .conversationId(conversation.getId())
                    .conversationName(conversation.getName())
                    .message("Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên duyệt.")
                    .build();
        }
        return JoinGroupViaLinkResponse.builder()
                .status("JOINED")
                .conversationId(conversation.getId())
                .conversationName(conversation.getName())
                .message("Bạn đã tham gia nhóm chat.")
                .build();
    }

    @Override
    @Transactional
    public void sendGroupSystemMessage(UUID senderId, UUID conversationId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        LocalDateTime now = LocalDateTime.now();
        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .receiver(sender)
                .conversation(conversation)
                .content(content)
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
    }

    @Override
    @Transactional
    public GroupCallSessionResponse createGroupCallSession(
            String currentUsername,
            UUID conversationId,
            CreateGroupCallSessionRequest request
    ) {
        User caller = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (conversationId == null) {
            throw new BadRequestException("Conversation ID is required");
        }
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, caller.getId())) {
            throw new ForbiddenException("You are not a member of this conversation");
        }

        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        String mediaType = request != null && "video".equalsIgnoreCase(request.getMediaType()) ? "video" : "audio";
        LocalDateTime now = LocalDateTime.now();

        GroupCallSession session = GroupCallSession.builder()
                .callId(UUID.randomUUID())
                .conversation(conversation)
                .caller(caller)
                .startedAt(now)
                .status("RINGING")
                .lastSignalType("CALL_INVITE")
                .callMediaType(mediaType)
                .build();

        return toGroupCallSessionResponse(groupCallSessionRepository.save(session), now);
    }

    @Override
    @Transactional(readOnly = true)
    public GroupCallSessionResponse getGroupCallSessionSnapshot(String currentUsername, UUID callId) {
        User viewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        GroupCallSession session = groupCallSessionRepository.findByCallIdWithDetails(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Group call session not found"));
        UUID conversationId = session.getConversation().getId();
        if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, viewer.getId())) {
            throw new ForbiddenException("You are not a member of this conversation");
        }
        return toGroupCallSessionResponse(session, LocalDateTime.now());
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
        boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, owner.getId());
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
        User actor = userRepository.findByUsername(currentUsername)
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
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }

        ChatMessage message = chatMessageRepository.findByIdWithUsers(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (Boolean.TRUE.equals(message.getDeleted())) {
            throw new RuntimeException("Cannot pin deleted message");
        }

        if (peerUserId != null) {
            if (message.getConversation() != null) {
                throw new RuntimeException("Message does not belong to private chat");
            }
            UUID senderId = message.getSender().getId();
            UUID receiverId = message.getReceiver() == null ? null : message.getReceiver().getId();
            boolean isValidPair =
                    (senderId.equals(actor.getId()) && peerUserId.equals(receiverId))
                            || (senderId.equals(peerUserId) && actor.getId().equals(receiverId));
            if (!isValidPair) {
                throw new RuntimeException("Message does not belong to target chat");
            }
            User peer = userRepository.findById(peerUserId)
                    .orElseThrow(() -> new RuntimeException("Peer not found"));
            List<User> owners = List.of(actor, peer);
            LocalDateTime now = LocalDateTime.now();
            if (pinned) {
                for (User owner : owners) {
                    User ownerPeer = owner.getId().equals(actor.getId()) ? peer : actor;
                    ChatPinnedMessage row = chatPinnedMessageRepository
                            .findByOwnerAndPeerAndMessage(owner.getId(), ownerPeer.getId(), messageId)
                            .orElse(ChatPinnedMessage.builder()
                                    .ownerUser(owner)
                                    .peerUser(ownerPeer)
                                    .conversation(null)
                                    .createdAt(now)
                                    .build());
                    row.setMessage(message);
                    row.setPinnedBy(actor);
                    chatPinnedMessageRepository.save(row);
                }
            } else {
                for (User owner : owners) {
                    UUID ownerPeerId = owner.getId().equals(actor.getId()) ? peer.getId() : actor.getId();
                    chatPinnedMessageRepository.findByOwnerAndPeerAndMessage(owner.getId(), ownerPeerId, messageId)
                            .ifPresent(chatPinnedMessageRepository::delete);
                }
            }
            for (User owner : owners) {
                UUID ownerPeerId = owner.getId().equals(actor.getId()) ? peer.getId() : actor.getId();
                PinnedMessageResponse ownerResponse = toPinnedMessageResponse(null, ownerPeerId, null, message, actor, now, pinned);
                messagingTemplate.convertAndSendToUser(
                        owner.getUsername(),
                        "/queue/pinned-messages",
                        ownerResponse
                );
            }
            PinnedMessageResponse response = toPinnedMessageResponse(null, peerUserId, null, message, actor, now, pinned);
            return response;
        }

        if (message.getConversation() == null || !message.getConversation().getId().equals(conversationId)) {
            throw new RuntimeException("Message does not belong to target conversation");
        }
        boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversationId, actor.getId());
        if (!isMember) {
            throw new RuntimeException("Forbidden");
        }
        ChatConversation conversation = chatConversationRepository.findByIdPlain(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        List<User> owners = chatConversationMemberRepository.findMembersByConversationId(conversationId)
                .stream()
                .map(ChatConversationMember::getUser)
                .toList();
        LocalDateTime now = LocalDateTime.now();
        if (pinned) {
            for (User owner : owners) {
                ChatPinnedMessage row = chatPinnedMessageRepository
                        .findByOwnerAndConversationAndMessage(owner.getId(), conversationId, messageId)
                        .orElse(ChatPinnedMessage.builder()
                                .ownerUser(owner)
                                .peerUser(null)
                                .conversation(conversation)
                                .createdAt(now)
                                .build());
                row.setMessage(message);
                row.setPinnedBy(actor);
                chatPinnedMessageRepository.save(row);
            }
        } else {
            for (User owner : owners) {
                chatPinnedMessageRepository.findByOwnerAndConversationAndMessage(owner.getId(), conversationId, messageId)
                        .ifPresent(chatPinnedMessageRepository::delete);
            }
        }
        PinnedMessageResponse response = toPinnedMessageResponse(null, null, conversationId, message, actor, now, pinned);
        broadcastPinnedMessageChange(owners, response);
        sendGroupSystemMessage(actor.getId(), conversationId, buildChatActionContent(
                pinned ? "pin_message" : "unpin_message",
                actor,
                null,
                null
        ));
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PinnedMessageResponse> getPinnedMessages(String currentUsername) {
        User owner = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<ChatPinnedMessage> rows = chatPinnedMessageRepository.findByOwnerUserId(owner.getId());
        List<PinnedMessageResponse> result = new ArrayList<>();
        for (ChatPinnedMessage row : rows) {
            result.add(toPinnedMessageResponse(row, null, null, null, null, null, true));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> getConversationSummaries(
            String currentUsername,
            List<UUID> peerUserIds,
            List<UUID> conversationIds
    ) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ConversationSummaryResponse> result = new ArrayList<>();
        UUID currentUserId = currentUser.getId();

        List<UUID> safePeerIds = peerUserIds == null ? Collections.emptyList() : peerUserIds.stream()
                .filter(id -> id != null && !id.equals(currentUserId))
                .distinct()
                .toList();
        if (!safePeerIds.isEmpty()) {
            Map<UUID, Integer> unreadByPeer = new HashMap<>();
            for (ChatMessageRepository.PrivateUnreadCountRow row : chatMessageRepository.countUnreadPrivateByPeer(currentUserId, safePeerIds)) {
                unreadByPeer.put(row.getPeerUserId(), row.getUnreadCount() == null ? 0 : row.getUnreadCount());
            }

            for (ChatMessageRepository.PrivateSummaryRow row : chatMessageRepository.findLatestPrivateSummaries(currentUserId, safePeerIds)) {
                result.add(new ConversationSummaryResponse(
                        row.getPeerUserId(),
                        null,
                        row.getLastMessageContent(),
                        row.getLastMessageSenderId(),
                        row.getLastMessageCreatedAt(),
                        unreadByPeer.getOrDefault(row.getPeerUserId(), 0)
                ));
            }
        }

        List<UUID> safeConversationIds = conversationIds == null ? Collections.emptyList() : conversationIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!safeConversationIds.isEmpty()) {
            Set<UUID> allowedConversationIds = chatConversationMemberRepository.findApprovedByUserIdWithConversation(currentUserId)
                    .stream()
                    .map(member -> member.getConversation().getId())
                    .collect(Collectors.toSet());

            List<UUID> filteredConversationIds = safeConversationIds.stream()
                    .filter(allowedConversationIds::contains)
                    .toList();
            if (!filteredConversationIds.isEmpty()) {
                for (ChatMessageRepository.GroupSummaryRow row : chatMessageRepository.findLatestGroupSummaries(filteredConversationIds)) {
                    result.add(new ConversationSummaryResponse(
                            null,
                            row.getConversationId(),
                            row.getLastMessageContent(),
                            row.getLastMessageSenderId(),
                            row.getLastMessageCreatedAt(),
                            0
                    ));
                }
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public int getTotalPrivateUnreadCount(String currentUsername) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User not found"));
        long count = chatMessageRepository.countTotalPrivateUnread(currentUser.getId());
        return count > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) count;
    }

    private PinnedMessageResponse toPinnedMessageResponse(
            ChatPinnedMessage row,
            UUID peerUserId,
            UUID conversationId,
            ChatMessage message,
            User pinnedBy,
            LocalDateTime pinnedAt,
            Boolean pinned
    ) {
        ChatMessage m = row == null ? message : row.getMessage();
        User pinActor = row == null ? pinnedBy : (row.getPinnedBy() == null ? row.getOwnerUser() : row.getPinnedBy());
        LocalDateTime createdAt = row == null ? pinnedAt : row.getCreatedAt();
        UUID resolvedPeerUserId = row == null
                ? peerUserId
                : row.getPeerUser() == null ? null : row.getPeerUser().getId();
        UUID resolvedConversationId = row == null
                ? conversationId
                : row.getConversation() == null ? null : row.getConversation().getId();
        return new PinnedMessageResponse(
                row == null ? null : row.getId(),
                resolvedPeerUserId,
                resolvedConversationId,
                m == null ? null : m.getId(),
                pinActor == null ? null : pinActor.getId(),
                createdAt,
                m == null ? null : m.getSender().getId(),
                m == null ? null : (m.getSender().getFullName() == null || m.getSender().getFullName().isBlank()
                        ? m.getSender().getUsername()
                        : m.getSender().getFullName()),
                m == null ? null : m.getSender().getAvatarUrl(),
                m == null ? null : m.getContent(),
                m == null ? null : m.getCreatedAt(),
                pinned
        );
    }

    private void broadcastPinnedMessageChange(List<User> recipients, PinnedMessageResponse response) {
        for (User recipient : recipients) {
            messagingTemplate.convertAndSendToUser(
                    recipient.getUsername(),
                    "/queue/pinned-messages",
                    response
            );
        }
    }

    private void broadcastPinnedMessageRemoval(List<ChatPinnedMessage> removedPins) {
        for (ChatPinnedMessage row : removedPins) {
            PinnedMessageResponse response = toPinnedMessageResponse(row, null, null, null, null, null, false);
            messagingTemplate.convertAndSendToUser(
                    row.getOwnerUser().getUsername(),
                    "/queue/pinned-messages",
                    response
            );
        }
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
            throw new BadRequestException("Call ID is required");
        }
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        CallSession session = callSessionRepository.findByCallIdWithUsers(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call session not found"));

        UUID userId = currentUser.getId();
        boolean isParticipant = session.getCaller().getId().equals(userId) || session.getCallee().getId().equals(userId);
        if (!isParticipant) {
            throw new ForbiddenException("Forbidden");
        }

        return toSnapshot(session, LocalDateTime.now());
    }

    public static CallSessionSnapshotResponse toSnapshot(CallSession session, LocalDateTime now) {
        Integer durationSec = session.getDurationSec();
        if ("ONGOING".equals(session.getStatus()) && session.getAnsweredAt() != null && session.getEndedAt() == null) {
            durationSec = calculateDurationSec(session.getAnsweredAt(), now);
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

    private static int calculateDurationSec(LocalDateTime startedAt, LocalDateTime endedAt) {
        if (startedAt == null || endedAt == null) {
            return 0;
        }
        int durationSec = (int) ChronoUnit.SECONDS.between(startedAt, endedAt);
        return Math.max(durationSec, 0);
    }

    private boolean equalsNullable(String first, String second) {
        if (first == null) {
            return second == null;
        }
        return first.equals(second);
    }

    private String displayName(User user) {
        if (user == null) {
            return "Người dùng";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private String generateJoinLinkToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void ensureJoinLinkToken(ChatConversation conversation) {
        if (conversation.getJoinLinkToken() == null || conversation.getJoinLinkToken().isBlank()) {
            conversation.setJoinLinkToken(generateJoinLinkToken());
            chatConversationRepository.save(conversation);
        }
    }

    private String buildChatActionContent(String type, User actor, User target, String value) {
        return CHAT_ACTION_PREFIX
                + "{\"type\":\""
                + escapeJson(type)
                + "\",\"actorName\":\""
                + escapeJson(displayName(actor))
                + "\",\"targetName\":"
                + (target == null ? "null" : "\"" + escapeJson(displayName(target)) + "\"")
                + ",\"value\":"
                + (value == null ? "null" : "\"" + escapeJson(value) + "\"")
                + "}";
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
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
            List<ChatConversationMember> members = chatConversationMemberRepository.findMembersByConversationId(message.getConversation().getId())
                    .stream()
                    .filter(member -> member.getMemberStatus() == null || member.getMemberStatus() == ChatMemberStatus.APPROVED)
                    .toList();
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
            boolean isMember = chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(message.getConversation().getId(), actorId);
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

    private AssetType normalizeAssetType(String type) {
        if (type == null || type.isBlank()) {
            throw new BadRequestException("Asset type is required");
        }
        return switch (type.trim().toLowerCase()) {
            case "media" -> AssetType.MEDIA;
            case "files", "file" -> AssetType.FILES;
            case "links", "link" -> AssetType.LINKS;
            default -> throw new BadRequestException("Unsupported asset type");
        };
    }

    private int normalizeAssetLimit(Integer limit) {
        if (limit == null) return 10;
        return Math.max(1, Math.min(MAX_ASSET_LIMIT, limit));
    }

    private ChatAssetPageResponse collectAssets(
            int limit,
            LocalDateTime beforeCreatedAt,
            java.util.function.Function<LocalDateTime, List<ChatMessage>> loader,
            AssetType type
    ) {
        List<ChatAssetItemResponse> collected = new ArrayList<>();
        LocalDateTime cursor = beforeCreatedAt;
        boolean sourceHasMore = true;
        int rounds = 0;

        while (collected.size() < limit + 1 && sourceHasMore && rounds < ASSET_SCAN_MAX_ROUNDS) {
            List<ChatMessage> chunk = loader.apply(cursor);
            if (chunk.isEmpty()) {
                sourceHasMore = false;
                break;
            }
            for (ChatMessage message : chunk) {
                if (Boolean.TRUE.equals(message.getDeleted())) continue;
                collected.addAll(mapMessageToAssets(message, type));
                if (collected.size() >= limit + 1) break;
            }
            sourceHasMore = chunk.size() >= ASSET_SCAN_BATCH;
            cursor = chunk.get(chunk.size() - 1).getCreatedAt();
            rounds += 1;
        }

        boolean hasMore = collected.size() > limit || sourceHasMore;
        List<ChatAssetItemResponse> page = collected.size() > limit
                ? new ArrayList<>(collected.subList(0, limit))
                : collected;
        LocalDateTime nextBefore = page.isEmpty() ? cursor : page.get(page.size() - 1).getCreatedAt();
        return ChatAssetPageResponse.builder()
                .items(page)
                .hasMore(hasMore)
                .nextBeforeCreatedAt(nextBefore)
                .build();
    }

    private List<ChatAssetItemResponse> mapMessageToAssets(ChatMessage message, AssetType type) {
        String content = message.getContent();
        if (content == null || content.isBlank()) return Collections.emptyList();
        return switch (type) {
            case MEDIA -> extractMediaAssets(message, content);
            case FILES -> extractFileAssets(message, content);
            case LINKS -> extractLinkAssets(message, content);
        };
    }

    private List<ChatAssetItemResponse> extractMediaAssets(ChatMessage message, String content) {
        if (!content.startsWith(IMAGE_MESSAGE_PREFIX)) return Collections.emptyList();
        JsonNode payload = parseJsonContent(content.substring(IMAGE_MESSAGE_PREFIX.length()));
        if (payload == null) return Collections.emptyList();

        List<ChatAssetItemResponse> items = new ArrayList<>();
        JsonNode imageUrls = payload.get("imageUrls");
        if (imageUrls != null && imageUrls.isArray()) {
            int index = 0;
            for (JsonNode urlNode : imageUrls) {
                String url = safeText(urlNode);
                if (url == null || url.isBlank()) continue;
                items.add(assetItem(message, "image", url, "Ảnh", null, index++));
            }
        } else {
            String url = safeText(payload.get("imageUrl"));
            if (url != null && !url.isBlank()) {
                items.add(assetItem(message, "image", url, "Ảnh", null, 0));
            }
        }
        return items;
    }

    private List<ChatAssetItemResponse> extractFileAssets(ChatMessage message, String content) {
        if (!content.startsWith(FILE_MESSAGE_PREFIX)) return Collections.emptyList();
        JsonNode payload = parseJsonContent(content.substring(FILE_MESSAGE_PREFIX.length()));
        if (payload == null) return Collections.emptyList();

        String url = safeText(payload.get("fileUrl"));
        if (url == null || url.isBlank()) return Collections.emptyList();
        String label = safeText(payload.get("fileName"));
        String mime = safeText(payload.get("mimeType"));
        String meta = mime == null || mime.isBlank() ? "File" : mime;

        return List.of(assetItem(message, "file", url, (label == null || label.isBlank()) ? "File" : label, meta, 0));
    }

    private List<ChatAssetItemResponse> extractLinkAssets(ChatMessage message, String content) {
        String source = extractPlainTextForLinks(content);
        if (source == null || source.isBlank()) return Collections.emptyList();
        Pattern pattern = Pattern.compile(LINK_REGEX);
        Matcher matcher = pattern.matcher(source);
        List<ChatAssetItemResponse> items = new ArrayList<>();
        int index = 0;
        while (matcher.find()) {
            String url = matcher.group();
            if (url == null || url.isBlank()) continue;
            items.add(assetItem(message, "link", trimTrailingPunctuation(url), null, null, index++));
        }
        return items;
    }

    private String extractPlainTextForLinks(String content) {
        if (content.startsWith(REPLY_PREFIX)) {
            JsonNode payload = parseJsonContent(content.substring(REPLY_PREFIX.length()));
            return payload == null ? "" : safeText(payload.get("text"));
        }
        if (content.startsWith(IMAGE_MESSAGE_PREFIX)) {
            JsonNode payload = parseJsonContent(content.substring(IMAGE_MESSAGE_PREFIX.length()));
            return payload == null ? "" : safeText(payload.get("caption"));
        }
        if (content.startsWith(FILE_MESSAGE_PREFIX) || content.startsWith(CHAT_ACTION_PREFIX) || content.startsWith("__CALL_LOG__:") || content.startsWith("__VOICE__:")) {
            return "";
        }
        return content;
    }

    private ChatAssetItemResponse assetItem(ChatMessage message, String type, String url, String label, String meta, int index) {
        return ChatAssetItemResponse.builder()
                .id(message.getId() + "-" + type + "-" + index)
                .type(type)
                .url(url)
                .label(label)
                .meta(meta)
                .createdAt(message.getCreatedAt())
                .build();
    }

    private JsonNode parseJsonContent(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String safeText(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.asText(null);
    }

    private String trimTrailingPunctuation(String url) {
        return url.replaceAll("[),.;!?]+$", "");
    }

    private enum AssetType {
        MEDIA,
        FILES,
        LINKS
    }

    private GroupConversationResponse toGroupConversationResponse(ChatConversation conversation, List<ChatConversationMember> members) {
        List<GroupConversationMemberResponse> memberResponses = members.stream()
                .map(member -> new GroupConversationMemberResponse(
                        member.getUser().getId(),
                        member.getUser().getUsername(),
                        member.getUser().getFullName(),
                        member.getUser().getAvatarUrl(),
                        member.getNickname(),
                        member.getMemberStatus() == null ? ChatMemberStatus.APPROVED.name() : member.getMemberStatus().name()
                ))
                .toList();

        return new GroupConversationResponse(
                conversation.getId(),
                conversation.getName(),
                conversation.getAvatarUrl(),
                conversation.getThemeColor(),
                conversation.getCreatedAt(),
                conversation.getCreatedBy().getId(),
                conversation.isMemberApprovalRequired(),
                memberResponses
        );
    }

    private GroupCallSessionResponse toGroupCallSessionResponse(GroupCallSession session, LocalDateTime now) {
        Integer durationSec = session.getDurationSec();
        if ("ONGOING".equals(session.getStatus()) && session.getAnsweredAt() != null && durationSec == null) {
            durationSec = calculateDurationSec(session.getAnsweredAt(), now);
        }
        return new GroupCallSessionResponse(
                session.getCallId(),
                session.getConversation().getId(),
                session.getCaller().getId(),
                session.getStatus(),
                session.getCallMediaType(),
                session.getStartedAt(),
                session.getAnsweredAt(),
                session.getEndedAt(),
                durationSec
        );
    }

    private void validateChatForSend(User sender, String content, UUID conversationId, String messageClientId) {
        try {
            policyContentValidator.validateChatMessage(sender.getId(), content, conversationId, messageClientId);
        } catch (ChatValidationException e) {
            activityLogService.log(sender.getId(), sender.getUsername(), ActivityLogType.MESSAGE_BLOCKED_SPAM,
                    "{\"reason\":\"" + escapeJson(e.getMessage()) + "\"}");
            throw e;
        } catch (ValidationException e) {
            activityLogService.log(sender.getId(), sender.getUsername(), ActivityLogType.MESSAGE_BLOCKED_KEYWORD,
                    "{\"reason\":\"" + escapeJson(e.getMessage()) + "\"}");
            throw e;
        }
    }
}
