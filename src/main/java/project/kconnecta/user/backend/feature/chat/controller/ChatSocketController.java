package project.kconnecta.user.backend.feature.chat.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import project.kconnecta.user.backend.exception.BadRequestException;
import project.kconnecta.user.backend.exception.ChatValidationException;
import project.kconnecta.user.backend.exception.ForbiddenException;
import project.kconnecta.user.backend.feature.chat.dto.response.ChatErrorMessage;
import project.kconnecta.user.backend.feature.chat.dto.request.CallSignalRequest;
import project.kconnecta.user.backend.feature.chat.dto.CallParticipantInfo;
import project.kconnecta.user.backend.feature.chat.dto.request.ConversationSeenRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.GroupMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.MessageDeliveredRequest;
import project.kconnecta.user.backend.feature.chat.dto.request.PrivateMessageRequest;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSessionSnapshotResponse;
import project.kconnecta.user.backend.feature.chat.dto.response.CallSignalResponse;
import project.kconnecta.user.backend.feature.chat.entity.CallSession;
import project.kconnecta.user.backend.feature.chat.entity.CallSignalEvent;
import project.kconnecta.user.backend.feature.chat.entity.ChatConversation;
import project.kconnecta.user.backend.feature.chat.entity.GroupCallSession;
import project.kconnecta.user.backend.feature.chat.repository.CallSessionRepository;
import project.kconnecta.user.backend.feature.chat.repository.CallSignalEventRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationMemberRepository;
import project.kconnecta.user.backend.feature.chat.repository.ChatConversationRepository;
import project.kconnecta.user.backend.feature.chat.repository.GroupCallSessionRepository;
import project.kconnecta.user.backend.feature.chat.service.ChatService;
import project.kconnecta.user.backend.feature.chat.service.impl.ChatServiceImpl;
import project.kconnecta.user.backend.feature.user.entity.User;
import project.kconnecta.user.backend.feature.user.repository.UserRepository;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private static final String MEDIA_TYPE_AUDIO = "audio";
    private static final String MEDIA_TYPE_VIDEO = "video";

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final CallSessionRepository callSessionRepository;
    private final CallSignalEventRepository callSignalEventRepository;
    private final GroupCallSessionRepository groupCallSessionRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatConversationMemberRepository chatConversationMemberRepository;

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(PrivateMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.sendPrivateMessage(principal.getName(), request);
    }

    @MessageMapping("/chat.group")
    public void sendGroupMessage(GroupMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.sendGroupMessage(principal.getName(), request);
    }

    @MessageMapping("/chat.delivered")
    public void markDelivered(MessageDeliveredRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.markMessageDelivered(principal.getName(), request.getMessageId());
    }

    @MessageMapping("/chat.seen")
    public void markSeen(ConversationSeenRequest request, Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Unauthenticated WebSocket session");
        }
        chatService.markConversationSeen(principal.getName(), request.getPeerUserId());
    }

    @MessageMapping("/call.signal")
    @Transactional
    public void sendCallSignal(CallSignalRequest request, Principal principal) {
        try {
            if (principal == null) {
                throw new ForbiddenException("Unauthenticated WebSocket session");
            }
            if (request == null) {
                throw new BadRequestException("Invalid call signal request");
            }
            if (request.getCallId() == null || request.getType() == null || request.getType().isBlank()) {
                throw new BadRequestException("Call ID and type are required");
            }
            if (request.getReceiverId() == null) {
                throw new BadRequestException("Receiver ID is required");
            }
            User sender = userRepository.findByUsername(principal.getName())
                    .orElseThrow(() -> new ForbiddenException("Sender not found"));
            User receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new BadRequestException("Receiver not found"));
            if (request.getConversationId() != null
                    && !chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(
                    request.getConversationId(),
                    receiver.getId()
            )) {
                throw new ForbiddenException("Receiver is not a member of this conversation");
            }

            LocalDateTime now = LocalDateTime.now();
            CallSession session = request.getConversationId() == null
                    ? persistCallData(request, sender, receiver, now)
                    : null;
            GroupCallSession groupSession = request.getConversationId() != null
                    ? persistGroupCallData(request, sender, now)
                    : null;
            CallSessionSnapshotResponse snapshot = session != null
                    ? ChatServiceImpl.toSnapshot(session, now)
                    : groupSession != null
                    ? toGroupSnapshot(groupSession, now)
                    : new CallSessionSnapshotResponse(request.getCallId(), null, null, null, null, null, null);
            CallSignalResponse response = new CallSignalResponse(
                    request.getCallId(),
                    sender.getId(),
                    receiver.getId(),
                    request.getConversationId(),
                    request.getConversationName(),
                    request.getConversationAvatarUrl(),
                    displayName(sender),
                    request.getType(),
                    normalizeMediaType(request.getMediaType()),
                    request.getSdp(),
                    request.getCandidate(),
                    request.getSdpMid(),
                    request.getSdpMLineIndex(),
                    enrichGroupParticipants(request.getGroupParticipants(), sender, receiver),
                    request.getParticipantUserId(),
                    request.getParticipantStatus(),
                    request.getParticipantMicEnabled(),
                    request.getParticipantCameraEnabled(),
                    now,
                    snapshot.getStatus(),
                    snapshot.getMediaType(),
                    snapshot.getStartedAt(),
                    snapshot.getAnsweredAt(),
                    snapshot.getEndedAt(),
                    snapshot.getDurationSec()
            );

            messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/call", response);
            messagingTemplate.convertAndSendToUser(sender.getUsername(), "/queue/call", response);
        } catch (Exception ex) {
            sendCallSignalError(principal, request, ex);
        }
    }

    private List<CallParticipantInfo> enrichGroupParticipants(List<CallParticipantInfo> participants, User sender, User receiver) {
        if (participants == null || participants.isEmpty()) {
            if (sender == null || receiver == null) {
                return participants;
            }
            return List.of(toParticipantInfo(sender), toParticipantInfo(receiver));
        }

        Map<UUID, CallParticipantInfo> byId = new LinkedHashMap<>();
        for (CallParticipantInfo participant : participants) {
            if (participant != null && participant.getUserId() != null) {
                byId.put(participant.getUserId(), participant);
            }
        }
        if (sender != null) {
            byId.putIfAbsent(sender.getId(), toParticipantInfo(sender));
        }

        List<User> users = userRepository.findAllById(byId.keySet());
        Map<UUID, User> usersById = new LinkedHashMap<>();
        for (User user : users) {
            usersById.put(user.getId(), user);
        }

        List<CallParticipantInfo> enriched = new ArrayList<>();
        for (Map.Entry<UUID, CallParticipantInfo> entry : byId.entrySet()) {
            User user = usersById.get(entry.getKey());
            if (user != null) {
                enriched.add(toParticipantInfo(user));
                continue;
            }
            CallParticipantInfo original = entry.getValue();
            enriched.add(new CallParticipantInfo(
                    original.getUserId(),
                    original.getName(),
                    original.getAvatar()
            ));
        }
        return enriched;
    }

    private CallParticipantInfo toParticipantInfo(User user) {
        return new CallParticipantInfo(user.getId(), displayName(user), user.getAvatarUrl());
    }

    private String displayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private CallSession persistCallData(CallSignalRequest request, User sender, User receiver, LocalDateTime now) {
        UUID callId = request.getCallId();
        String type = request.getType();
        if (callId == null || type == null) {
            return null;
        }

        CallSession session = callSessionRepository.findByCallId(callId)
                .orElseGet(() -> CallSession.builder()
                        .callId(callId)
                        .caller(inferCaller(type, sender, receiver))
                        .callee(inferCallee(type, sender, receiver))
                        .startedAt(now)
                        .status("RINGING")
                        .lastSignalType(type)
                        .callMediaType(MEDIA_TYPE_AUDIO)
                        .build());

        if (session.getCaller() == null || session.getCallee() == null) {
            session.setCaller(inferCaller(type, sender, receiver));
            session.setCallee(inferCallee(type, sender, receiver));
        }
        if (session.getStartedAt() == null) {
            session.setStartedAt(now);
        }
        if (session.getCallMediaType() == null || session.getCallMediaType().isBlank()) {
            session.setCallMediaType(MEDIA_TYPE_AUDIO);
        }

        String mediaTypeFromSignal = resolveMediaType(request.getMediaType(), request.getSdp());
        if (MEDIA_TYPE_VIDEO.equals(mediaTypeFromSignal)) {
            session.setCallMediaType(MEDIA_TYPE_VIDEO);
        }

        session.setLastSignalType(type);

        if (isTerminalStatus(session.getStatus()) && !"CALL_END".equals(type)) {
            session = callSessionRepository.save(session);
            persistCallEvent(request, sender, receiver, session, type, now);
            return session;
        }

        switch (type) {
            case "CALL_INVITE" -> {
                session.setCaller(sender);
                session.setCallee(receiver);
                session.setStatus("RINGING");
            }
            case "CALL_ACCEPT" -> {
                if (session.getAnsweredAt() == null) {
                    session.setAnsweredAt(now);
                }
                session.setStatus("ONGOING");
            }
            case "CALL_REJECT", "CALL_CANCEL" -> {
                session.setEndedAt(now);
                if (session.getAnsweredAt() != null) {
                    session.setDurationSec(resolveFinalDurationSec(request, session.getAnsweredAt(), now));
                    session.setStatus("COMPLETED");
                } else {
                    session.setStatus("MISSED");
                }
            }
            case "CALL_END" -> {
                session.setEndedAt(now);
                if (session.getAnsweredAt() != null) {
                    session.setDurationSec(resolveFinalDurationSec(request, session.getAnsweredAt(), now));
                    session.setStatus("COMPLETED");
                } else {
                    session.setStatus("MISSED");
                }
            }
            default -> {
                // keep status for other signaling types
            }
        }

        session = callSessionRepository.save(session);
        persistCallEvent(request, sender, receiver, session, type, now);

        if (("CALL_END".equals(type) || "CALL_REJECT".equals(type) || "CALL_CANCEL".equals(type))
                && !Boolean.TRUE.equals(session.getCallLogSent())) {
            String callLogContent = buildCallLogContent(session);
            if (callLogContent != null) {
                chatService.sendSystemMessage(session.getCaller().getId(), session.getCallee().getId(), callLogContent);
                session.setCallLogSent(true);
                callSessionRepository.save(session);
            }
        }
        return session;
    }

    private GroupCallSession persistGroupCallData(CallSignalRequest request, User sender, LocalDateTime now) {
        UUID callId = request.getCallId();
        String type = request.getType();
        if (callId == null || type == null) {
            return null;
        }

        GroupCallSession session = groupCallSessionRepository.findByCallIdForUpdate(callId).orElse(null);
        if (session == null) {
            if (!"CALL_INVITE".equals(type) || request.getConversationId() == null) {
                return null;
            }
            ChatConversation conversation = chatConversationRepository.findByIdPlain(request.getConversationId())
                    .orElseThrow(() -> new BadRequestException("Conversation not found"));
            if (!chatConversationMemberRepository.existsApprovedByConversationIdAndUserId(conversation.getId(), sender.getId())) {
                throw new ForbiddenException("Forbidden");
            }
            session = GroupCallSession.builder()
                    .callId(callId)
                    .conversation(conversation)
                    .caller(sender)
                    .startedAt(now)
                    .status("RINGING")
                    .lastSignalType("CALL_INVITE")
                    .callMediaType(MEDIA_TYPE_AUDIO)
                    .build();
        }

        String mediaTypeFromSignal = resolveMediaType(request.getMediaType(), request.getSdp());
        if (MEDIA_TYPE_VIDEO.equals(mediaTypeFromSignal)) {
            session.setCallMediaType(MEDIA_TYPE_VIDEO);
        }
        session.setLastSignalType(type);

        if (isTerminalStatus(session.getStatus()) && !"CALL_END".equals(type)) {
            return groupCallSessionRepository.save(session);
        }

        switch (type) {
            case "CALL_ACCEPT" -> {
                if (session.getAnsweredAt() == null) {
                    session.setAnsweredAt(now);
                }
                session.setStatus("ONGOING");
            }
            case "CALL_CANCEL" -> {
                boolean isParticipantTimeoutCancel = request.getParticipantUserId() != null
                        && request.getReceiverId() != null
                        && request.getParticipantUserId().equals(request.getReceiverId())
                        && session.getAnsweredAt() != null;
                if (!isParticipantTimeoutCancel
                        && session.getCaller() != null
                        && session.getCaller().getId().equals(sender.getId())) {
                    session.setEndedAt(now);
                    session.setStatus(session.getAnsweredAt() == null ? "MISSED" : "COMPLETED");
                    if (session.getAnsweredAt() != null) {
                        session.setDurationSec(resolveFinalDurationSec(request, session.getAnsweredAt(), now));
                    }
                }
            }
            case "CALL_END" -> {
                if (session.getCaller() == null || session.getCaller().getId().equals(sender.getId())) {
                    session.setEndedAt(now);
                    if (session.getAnsweredAt() != null) {
                        session.setDurationSec(resolveFinalDurationSec(request, session.getAnsweredAt(), now));
                        session.setStatus("COMPLETED");
                    } else {
                        session.setStatus("MISSED");
                    }
                }
            }
            default -> {
                // keep status for invites, offers, answers, ice, and member rejects
            }
        }

        session = groupCallSessionRepository.save(session);

        if (("CALL_END".equals(type) || "CALL_CANCEL".equals(type))
                && isTerminalStatus(session.getStatus())
                && !Boolean.TRUE.equals(session.getCallLogSent())) {
            String callLogContent = buildGroupCallLogContent(session);
            if (callLogContent != null) {
                chatService.sendGroupSystemMessage(
                        session.getCaller().getId(),
                        session.getConversation().getId(),
                        callLogContent
                );
                session.setCallLogSent(true);
                session = groupCallSessionRepository.save(session);
            }
        }

        return session;
    }

    private int resolveFinalDurationSec(CallSignalRequest request, LocalDateTime answeredAt, LocalDateTime endedAt) {
        if (request.getDurationSec() != null) {
            return Math.max(0, request.getDurationSec());
        }
        return calculateDurationSec(answeredAt, endedAt);
    }

    private int calculateDurationSec(LocalDateTime startedAt, LocalDateTime endedAt) {
        if (startedAt == null || endedAt == null) {
            return 0;
        }
        int durationSec = (int) ChronoUnit.SECONDS.between(startedAt, endedAt);
        return Math.max(durationSec, 0);
    }

    private CallSessionSnapshotResponse toGroupSnapshot(GroupCallSession session, LocalDateTime now) {
        Integer durationSec = session.getDurationSec();
        if ("ONGOING".equals(session.getStatus()) && session.getAnsweredAt() != null && durationSec == null) {
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

    private void persistCallEvent(CallSignalRequest request, User sender, User receiver, CallSession session, String type, LocalDateTime now) {
        CallSignalEvent event = CallSignalEvent.builder()
                .callSession(session)
                .fromUser(sender)
                .toUser(receiver)
                .signalType(type)
                .sdp(request.getSdp())
                .candidate(request.getCandidate())
                .sdpMid(request.getSdpMid())
                .sdpMLineIndex(request.getSdpMLineIndex())
                .createdAt(now)
                .build();
        callSignalEventRepository.save(event);
    }

    private boolean isTerminalStatus(String status) {
        return "COMPLETED".equals(status) || "MISSED".equals(status);
    }

    private User inferCaller(String type, User sender, User receiver) {
        return switch (type) {
            case "CALL_ACCEPT", "CALL_REJECT", "CALL_ANSWER" -> receiver;
            default -> sender;
        };
    }

    private User inferCallee(String type, User sender, User receiver) {
        return switch (type) {
            case "CALL_ACCEPT", "CALL_REJECT", "CALL_ANSWER" -> sender;
            default -> receiver;
        };
    }

    private String inferMediaTypeFromSdp(String sdp) {
        if (sdp == null || sdp.isBlank()) {
            return MEDIA_TYPE_AUDIO;
        }
        return sdp.toLowerCase().contains("m=video") ? MEDIA_TYPE_VIDEO : MEDIA_TYPE_AUDIO;
    }

    private String normalizeMediaType(String mediaType) {
        if (MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType)) {
            return MEDIA_TYPE_VIDEO;
        }
        return MEDIA_TYPE_AUDIO;
    }

    private String resolveMediaType(String mediaType, String sdp) {
        if (MEDIA_TYPE_VIDEO.equalsIgnoreCase(mediaType)) {
            return MEDIA_TYPE_VIDEO;
        }
        return inferMediaTypeFromSdp(sdp);
    }

    private String buildCallLogContent(CallSession session) {
        String mediaType = MEDIA_TYPE_VIDEO.equalsIgnoreCase(session.getCallMediaType())
                ? MEDIA_TYPE_VIDEO
                : MEDIA_TYPE_AUDIO;

        if ("COMPLETED".equals(session.getStatus())) {
            int durationSec = session.getDurationSec() == null ? 0 : session.getDurationSec();
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "Cu\u1ed9c g\u1ecdi video ho\u00e0n th\u00e0nh"
                    : "Cu\u1ed9c g\u1ecdi tho\u1ea1i ho\u00e0n th\u00e0nh";
            return "__CALL_LOG__:{\"kind\":\"completed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\",\"durationSec\":"
                    + durationSec
                    + "}";
        }

        if ("MISSED".equals(session.getStatus())) {
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi video"
                    : "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi tho\u1ea1i";
            return "__CALL_LOG__:{\"kind\":\"missed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\"}";
        }

        return null;
    }

    private String buildGroupCallLogContent(GroupCallSession session) {
        String mediaType = MEDIA_TYPE_VIDEO.equalsIgnoreCase(session.getCallMediaType())
                ? MEDIA_TYPE_VIDEO
                : MEDIA_TYPE_AUDIO;

        if ("COMPLETED".equals(session.getStatus())) {
            int durationSec = session.getDurationSec() == null ? 0 : session.getDurationSec();
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "Cu\u1ed9c g\u1ecdi video nh\u00f3m ho\u00e0n th\u00e0nh"
                    : "Cu\u1ed9c g\u1ecdi tho\u1ea1i nh\u00f3m ho\u00e0n th\u00e0nh";
            return "__CALL_LOG__:{\"kind\":\"completed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\",\"durationSec\":"
                    + durationSec
                    + ",\"group\":true}";
        }

        if ("MISSED".equals(session.getStatus())) {
            String label = MEDIA_TYPE_VIDEO.equals(mediaType)
                    ? "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi video nh\u00f3m"
                    : "\u0110\u00e3 b\u1ecf l\u1ee1 cu\u1ed9c g\u1ecdi tho\u1ea1i nh\u00f3m";
            return "__CALL_LOG__:{\"kind\":\"missed\",\"mediaType\":\""
                    + mediaType
                    + "\",\"label\":\""
                    + label
                    + "\",\"group\":true}";
        }

        return null;
    }

    @MessageExceptionHandler(ChatValidationException.class)
    public void handleChatValidationError(ChatValidationException ex, Principal principal) {
        if (principal == null) return;
        ChatErrorMessage error = new ChatErrorMessage(
                ex.getCode(),
                ex.getMessage(),
                ex.getRetryAfterSeconds(),
                ex.getConversationId(),
                ex.getMessageClientId()
        );
        messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/chat-errors", error);
    }

    @MessageExceptionHandler
    public void handleSocketError(Exception ex, Principal principal) {
        sendCallSignalError(principal, null, ex);
    }

    private void sendCallSignalError(Principal principal, CallSignalRequest request, Exception ex) {
        String senderUsername = principal == null ? null : principal.getName();
        if (senderUsername != null && !senderUsername.isBlank()) {
            messagingTemplate.convertAndSendToUser(senderUsername, "/queue/call-errors", buildCallErrorPayload(request, ex));
        }

        if (request == null || request.getReceiverId() == null) {
            return;
        }
        User receiver = userRepository.findById(request.getReceiverId()).orElse(null);
        if (receiver == null) {
            return;
        }
        if (senderUsername != null && senderUsername.equals(receiver.getUsername())) {
            return;
        }
        messagingTemplate.convertAndSendToUser(receiver.getUsername(), "/queue/call-errors", buildCallErrorPayload(request, ex));
    }

    private Map<String, Object> buildCallErrorPayload(CallSignalRequest request, Exception ex) {
        String message = ex == null || ex.getMessage() == null || ex.getMessage().isBlank()
                ? "Unknown call signaling error"
                : ex.getMessage();
        Map<String, Object> payload = new HashMap<>();
        payload.put("code", "CALL_SIGNAL_ERROR");
        payload.put("message", message);
        payload.put("callId", request == null ? null : request.getCallId());
        payload.put("type", request == null ? null : request.getType());
        payload.put("conversationId", request == null ? null : request.getConversationId());
        payload.put("occurredAt", LocalDateTime.now());
        return payload;
    }
}

